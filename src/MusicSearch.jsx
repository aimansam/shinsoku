import { useState } from 'react';
import { PRESETS, QUICK_SEARCHES, fmtDuration, keyOf, parseYouTube, searchYouTube, thumb } from './media';

// Search box + results. Click a result to play it (the rest of the results become the queue); "+" adds it to the queue.
// The shortcut chips stay visible the whole time, so you can always jump to something else.
export default function MusicSearch({ yt, compact = false }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('video'); // 'video' | 'playlist'
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (text = q, as = kind) => {
    const link = parseYouTube(text);
    if (link) {
      yt.playNow({ id: link.id, list: link.id ? null : link.list, title: link.id ? 'YouTube video' : 'YouTube playlist', channel: '' });
      setQ('');
      return;
    }
    if (!text.trim()) return;
    setQ(text);
    setBusy(true);
    setError('');
    try {
      const found = await searchYouTube(text, yt.apiKey, as);
      setResults(found);
      if (!found.length) setError('No results. Try other words.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const switchKind = (next) => {
    setKind(next);
    setResults(null);
    setError('');
    if (q.trim() && !parseYouTube(q)) run(q, next);
  };

  return (
    <div className="msearch">
      <div className="kinds" role="group" aria-label="Search for">
        <button className={kind === 'video' ? 'on' : ''} onClick={() => switchKind('video')}>Songs</button>
        <button className={kind === 'playlist' ? 'on' : ''} onClick={() => switchKind('playlist')}>Playlists</button>
      </div>
      <form className="msearch-bar" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder={kind === 'video' ? 'Search songs, or paste a link' : 'Search playlists, or paste a link'} aria-label="Search YouTube or paste a link" />
        <button type="submit" className="gbtn" disabled={busy}>{busy ? '…' : 'Search'}</button>
      </form>
      <div className="chips">
        {!compact && PRESETS.map((p) => (
          <button key={p.id} className="chip" onClick={() => yt.playNow(p)}>▶ {p.label}</button>
        ))}
        {QUICK_SEARCHES.slice(0, compact ? 3 : 6).map((s) => (
          <button key={s} className="chip alt" onClick={() => run(s)}>🔍 {s}</button>
        ))}
      </div>
      {error && <small className="msearch-err">{error}</small>}
      {results && results.length > 0 && (
        <>
          <ul className="results">
            {results.map((r, i) => (
              <li key={keyOf(r)}>
                <button className="res-main" onClick={() => yt.play(results, i)} title={r.list ? 'Play this playlist' : 'Play this (the results after it become the queue)'}>
                  <img src={r.thumb || thumb(r.id)} alt="" loading="lazy" />
                  <span>
                    <b>{r.title}</b>
                    <small>
                      {r.list ? `Playlist${r.count > 0 ? ` · ${r.count} videos` : ''}` : r.duration != null ? fmtDuration(r.duration) : ''}
                      {r.channel ? ` · ${r.channel}` : ''}
                    </small>
                  </span>
                </button>
                <button className="res-add" onClick={() => yt.add(r)} title="Add to queue" aria-label={`Add ${r.title} to queue`}>+</button>
              </li>
            ))}
          </ul>
          <button className="more" onClick={() => setResults(null)}>✕ Clear results</button>
        </>
      )}
    </div>
  );
}
