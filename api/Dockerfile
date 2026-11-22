# yt-dlp needs a JavaScript runtime to read YouTube's pages, so start from Node and add Python.
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /venv
ENV PATH="/venv/bin:$PATH" PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir -U "yt-dlp[default]"
WORKDIR /app
COPY server.py .
EXPOSE 8000
# Pull the newest yt-dlp on every start (YouTube changes often); keep going with the installed one if offline.
CMD ["sh", "-c", "pip install -q -U 'yt-dlp[default]' || true; exec python server.py"]
HEALTHCHECK --interval=60s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)" || exit 1
