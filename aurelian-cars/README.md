# AURELIAN: cinematic luxury-car website

A static, no-build site. Plain HTML, CSS and JavaScript. GSAP 3 + ScrollTrigger drive the scroll choreography and Lenis gives the smooth scrolling. Everything (libraries, font, placeholder frames) is bundled in this folder, so it runs offline.

Aurelian is a **fictional marque** made as a design demonstration. All figures, names and the address are placeholders.

## Run it on localhost

Use a local server (opening `index.html` by double-click usually works too, but a server is more reliable).

Pick any one:

- **VS Code:** install the "Live Server" extension, right-click `index.html`, choose *Open with Live Server*.
- **Node:** in this folder run `npx serve` and open the address it prints.
- **Python:** in this folder run `python -m http.server 8000`, then open http://localhost:8000

## What is in the page

1. **Hero:** the giant wordmark sits behind a cut-out photo of the Halcyon. The car drives in on load, its wheels really turn (they are separate layers that roll exactly as far as the car travels), and the body dips onto its front wheels as it stops. It rolls on as you scroll. Hover or tap the rings for details.
2. **Intro statement:** words light up as you scroll.
3. **Design:** the section pins and three photographs (form, light line, wheel) change as you scroll, with numbered notes and a gold progress line.
4. **Interior:** a full-width star-ceiling photograph, then the front cabin and rear lounge, revealed on scroll.
5. **Journey:** the section pins and scrolling plays a 120-frame sequence from dawn to night, with a clock, a speed readout and a scene title for each part of the day. The frames are still placeholders until the video is made.
6. **Editions:** a sideways carousel of three editions. "Configure" sends an edition to the configurator.
7. **Atelier:** three short craft statements.
8. **Configurator:** edition, paint (6 colours) and wheel finish (3) recolour the real car photo live.
9. **Booking form:** validation and a confirmation message. It is front end only (see below).

## Swap in real media

The car photographs are real (AI-generated, original design). The journey frames are still **placeholders drawn in code**.

Image folders:

- `images/source/` the original full-size images as generated
- `images/site/` web-sized copies used by the page (design, interior and edition photographs)
- `images/car/` the cut-out hero car, its wheel layers and its paint mask (made by a script, see below)
- `images/reference/` the first round of images. Reference only: they show a real brand's car and logos and must not be used on the site.

### 1. Journey frames (the scroll video)

Make a video (for example with an AI video tool, see below), then turn it into frames:

```bash
# macOS / Linux / Git Bash
tools/extract-frames.sh my-drive.mp4
```

Windows Command Prompt, with ffmpeg installed:

```bat
mkdir frames
ffmpeg -i my-drive.mp4 -vf "fps=12,scale=1600:-2" -c:v libwebp -quality 70 frames\%03d.webp
```

Then open `js/config.js` and set `frames.count` to the number of files created. Tips:

- Use one continuous shot with no cuts, so scrolling feels like one smooth move.
- Around 100 to 160 frames is a good balance. More frames means smoother scrubbing but a heavier page.
- 16:9 works best. On phones the frame is shown at a larger scale and the sky and road are extended automatically.
- The time of day (HUD clock) and the four scene titles are set in `index.html` (`.scene` blocks) and `js/app.js` (`applyJourney`). Edit them to match your video.

### 2. Hero and configurator car

Both use one side-profile photograph (car facing right, plain light-grey background). To replace it:

```bash
python tools/make_car_assets.py images/source/my-side-profile.png
```

This writes the cut-out body, two wheel layers and a paint mask to `images/car/` and prints the wheel positions. Copy those numbers into `car.wheels` in `js/config.js` (and `ratio` from `bodyWidth / bodyHeight`). The script finds the wheels by their bronze colour. For the configurator, outline the side windows for the new photo in `GLASS` at the top of the script so the glass does not take the paint colour. Then move the hotspot rings (`.hs` in `index.html`) to match.

Set `car: null` in `js/config.js` to fall back to the drawn placeholder car.

### 3. Other photographs

The design, interior and edition photos are plain `<img>` tags in `index.html` pointing at `images/site/`. Replace a file with the same name, or change the `src`.

### Making the journey video with AI

Generate 5 to 6 keyframes with an image tool, then animate between neighbouring keyframes with an image-to-video tool, keeping each clip one continuous move. Join the clips, then run the extraction command above. Check each tool's current pricing and availability in your country first.

## Edit content

- **Text and sections:** `index.html`
- **Colours and spacing:** the `:root` variables at the top of `css/style.css`
- **Editions and specs:** the `data-*` attributes on each `.model` in `index.html`
- **Paint colours and wheel finishes:** `PAINTS` and `WHEELS` in `js/car.js` (each paint has a `tint` and optional `shade` laid over the photo)
- **Journey settings (frames, clock range, top speed):** `js/config.js`

## Connect the booking form

The form validates and shows a confirmation but sends nothing. In `js/app.js`, find `initForm` and replace the `TODO` with a request to your backend or a form service, for example:

```js
fetch('/api/viewing', { method: 'POST', body: new FormData(form) });
```

## Accessibility and performance notes

- Respects `prefers-reduced-motion`: no smooth scrolling, no pinned scrubbing, the journey becomes a still image with the four scenes listed below it.
- Keyboard: skip link, visible focus, carousel is focusable, hotspots open with Enter and close with Escape.
- Frames are preloaded behind a loading screen. The canvas resolution is capped for speed.
- Fonts: Archivo (variable, by Omnibus-Type), bundled locally under the SIL Open Font License.

## Folder map

```
index.html          page markup
css/style.css       all styles
js/config.js        settings you are likely to change
js/car.js           paints, wheel finishes, the photographic car and the drawn fallback car
js/app.js           behaviour: preloader, hero, design, photos, journey, carousel, configurator, form
frames/             journey frames (001.webp ...)
images/             source, site, car and reference images (see above)
fonts/              Archivo variable font
vendor/             GSAP, ScrollTrigger, Lenis
tools/              extract-frames.sh, make_car_assets.py (hero cut-out), build_prompts.py (AI prompt pack)
```
