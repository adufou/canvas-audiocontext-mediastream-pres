<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DemoStep from '../components/DemoStep.vue'
import CodePanel from '../components/CodePanel.vue'

// ─── SVG source used by steps 1 & 4 ───────────────────────────────────────────

const SVG_SRC = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#7c6af7"/>
        <stop offset="100%" stop-color="#34d399"/>
      </linearGradient>
    </defs>
    <rect width="300" height="200" fill="url(#g)" rx="12"/>
    <circle cx="150" cy="80"  r="40" fill="white" opacity="0.3"/>
    <circle cx="80"  cy="150" r="25" fill="white" opacity="0.2"/>
    <circle cx="220" cy="140" r="30" fill="white" opacity="0.2"/>
    <text x="150" y="175" text-anchor="middle" font-family="sans-serif"
          font-size="18" font-weight="bold" fill="white" opacity="0.9">drawImage</text>
  </svg>
`)}`

// ─── Template refs ─────────────────────────────────────────────────────────────

const c1 = ref<HTMLCanvasElement | null>(null)
const c2 = ref<HTMLCanvasElement | null>(null)
const c3 = ref<HTMLCanvasElement | null>(null)
const c4a = ref<HTMLCanvasElement | null>(null)
const c4b = ref<HTMLCanvasElement | null>(null)

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
}

// ─── Step 1 — drawImage ────────────────────────────────────────────────────────

function demo1DrawImage() {
  const canvas = c1.value
  if (!canvas) return
  clearCanvas(canvas)
  const ctx = canvas.getContext('2d')!
  const img = new Image()
  img.src = SVG_SRC
  img.onload = () => { ctx.drawImage(img, 50, 25, 300, 200) }
}

// ─── Step 2 — save / restore ──────────────────────────────────────────────────

const stackDepth = ref(0)
const colors = ['#7c6af7', '#34d399', '#fbbf24', '#f87171', '#7dd3fc']

function demo2Save() {
  c2.value?.getContext('2d')?.save()
  stackDepth.value++
}

function demo2Restore() {
  if (stackDepth.value > 0) {
    c2.value?.getContext('2d')?.restore()
    stackDepth.value--
  }
}

function demo2Translate() { c2.value?.getContext('2d')?.translate(30, 20) }
function demo2Rotate()    { c2.value?.getContext('2d')?.rotate(Math.PI / 12) }

function demo2DrawRect() {
  const ctx = c2.value?.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = colors[stackDepth.value % colors.length]!
  ctx.fillRect(80, 80, 100, 60)
}

function demo2Clear() {
  clearCanvas(c2.value)
}

// ─── Step 3 — clip ────────────────────────────────────────────────────────────

const saveDepth3 = ref(0)

function demo3Init() {
  const canvas = c3.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1e1b4b'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
  }
  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
  }
}

function demo3Save() {
  c3.value?.getContext('2d')?.save()
  saveDepth3.value++
}

