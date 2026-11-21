# Shinsoku (神速)

An intense, anime-flavoured focus app for **any** task: study, work, coding, gaming, reading, creating.
Pick a mode, start a session, and your power form climbs the longer you stay in flow, while the music,
visuals and a cheeky mascot (Soku-chan) get louder, faster and more chaotic with you.

> **Photosensitivity warning:** the visuals flash, shake and glitch in time with the beat, and the popups are
> deliberately chaotic. Set *Visual intensity* to **Chill** on the menu if that is a problem. The app also tones
> down motion if your system asks for reduced motion.

## Features

- **Power forms:** BASE FORM → AWAKENED → SUPER → ULTRA → LIMIT BREAK as your uninterrupted flow time grows (5 / 15 / 30 / 60 min).
- **Procedural beat music** synthesised with WebAudio (no audio files). Five styles, drums from the first second, more layers per form.
- **Audio-reactive WebGL background:** tunnel, kaleidoscope, speed lines, glitch rows, screen shake. 2D canvas fallback.
- **Soku-chan**, an original SVG mascot with a dozen moods who dances to the beat, trolls you, and flies in for cut-ins.
- **Popups, a lot of them:** floating numbers, stickers, achievements, fake notifications and error windows, fake live chat, emoji rain, warning tape.
- **Modes:** Study, Deep Work, Gaming, Creative, Reading, Custom (they only set defaults, none changes how the app behaves).
- **Score, XP and levels**, daily streak, parking-lot for distracting thoughts, objectives checklist.
- **Leaving the tab does nothing.** There is no tab-leave detection or penalty, by design.

## Run it

```bash
docker compose up -d --build
# open http://localhost:8899
```

Or for development:

```bash
npm install
npm run dev
```

Tip: open `/?speed=60` to run the clock 60x faster when testing.

## Keyboard shortcuts (during a session)

| Key | Action |
|---|---|
| `Space` | Pause / resume (costs one form; disabled in Hard mode) |
| `B` | "I broke focus": log a miss (drops one form) |
| `P` | Park a distracting thought |
| `M` | Mute |
| `F` | Fullscreen |

## Stack

React 18, Vite, Mantine 7, WebGL, WebAudio. All progress is stored in your browser's `localStorage`.

## License

No license yet.
