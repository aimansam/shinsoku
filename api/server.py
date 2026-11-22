"""Shinsoku music helper.

Plays YouTube songs whose owners block YouTube's embedded player (common for official label music):
yt-dlp looks up the song's audio stream and this server relays it to the app, which plays it in a plain <audio> element.

  GET /api/health                 -> {"ok": true, "ytdlp": "<version>"}
  GET /api/playlist?list=<id>     -> {"title": ..., "items": [{"id", "title", "duration"}]}
  GET /api/audio?id=<video id>    -> the audio itself (supports Range, so seeking works)
  GET /api/warm?id=<video id>     -> 204; looks the song up ahead of time (and waits out YouTube's start delay) so the next track starts instantly

Only the standard library plus yt-dlp. Optional: put a Netscape-format cookies file at /data/cookies.txt
if YouTube starts asking this server to "confirm you're not a bot".
"""

import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import yt_dlp

VIDEO_ID = re.compile(r"^[\w-]{11}$")
LIST_ID = re.compile(r"^[\w-]{10,64}$")
COOKIES = "/data/cookies.txt"
CHUNK = 4 * 1024 * 1024  # YouTube throttles long single requests, so fetch the stream in pieces
PLAYLIST_TTL = 30 * 60

_streams = {}  # video id -> (url, headers, mime, expires_at, available_at)
_playlists = {}  # list id -> (data, expires_at)
_locks = {}
_locks_guard = threading.Lock()


def log(*parts):
    print(time.strftime("%H:%M:%S"), *parts, file=sys.stderr, flush=True)


def lock_for(key):
    with _locks_guard:
        return _locks.setdefault(key, threading.Lock())


def ydl_opts(**extra):
    opts = {"quiet": True, "no_warnings": True, "skip_download": True, "js_runtimes": {"node": {}}}
    if os.path.exists(COOKIES):
        opts["cookiefile"] = COOKIES
    opts.update(extra)
    return opts


def resolve(video_id, fresh=False):
    """Audio stream URL for a video, cached until shortly before YouTube's link expires."""
    with lock_for(video_id):
        hit = _streams.get(video_id)
        if hit and not fresh and hit[3] > time.time():
            return hit
        started = time.time()
        with yt_dlp.YoutubeDL(ydl_opts(format="bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best")) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
        fmt = info.get("requested_formats", [info])[0] if info.get("requested_formats") else info
        url = fmt["url"]
        expire = parse_qs(urlparse(url).query).get("expire", [None])[0]
        expires_at = (int(expire) - 600) if expire else time.time() + 3 * 3600
        ext = fmt.get("ext") or "m4a"
        mime = {"m4a": "audio/mp4", "mp4": "audio/mp4", "webm": "audio/webm"}.get(ext, "audio/mp4")
        # YouTube now hands out stream links that only start working a few seconds later ("available_at").
        hit = (url, fmt.get("http_headers") or {}, mime, expires_at, fmt.get("available_at") or info.get("available_at") or 0)
        _streams[video_id] = hit
        log("resolved", video_id, ext, f"{time.time() - started:.1f}s")
        return hit


def playlist(list_id):
    hit = _playlists.get(list_id)
    if hit and hit[1] > time.time():
        return hit[0]
    with yt_dlp.YoutubeDL(ydl_opts(extract_flat="in_playlist")) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/playlist?list={list_id}", download=False)
    items = [
        {"id": e["id"], "title": e.get("title") or "", "duration": e.get("duration")}
        for e in info.get("entries") or []
        if e and VIDEO_ID.match(e.get("id") or "") and e.get("title") not in ("[Private video]", "[Deleted video]")
    ]
    data = {"title": info.get("title") or "", "items": items}
    _playlists[list_id] = (data, time.time() + PLAYLIST_TTL)
    log("playlist", list_id, len(items), "items")
    return data


