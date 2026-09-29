# Orca film

A 54-second film about orca, drawn in HTML and JavaScript. Every frame is a function of time, so the page plays live and renders to video the same way. The score is synthesized with Web Audio from the same timeline, so each click, key and page flick lands on its frame.

## Files

- `index.html` plays the film in a browser, with sound. Space pauses, the arrow keys skip two seconds.
- `js/world.js` holds the shared layers: the sea, the surface, the cursor, grain and the scene timing.
- `js/window.js` shows the Obsidian window. It stacks frames of real Obsidian and moves a camera over them.
- `js/desk.js` keeps one window on screen from writing to export, so the camera moves between those scenes without a cut.
- `js/scenes/` holds one file per scene.
- `js/audio.js` holds the score and the sound effects.
- `render.mjs` writes `orca.mp4`, at 1920 × 1080 and 60 fps with two sub-frames of motion blur per frame.
- `stills.mjs` writes single frames to `build/stills/` for review.
- `formats.mjs` writes every format a release carries to `dist/`, from `orca.mp4`.
- `fonts/` holds copies of the site's faces, and Faune Display Bold Italic for the name. Faune is by Alice Savoie for the Cnap, under CC BY-ND.
- `assets/ui/` holds the frames of the window, and `assets/pages/` holds the first pages of the PDF the film exports. `npm run film` in obsidian-orca takes both in real Obsidian on the sample book, and neither is kept in this repo. `assets/ui/frames.js` gives the box of each control the film clicks and each row of text it types.
- `ref/` holds the screenshots of the site that set the look.

## Frames

The film plays from frames of real Obsidian, which the film spec in obsidian-orca takes. The spec writes them to the folder that `ORCA_FILM_OUT` names. Take them from a checkout of obsidian-orca beside this one:

```sh
ORCA_FILM_OUT=../orca-film/assets npm run film
```

## Render

The render needs Node, ffmpeg and Playwright's Chromium.

```sh
npm ci
npx playwright install chromium
node render.mjs                      # the whole film to orca.mp4
node render.mjs --from 22 --to 30    # one section
node stills.mjs 4 13.5 26.9          # frames at those times
node formats.mjs                     # every release format to dist/
```

## Release

The film workflow builds the film from nothing. It checks out obsidian-orca at a ref, takes the frames, renders the film, and publishes `dist/` as a release. Start it from the Actions tab and give it the ref. An `orca-release` repository dispatch starts it too, with the ref in `client_payload.ref`.