function demo3ShowPath() {
  const ctx = c3.value?.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.arc(200, 150, 120, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

function demo3Clip() {
  const ctx = c3.value?.getContext('2d')
  if (!ctx) return
  ctx.beginPath()
  ctx.arc(200, 150, 120, 0, Math.PI * 2)
  ctx.clip()
}

function demo3FillRect() {
  const ctx = c3.value?.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#7c6af7'
  ctx.fillRect(0, 0, 400, 300)
}

function demo3DrawCircles() {
  const ctx = c3.value?.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#34d399'
  ctx.beginPath()
  ctx.arc(150, 120, 60, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.arc(250, 180, 50, 0, Math.PI * 2)
  ctx.fill()
}

function demo3DrawStripes() {
  const ctx = c3.value?.getContext('2d')
  if (!ctx) return
  const stripeColors = ['#7c6af7', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#7dd3fc']
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = stripeColors[i % stripeColors.length]!
    ctx.fillRect(0, i * 25, 400, 25)
  }
}

function demo3Restore() {
  if (saveDepth3.value === 0) return
  c3.value?.getContext('2d')?.restore()
  saveDepth3.value--
}

function demo3Reset() {
  saveDepth3.value = 0
  clearCanvas(c3.value)
  demo3Init()
}

// ─── Step 4 — combined animation ──────────────────────────────────────────────

const running4a = ref(false)
const running4b = ref(false)
let angle4a = 0
let angle4b = 0
let rafId4a = 0
let rafId4b = 0
const img4 = new Image()
img4.src = SVG_SRC

function demo4ToggleWith() {
  if (running4a.value) {
    cancelAnimationFrame(rafId4a)
    running4a.value = false
  } else {
    angle4a = 0
    running4a.value = true
    demo4FrameWith()
  }
}

function demo4ToggleWithout() {
  if (running4b.value) {
    cancelAnimationFrame(rafId4b)
    running4b.value = false
    const cb = c4b.value
    if (cb) cb.width = cb.width
  } else {
    angle4b = 0
    const cb = c4b.value
    if (cb) cb.width = cb.width
    running4b.value = true
    demo4FrameWithout()
  }
}

function demo4FrameWith() {
  if (!running4a.value) return
  const canvas = c4a.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const r = 120

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(cx, cy)
  ctx.rotate(angle4a)
  ctx.drawImage(img4, -r, -r, r * 2, r * 2)
  ctx.restore()

  ctx.strokeStyle = 'rgba(124,106,247,0.5)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
  ctx.stroke()

  angle4a += 0.012
  rafId4a = requestAnimationFrame(demo4FrameWith)
}

function demo4FrameWithout() {
  if (!running4b.value) return
  const canvas = c4b.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const r = 120

  // No save() — transform and clip accumulate across frames
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(cx, cy)
  ctx.rotate(angle4b)
  ctx.drawImage(img4, -r, -r, r * 2, r * 2)
  // No restore()

  angle4b += 0.012
  rafId4b = requestAnimationFrame(demo4FrameWithout)
}

onMounted(() => { demo3Init() })

onUnmounted(() => {
  cancelAnimationFrame(rafId4a)
  cancelAnimationFrame(rafId4b)
  running4a.value = false
  running4b.value = false
})

// ─── Code panel content ───────────────────────────────────────────────────────

const code1 = `<span class="cm">// drawImage(source, x, y, w, h)</span>
<span class="kw">const</span> ctx = canvas.getContext(<span class="str">'2d'</span>);

<span class="kw">const</span> img = <span class="kw">new</span> <span class="fn">Image</span>();
img.src = <span class="str">'...'</span>;
img.<span class="fn">onload</span> = () => {
  ctx.<span class="fn">drawImage</span>(img, <span class="num">50</span>, <span class="num">25</span>, <span class="num">300</span>, <span class="num">200</span>);
};

<span class="cm">// Also accepts:</span>
<span class="cm">// HTMLCanvasElement</span>
<span class="cm">// HTMLVideoElement ← see MediaStream demo</span>
<span class="cm">// ImageBitmap, OffscreenCanvas</span>`

const code2 = `<span class="cm">// save() pushes current state:</span>
<span class="cm">//  - transform matrix</span>
<span class="cm">//  - clipping region</span>
<span class="cm">//  - strokeStyle, fillStyle...</span>
ctx.<span class="fn">save</span>();        <span class="cm">// depth: 1</span>

ctx.<span class="fn">translate</span>(<span class="num">100</span>, <span class="num">50</span>);
ctx.<span class="fn">rotate</span>(Math.PI / <span class="num">6</span>);
ctx.<span class="fn">fillRect</span>(<span class="num">0</span>, <span class="num">0</span>, <span class="num">80</span>, <span class="num">40</span>);

ctx.<span class="fn">restore</span>();      <span class="cm">// depth: 0</span>

<span class="cm">// Back to original origin —</span>
<span class="cm">// translate + rotate are gone</span>
ctx.<span class="fn">fillRect</span>(<span class="num">200</span>, <span class="num">100</span>, <span class="num">80</span>, <span class="num">40</span>);`

const code3 = `<span class="cm">// Save before clipping</span>
ctx.<span class="fn">save</span>();

<span class="cm">// Define the clip path</span>
ctx.<span class="fn">beginPath</span>();
ctx.<span class="fn">arc</span>(<span class="num">200</span>, <span class="num">150</span>, <span class="num">120</span>, <span class="num">0</span>, Math.PI * <span class="num">2</span>);

<span class="cm">// Subsequent drawing is masked here</span>
ctx.<span class="fn">clip</span>();

ctx.fillStyle = <span class="str">'#7c6af7'</span>;
ctx.<span class="fn">fillRect</span>(<span class="num">0</span>, <span class="num">0</span>, <span class="num">400</span>, <span class="num">300</span>);

<span class="cm">// restore() removes the clip region</span>
ctx.<span class="fn">restore</span>();

<span class="cm">// This now fills the whole canvas</span>
ctx.<span class="fn">fillRect</span>(<span class="num">0</span>, <span class="num">0</span>, <span class="num">400</span>, <span class="num">300</span>);`

const code4 = `<span class="kw">function</span> <span class="fn">draw</span>(img) {
  <span class="kw">const</span> cx = canvas.width / <span class="num">2</span>;
  <span class="kw">const</span> cy = canvas.height / <span class="num">2</span>;
  <span class="kw">const</span> r  = <span class="num">100</span>;

  ctx.<span class="fn">clearRect</span>(<span class="num">0</span>, <span class="num">0</span>, canvas.width, canvas.height);

  <span class="cm">// save() — clip + rotate stay contained</span>
  ctx.<span class="fn">save</span>();

  <span class="cm">// 1. Circular clip path</span>
  ctx.<span class="fn">beginPath</span>();
  ctx.<span class="fn">arc</span>(cx, cy, r, <span class="num">0</span>, Math.PI * <span class="num">2</span>);
  ctx.<span class="fn">clip</span>();

  <span class="cm">// 2. Move to center, apply rotation</span>
  ctx.<span class="fn">translate</span>(cx, cy);
  ctx.<span class="fn">rotate</span>(angle);

  <span class="cm">// 3. Draw image centered on rotated origin</span>
  ctx.<span class="fn">drawImage</span>(img, -r, -r, r * <span class="num">2</span>, r * <span class="num">2</span>);

  <span class="cm">// restore() — clip and transform gone</span>
  ctx.<span class="fn">restore</span>();

  angle += <span class="num">0.012</span>;
  <span class="fn">requestAnimationFrame</span>(() => <span class="fn">draw</span>(img));
}`

const code4Without = `<span class="kw">function</span> <span class="fn">draw</span>(img) {
  <span class="kw">const</span> cx = canvas.width / <span class="num">2</span>;
  <span class="kw">const</span> cy = canvas.height / <span class="num">2</span>;
  <span class="kw">const</span> r  = <span class="num">120</span>;

  ctx.<span class="fn">clearRect</span>(<span class="num">0</span>, <span class="num">0</span>, canvas.width, canvas.height);
  <span class="cm">// ↑ runs in accumulated transform space — misses the canvas</span>

  ctx.<span class="fn">beginPath</span>();
  ctx.<span class="fn">arc</span>(cx, cy, r, <span class="num">0</span>, Math.PI * <span class="num">2</span>);
  ctx.<span class="fn">clip</span>();
  <span class="cm">// ↑ intersects with the previous frame's clip</span>

  ctx.<span class="fn">translate</span>(cx, cy);
  <span class="cm">// ↑ stacks on top of last frame's translate</span>

  ctx.<span class="fn">rotate</span>(angle);
  ctx.<span class="fn">drawImage</span>(img, -r, -r, r * <span class="num">2</span>, r * <span class="num">2</span>);
  <span class="cm">// no restore() — state leaks into the next frame</span>

  angle += <span class="num">0.012</span>;
  <span class="fn">requestAnimationFrame</span>(() => <span class="fn">draw</span>(img));
}`
</script>

<template>
  <div class="page">
    <h1 style="margin-bottom:0.25rem">Canvas API</h1>
    <p style="margin-bottom:2rem">
      The 2D rendering context — drawing images, managing state with a stack, and clipping regions.
    </p>

    <!-- Step 1 — drawImage -->
    <DemoStep :number="1" title="drawImage">
      <p class="step-desc">
        <code class="text-mono">ctx.drawImage()</code> accepts an
        <code class="text-mono">HTMLImageElement</code>,
        <code class="text-mono">HTMLCanvasElement</code>, or
        <code class="text-mono">HTMLVideoElement</code> (which we'll use in the MediaStream demo).
      </p>
      <canvas ref="c1" width="400" height="250"></canvas>
      <div class="btn-row">
        <button class="btn btn-primary" @click="demo1DrawImage">Draw image</button>
        <button class="btn" @click="clearCanvas(c1)">Clear</button>
      </div>

      <template #code>
        <CodePanel title="drawImage" :code="code1" />
      </template>
    </DemoStep>

    <!-- Step 2 — save / restore -->
    <DemoStep :number="2" title="save / restore — the state stack">
      <p class="step-desc">
        <code class="text-mono">ctx.save()</code> pushes the current state (transforms, styles, clip) onto a stack.
        <code class="text-mono">ctx.restore()</code> pops it. Transforms applied inside a save/restore block don't leak out.
      </p>
      <canvas ref="c2" width="400" height="250"></canvas>
      <div class="stack-counter mt-1">Stack depth: <span>{{ stackDepth }}</span></div>
      <div class="btn-row">
        <button class="btn btn-green"  @click="demo2Save">save()</button>
        <button class="btn btn-danger" @click="demo2Restore">restore()</button>
        <button class="btn" @click="demo2Translate">translate()</button>
        <button class="btn" @click="demo2Rotate">rotate()</button>
        <button class="btn" @click="demo2DrawRect">drawRect</button>
        <button class="btn" @click="demo2Clear">Clear</button>
      </div>

      <template #code>
        <CodePanel title="save / restore" :code="code2" />
      </template>
    </DemoStep>

    <!-- Step 3 — clip -->
    <DemoStep :number="3" title="clip — masking with a path">
      <p class="step-desc">
        After calling <code class="text-mono">ctx.clip()</code>, all subsequent drawing is masked to the current path.
        Wrap in <code class="text-mono">save()</code> / <code class="text-mono">restore()</code> to remove the clip.
      </p>
      <canvas ref="c3" width="400" height="300"></canvas>
      <div class="stack-counter mt-1">Save depth: <span>{{ saveDepth3 }}</span></div>
      <div class="btn-row">
        <button class="btn btn-green"  @click="demo3Save">save()</button>
        <button class="btn btn-danger" @click="demo3Restore" :disabled="saveDepth3 === 0">restore()</button>
        <button class="btn" @click="demo3ShowPath">Show clip path</button>
        <button class="btn btn-primary" @click="demo3Clip">clip()</button>
      </div>
      <div class="btn-row">
        <button class="btn" @click="demo3FillRect">Fill rect</button>
        <button class="btn" @click="demo3DrawCircles">Draw circles</button>
        <button class="btn" @click="demo3DrawStripes">Draw stripes</button>
        <button class="btn" @click="demo3Reset">Reset</button>
      </div>

      <template #code>
        <CodePanel title="clip" :code="code3" />
      </template>
    </DemoStep>

    <!-- Step 4a — with save/restore -->
    <DemoStep number="4a" title="Combined — with save() / restore()">
      <p class="step-desc">
        Each frame, <code class="text-mono">save()</code> snapshots the context before the clip and transform are applied.
        <code class="text-mono">restore()</code> rolls them back so the next frame starts from a clean state.
      </p>
      <canvas ref="c4a" width="400" height="300"></canvas>
      <div class="btn-row">
        <button
          :class="running4a ? 'btn btn-danger' : 'btn btn-primary'"
          @click="demo4ToggleWith"
        >{{ running4a ? 'Stop' : 'Start' }}</button>
      </div>

      <template #code>
        <CodePanel title="with save / restore" :code="code4" />
      </template>
    </DemoStep>

    <!-- Step 4b — without save/restore -->
    <DemoStep number="4b" title="Combined — without save() / restore()">
      <p class="step-desc">
        The clip and translate are never restored, so they accumulate across frames.
        The clip region shrinks to nothing within a few frames, and
        <code class="text-mono">clearRect</code> fires in the wrong coordinate space.
      </p>
      <canvas ref="c4b" width="400" height="300"></canvas>
      <div class="btn-row">
        <button
          :class="running4b ? 'btn btn-danger' : 'btn btn-primary'"
          @click="demo4ToggleWithout"
        >{{ running4b ? 'Stop' : 'Start' }}</button>
      </div>

      <template #code>
        <CodePanel title="without save / restore" :code="code4Without" />
      </template>
    </DemoStep>

    <div class="connection-banner">
      <span class="connection-badge">Connected to MediaStream</span>
      <span>
        This canvas can become a live video stream via
        <code class="text-mono">canvas.captureStream(30)</code> —
        see the <RouterLink to="/mediastream">MediaStream demo →</RouterLink>
      </span>
    </div>
  </div>
</template>