def upstream(url, headers, start, end):
    req = urllib.request.Request(url, headers={**headers, "Range": f"bytes={start}-{end}"})
    return urllib.request.urlopen(req, timeout=20)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # keep docker logs readable: only our own log() lines
        pass

    def send_json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        try:
            if u.path == "/api/health":
                return self.send_json(200, {"ok": True, "ytdlp": yt_dlp.version.__version__})
            if u.path == "/api/playlist":
                if not LIST_ID.match(q.get("list", "")):
                    return self.send_json(400, {"error": "bad playlist id"})
                return self.send_json(200, playlist(q["list"]))
            if u.path == "/api/warm":
                if not VIDEO_ID.match(q.get("id", "")):
                    return self.send_json(400, {"error": "bad video id"})
                available_at = resolve(q["id"])[4]
                if available_at > time.time():
                    time.sleep(min(15, available_at - time.time() + 0.2))
                self.send_response(204)
                self.send_header("Content-Length", "0")
                return self.end_headers()
            if u.path == "/api/audio":
                if not VIDEO_ID.match(q.get("id", "")):
                    return self.send_json(400, {"error": "bad video id"})
                return self.audio(q["id"])
            return self.send_json(404, {"error": "not found"})
        except (BrokenPipeError, ConnectionResetError):
            pass  # the browser stopped listening (skipped or seeked): nothing to do
        except yt_dlp.utils.DownloadError as e:
            log("yt-dlp error", u.path, q, str(e)[:300])
            self.safe_json(502, {"error": str(e)[:300]})
        except Exception as e:  # noqa: BLE001 - report anything else to the app instead of hanging
            log("error", u.path, q, repr(e)[:300])
            self.safe_json(500, {"error": repr(e)[:300]})

    def safe_json(self, code, data):
        try:
            self.send_json(code, data)
        except Exception:  # noqa: BLE001 - headers may already be sent
            pass

    def audio(self, video_id):
        m = re.match(r"bytes=(\d+)-(\d*)", self.headers.get("Range", ""))
        start = int(m.group(1)) if m else 0
        want_end = int(m.group(2)) if m and m.group(2) else None

        # First piece: also tells us the total size. A stale link (403) gets looked up again once.
        for attempt in (0, 1):
            url, headers, mime, _, available_at = resolve(video_id, fresh=attempt == 1)
            if available_at > time.time():
                time.sleep(min(15, available_at - time.time() + 0.2))
            first_end = start + CHUNK - 1 if want_end is None else min(want_end, start + CHUNK - 1)
            try:
                res = upstream(url, headers, start, first_end)
                break
            except urllib.error.HTTPError as e:
                if e.code == 416:
                    self.send_response(416)
                    self.send_header("Content-Length", "0")
                    return self.end_headers()
                if attempt == 1:
                    raise
                log("stream link refused, looking it up again", video_id, e.code)
        total = int(res.headers.get("Content-Range", "/0").split("/")[-1] or 0)
        end = min(want_end if want_end is not None else total - 1, total - 1)

        self.send_response(206 if m else 200)
        self.send_header("Content-Type", mime)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if m:
            self.send_header("Content-Range", f"bytes {start}-{end}/{total}")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        pos = start
        while True:
            while True:
                buf = res.read(64 * 1024)
                if not buf:
                    break
                self.wfile.write(buf)
                pos += len(buf)
            res.close()
            if pos > end:
                return
            res = upstream(url, headers, pos, min(end, pos + CHUNK - 1))


def updater():
    """Once a day pull the newest yt-dlp (YouTube changes often); restart to load it (Docker brings us back)."""
    while True:
        time.sleep(24 * 3600)
        before = yt_dlp.version.__version__
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "yt-dlp[default]"], check=True, timeout=600)
            after = subprocess.run([sys.executable, "-m", "yt_dlp", "--version"], capture_output=True, text=True).stdout.strip()
        except Exception as e:  # noqa: BLE001
            log("update failed", repr(e)[:200])
            continue
        if after and after != before:
            log("yt-dlp updated", before, "->", after, "- restarting")
            os._exit(0)


if __name__ == "__main__":
    threading.Thread(target=updater, daemon=True).start()
    log("shinsoku-api on :8000, yt-dlp", yt_dlp.version.__version__, "cookies" if os.path.exists(COOKIES) else "no cookies")
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
