# Chord Trainer

Browser-based guitar chord transition trainer built with native ES modules and Web Audio.

## What it does

- Lets you build a training pool from the `chords-db` guitar dataset
- Previews chord voicings with a fretboard diagram before you add them
- Plays synthesized chord voicings derived from real fret positions
- Supports focus mode for alternating one target chord with the rest of the pool
- Supports gradual speed-up across a session

## Project structure

- `index.html`: app shell
- `style.css`: layout and UI styling
- `js/`: application logic
- `vendor/chords-db/`: chord dataset submodule

## Requirements

- A static HTTP host that serves ES modules and JSON correctly
- The `vendor/chords-db` submodule initialized in your checkout

## Setup

```bash
git submodule update --init
```

## Hosting

This app is intended to be served as static files. Any standard static host is fine as long as:

- `index.html` is served over `http://` or `https://`
- `.js` files are served with a JavaScript MIME type
- `vendor/chords-db/lib/guitar.json` is reachable by the browser

Examples:

- GitHub Pages
- Netlify
- Vercel static hosting
- Nginx / Apache
- Any CDN or object storage static website hosting

`file://` is not supported because the app loads ES modules and fetches JSON.

## Development notes

- The repo includes `vendor/chords-db` as a git submodule.
- Chord synthesis is generated from fret positions rather than hardcoded note tables.
- Mobile uses separate `Pick` and `Play` tabs; desktop uses a two-pane app layout.
