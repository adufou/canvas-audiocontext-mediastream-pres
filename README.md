# Web API Deep Dive

Interactive presentation demos for **Canvas**, **AudioContext**, and **MediaStream** — and how they connect. Built with Vue 3 + Vite.

## Running

```sh
pnpm install
pnpm dev
```

Open `http://localhost:5173` in a browser. For the MediaStream demo, use a Chromium-based browser (Chrome, Edge, Brave) and grant camera/microphone access when prompted.

### Other commands

```sh
pnpm build        # type-check + production build
pnpm preview      # serve the production build locally
```

> Requires Node 20.19+ or 22.12+.

## What's in the repo

```
src/
  views/
    HomeView.vue          # landing page with API overview and connection diagram
    CanvasDemo.vue        # Canvas 2D API demos
    AudioContextDemo.vue  # Web Audio API demos
    MediaStreamDemo.vue   # MediaStream API demos
  components/
    AppNav.vue            # top navigation bar
    DemoStep.vue          # collapsible step layout (demo + code panel side by side)
    CodePanel.vue         # syntax-highlighted code viewer
  router/index.ts         # routes: / /canvas /audiocontext /mediastream
  main.ts
```

## Demo pages

### Canvas (`/canvas`)

Step-by-step walkthrough of the 2D rendering context:

1. **drawImage** — draw an image, canvas, or video element onto the canvas
2. **save / restore** — the context state stack (transforms, styles, clip region)
3. **clip** — mask drawing to a path; wrap in `save`/`restore` to remove the mask
4. **Combined animation** — rotating image clipped to a circle, with and without `save`/`restore` to show what happens when transforms accumulate across frames

### AudioContext (`/audiocontext`)

Building a signal chain with the Web Audio API:

1. **OscillatorNode** — generate sine/square/sawtooth/triangle tones
2. **GainNode** — volume control
3. **BiquadFilterNode** — lowpass / highpass / bandpass filters
4. **AnalyserNode → Canvas** — real-time FFT visualizer drawn each frame

### MediaStream (`/mediastream`)

Connecting streams from multiple sources:

1. **canvas.captureStream()** — turn a canvas animation into a live video track
2. **getUserMedia** — access camera and microphone
3. **createMediaStreamDestination** — route AudioContext output into a MediaStream
4. **Combined** — merge canvas video + audio tracks into one stream and preview it

## How the APIs connect

```
Canvas  ──captureStream()──────────────────────────►  MediaStream
AudioContext  ──createMediaStreamDestination()──────►  MediaStream
AudioContext  ──AnalyserNode data──────────────────►  Canvas  (FFT visualizer)
```
