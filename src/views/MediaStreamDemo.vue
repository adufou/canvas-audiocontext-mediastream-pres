<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DemoStep from '../components/DemoStep.vue'
import CodePanel from '../components/CodePanel.vue'

// ─── Template refs ─────────────────────────────────────────────────────────────

const animCanvas    = ref<HTMLCanvasElement | null>(null)
const canvasVideoEl = ref<HTMLVideoElement | null>(null)
const combinedVideoEl = ref<HTMLVideoElement | null>(null)

// ─── Reactive UI state ────────────────────────────────────────────────────────

const videoState   = ref('video track — not captured')
const videoActive  = ref(false)
const micState     = ref('mic — not requested')
const micActive    = ref(false)
const micError     = ref(false)
const synthState   = ref('synth audio track — not created')
const synthActive  = ref(false)
const synthRunning = ref(false)
const combineState = ref('combined stream — not ready')
const combineActive = ref(false)
const recordState  = ref('recorder — idle')
const recordActive = ref(false)
const downloadUrl  = ref<string | null>(null)

const pillVideo = ref({ label: 'video — none', cls: '' })
const pillAudio = ref({ label: 'audio — none', cls: '' })
const pillCombo = ref({ label: 'combined stream — not ready', cls: '' })

const synthFreq    = ref(440)
const synthEnabled = ref(false)

const isFileProtocol = ref(false)
const canCombine = ref(false)

// ─── Internal stream refs (not reactive, just held in closure) ─────────────────

let canvasStream:   MediaStream | null = null
let micStream:      MediaStream | null = null
let micAudioCtx:    AudioContext | null = null
let micAnalyser:    AnalyserNode | null = null
let synthAudioCtx:  AudioContext | null = null
let synthOsc:       OscillatorNode | null = null
let synthDest:      MediaStreamAudioDestinationNode | null = null
let synthStreamRef: MediaStream | null = null
let combinedStream: MediaStream | null = null
let micMeterRafId   = 0

const micMeterBar = ref<HTMLDivElement | null>(null)

// ─── Bouncing ball animation ───────────────────────────────────────────────────

function startBallAnimation() {
  const canvas = animCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const ball = { x: W / 2, y: H / 2, r: 18, vx: 3.2, vy: 2.1 }
  const ballColors = ['#7c6af7', '#34d399', '#fbbf24', '#f87171', '#7dd3fc']
  let colorIdx = 0

  function drawFrame() {
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, W, H)
    ball.x += ball.vx
    ball.y += ball.vy
    if (ball.x - ball.r < 0 || ball.x + ball.r > W) {
      ball.vx *= -1
      colorIdx = (colorIdx + 1) % ballColors.length
    }
    if (ball.y - ball.r < 0 || ball.y + ball.r > H) {
      ball.vy *= -1
      colorIdx = (colorIdx + 1) % ballColors.length
    }
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fillStyle = ballColors[colorIdx]!
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '11px monospace'
    ctx.fillText('canvas.captureStream()', 8, H - 8)
    requestAnimationFrame(drawFrame)
  }

  drawFrame()
}

// ─── Step 1 — captureStream ───────────────────────────────────────────────────

function captureCanvasStream() {
  const canvas = animCanvas.value
  if (!canvas) return
  if (!(canvas as any).captureStream) {
    alert('canvas.captureStream() not supported in this browser.')
    return
  }
  if (canvasStream) return

  canvasStream = (canvas as any).captureStream(30) as MediaStream
  if (canvasVideoEl.value) canvasVideoEl.value.srcObject = canvasStream

  const vt = canvasStream.getVideoTracks()[0]
  pillVideo.value = { label: `video: ${vt?.label || 'canvas'}`, cls: 'active-video' }
  videoState.value = 'video track — live (canvas)'
  videoActive.value = true
  checkCombineReady()
}

function stopCanvasStream() {
  if (!canvasStream) return
  canvasStream.getTracks().forEach(t => t.stop())
  canvasStream = null
  if (canvasVideoEl.value) canvasVideoEl.value.srcObject = null
  pillVideo.value = { label: 'video — none', cls: '' }
  videoState.value = 'video track — stopped'
  videoActive.value = false
  checkCombineReady()
}

// ─── Step 2 — getUserMedia ────────────────────────────────────────────────────

async function requestMic() {
  try {
    micStream   = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    micAudioCtx = new AudioContext()
    micAnalyser = micAudioCtx.createAnalyser()
    micAnalyser.fftSize = 256
    const source = micAudioCtx.createMediaStreamSource(micStream)
    source.connect(micAnalyser)

    const at = micStream.getAudioTracks()[0]
    micState.value  = `mic — live (${at?.label || 'microphone'})`
    micActive.value = true
    micError.value  = false
    startMicMeter()
  } catch (err: any) {
    micState.value  = `mic — error: ${err.message}`
    micActive.value = false
    micError.value  = true
  }
}

function startMicMeter() {
  const data = new Float32Array(micAnalyser!.fftSize)
  function tick() {
    micAnalyser!.getFloatTimeDomainData(data)
    const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length)
    if (micMeterBar.value) micMeterBar.value.style.width = Math.min(rms * 500, 100) + '%'
    micMeterRafId = requestAnimationFrame(tick)
  }
  tick()
}

// ─── Step 3 — AudioContext → MediaStreamDestination ───────────────────────────

function startSynth() {
  if (synthOsc) return
  synthAudioCtx = new AudioContext()
  synthDest     = synthAudioCtx.createMediaStreamDestination()
  const gainNode = synthAudioCtx.createGain()
  gainNode.gain.value = 0.6
  synthOsc = synthAudioCtx.createOscillator()
  synthOsc.type = 'sine'
  synthOsc.frequency.value = synthFreq.value
  synthOsc.connect(gainNode)
  gainNode.connect(synthDest)
  synthOsc.start()
  synthStreamRef = synthDest.stream
  synthEnabled.value = true
  synthRunning.value = true

  const at = synthStreamRef.getAudioTracks()[0]
  pillAudio.value = { label: `audio: ${at?.label || 'synth'}`, cls: 'active-audio' }
  synthState.value  = 'synth audio track — live'
  synthActive.value = true
  checkCombineReady()
}

function stopSynth() {
  if (synthOsc) { synthOsc.stop(); synthOsc = null }
  if (synthAudioCtx) { synthAudioCtx.close(); synthAudioCtx = null; synthDest = null; synthStreamRef = null }
  synthEnabled.value = false
  synthRunning.value = false
  pillAudio.value = { label: 'audio — none', cls: '' }
  synthState.value  = 'synth audio track — stopped'
  synthActive.value = false
  checkCombineReady()
}

function onSynthFreqChange() {
  if (synthOsc && synthAudioCtx) {
    synthOsc.frequency.setTargetAtTime(synthFreq.value, synthAudioCtx.currentTime, 0.01)
  }
}

// ─── Step 4 — Combine tracks ──────────────────────────────────────────────────

function checkCombineReady() {
  canCombine.value = !!(canvasStream?.active && synthStreamRef)
}

function combineStreams() {
  if (!canvasStream || !synthStreamRef) return
  const videoTrack = canvasStream.getVideoTracks()[0]
  const audioTrack = synthStreamRef.getAudioTracks()[0]
  if (!videoTrack || !audioTrack) { alert('A track is missing.'); return }

  combinedStream = new MediaStream([videoTrack, audioTrack])
  if (combinedVideoEl.value) combinedVideoEl.value.srcObject = combinedStream

  pillCombo.value = { label: 'combined: 1 video + 1 audio track', cls: 'active-combo' }
  combineState.value  = 'combined stream — playing'
  combineActive.value = true
}

// ─── Bonus — MediaRecorder ────────────────────────────────────────────────────

const canRecord = ref(false)

function recordStream() {
  if (!combinedStream) return
  const chunks:   BlobPart[] = []
  const recorder = new MediaRecorder(combinedStream)

  recorder.ondataavailable = e => { if ((e as any).data.size > 0) chunks.push((e as any).data) }
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    downloadUrl.value = URL.createObjectURL(blob)
    recordState.value  = 'done — download ready'
    recordActive.value = true
  }

  recordState.value = 'recording… (3s)'
  canRecord.value = false
  recorder.start()
  setTimeout(() => recorder.stop(), 3000)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  isFileProtocol.value = location.protocol === 'file:'
  startBallAnimation()
})

onUnmounted(() => {
  stopCanvasStream()
  stopSynth()
  cancelAnimationFrame(micMeterRafId)
  micAudioCtx?.close()
})

// Watch combinedStream to enable record button
import { watch } from 'vue'
watch(combineActive, (val) => { if (val) canRecord.value = true })

// ─── Code panel content ───────────────────────────────────────────────────────

const code1 = `<span class="cm">// Check support (Safari needs a flag)</span>
<span class="kw">if</span> (!canvas.captureStream) {
  console.<span class="fn">error</span>(<span class="str">'not supported'</span>);
}

<span class="cm">// Capture at 30 fps → MediaStream</span>
<span class="kw">const</span> stream = canvas.<span class="fn">captureStream</span>(<span class="num">30</span>);

<span class="kw">const</span> [videoTrack] = stream.<span class="fn">getVideoTracks</span>();
console.<span class="fn">log</span>(videoTrack.kind);  <span class="cm">// "video"</span>
console.<span class="fn">log</span>(videoTrack.label); <span class="cm">// "canvas"</span>

<span class="cm">// Play in a video element</span>
video.srcObject = stream;

<span class="cm">// Stop:</span>
stream.<span class="fn">getTracks</span>().<span class="fn">forEach</span>(t => t.<span class="fn">stop</span>());`

const code2 = `<span class="cm">// Requires HTTPS or localhost</span>
<span class="kw">const</span> stream = <span class="kw">await</span> navigator.mediaDevices
  .<span class="fn">getUserMedia</span>({ audio: <span class="kw">true</span>, video: <span class="kw">false</span> });

<span class="kw">const</span> [audioTrack] = stream.<span class="fn">getAudioTracks</span>();
console.<span class="fn">log</span>(audioTrack.label); <span class="cm">// "Built-in Mic"</span>

<span class="cm">// Visualize mic level without feedback:</span>
<span class="cm">// connect source → analyser (NOT → destination)</span>
<span class="kw">const</span> source   = audioCtx.<span class="fn">createMediaStreamSource</span>(stream);
<span class="kw">const</span> analyser = audioCtx.<span class="fn">createAnalyser</span>();
source.<span class="fn">connect</span>(analyser);

<span class="kw">const</span> data = <span class="kw">new</span> <span class="fn">Float32Array</span>(analyser.fftSize);
analyser.<span class="fn">getFloatTimeDomainData</span>(data);
<span class="kw">const</span> rms = Math.<span class="fn">sqrt</span>(
  data.<span class="fn">reduce</span>((s, v) => s + v * v, <span class="num">0</span>) / data.length
);`

const code3 = `<span class="kw">const</span> audioCtx = <span class="kw">new</span> <span class="fn">AudioContext</span>();

<span class="cm">// Does NOT play to speakers</span>
<span class="kw">const</span> dest = audioCtx.<span class="fn">createMediaStreamDestination</span>();

<span class="kw">const</span> osc = audioCtx.<span class="fn">createOscillator</span>();
osc.frequency.value = <span class="num">440</span>;
osc.<span class="fn">connect</span>(dest);
osc.<span class="fn">start</span>();

<span class="cm">// dest.stream is a live MediaStream</span>
<span class="kw">const</span> [audioTrack] = dest.stream.<span class="fn">getAudioTracks</span>();
console.<span class="fn">log</span>(audioTrack.kind); <span class="cm">// "audio"</span>

<span class="cm">// The oscillator runs silently</span>
<span class="cm">// until we use its track somewhere.</span>`

const code4 = `<span class="kw">const</span> videoTrack = canvasStream.<span class="fn">getVideoTracks</span>()[<span class="num">0</span>];
<span class="kw">const</span> audioTrack = synthStream.<span class="fn">getAudioTracks</span>()[<span class="num">0</span>];

<span class="cm">// Compositor — pick tracks from any source</span>
<span class="kw">const</span> combined = <span class="kw">new</span> <span class="fn">MediaStream</span>([videoTrack, audioTrack]);

video.srcObject = combined;

<span class="cm">// Bonus: record it</span>
<span class="kw">const</span> recorder = <span class="kw">new</span> <span class="fn">MediaRecorder</span>(combined);
<span class="kw">const</span> chunks = [];

recorder.ondataavailable = e => chunks.<span class="fn">push</span>(e.data);
recorder.onstop = () => {
  <span class="kw">const</span> blob = <span class="kw">new</span> <span class="fn">Blob</span>(chunks, { type: <span class="str">'video/webm'</span> });
  link.href = URL.<span class="fn">createObjectURL</span>(blob);
};

recorder.<span class="fn">start</span>();
<span class="fn">setTimeout</span>(() => recorder.<span class="fn">stop</span>(), <span class="num">3000</span>);`
</script>

<template>
  <div class="page">
    <h1 style="margin-bottom:0.25rem">MediaStream API</h1>
    <p style="margin-bottom:1.5rem">
      A <code class="text-mono">MediaStream</code> is a collection of tracks.
      Tracks come from cameras, microphones, canvases, or synthesized sources — and can be mixed freely.
    </p>

    <!-- Stream assembly visualization -->
    <div class="stream-assembly">
      <span style="color:var(--text-dim)">Tracks:</span>
      <span class="track-pill" :class="pillVideo.cls">{{ pillVideo.label }}</span>
      <span class="track-pill" :class="pillAudio.cls">{{ pillAudio.label }}</span>
      <span style="color:var(--text-dim); padding: 0 0.25rem">→</span>
      <span class="track-pill" :class="pillCombo.cls">{{ pillCombo.label }}</span>
    </div>

    <!-- Step 1 — canvas.captureStream() -->
    <DemoStep :number="1" title="canvas.captureStream()">
      <p class="step-desc">
        A live canvas animation can be captured as a
        <code class="text-mono">MediaStream</code> at a given frame rate.
        The resulting stream has one <code class="text-mono">VideoStreamTrack</code> —
        it's live: every canvas frame appears in the stream.
      </p>
      <div class="side-by-side">
        <div>
          <canvas ref="animCanvas" width="320" height="180"></canvas>
          <p class="canvas-label">Live canvas (source)</p>
        </div>
        <div>
          <video ref="canvasVideoEl" autoplay muted playsinline></video>
          <p class="video-label">Video element (stream output)</p>
        </div>
      </div>
      <div class="btn-row mt-2">
        <button class="btn btn-primary" :disabled="videoActive" @click="captureCanvasStream">captureStream(30)</button>
        <button class="btn btn-danger"  :disabled="!videoActive" @click="stopCanvasStream">Stop stream</button>
      </div>
      <div class="state-badge mt-1" :class="{ active: videoActive }">{{ videoState }}</div>

      <template #code>
        <CodePanel title="captureStream" :code="code1" />
      </template>
    </DemoStep>

    <!-- Step 2 — getUserMedia -->
    <DemoStep :number="2" title="getUserMedia — microphone access">
      <div v-if="isFileProtocol" class="warning-banner" style="display:block">
        getUserMedia requires HTTPS or localhost.
        Serve with: <code>python3 -m http.server</code> → open <code>http://localhost:8000</code>
      </div>
      <p class="step-desc">
        <code class="text-mono">navigator.mediaDevices.getUserMedia()</code> returns a Promise
        resolving to a <code class="text-mono">MediaStream</code>. The audio element is muted to
        prevent feedback — but the track is live and usable.
      </p>
      <div class="meter-wrap">
        <div ref="micMeterBar" class="meter-bar"></div>
      </div>
      <div class="btn-row mt-1">
        <button class="btn btn-primary" :disabled="micActive" @click="requestMic">Request mic access</button>
      </div>
      <div class="state-badge mt-1" :class="{ active: micActive, error: micError }">{{ micState }}</div>

      <template #code>
        <CodePanel title="getUserMedia" :code="code2" />
      </template>
    </DemoStep>

    <!-- Step 3 — createMediaStreamDestination -->
    <DemoStep :number="3" title="AudioContext → MediaStream">
      <p class="step-desc">
        <code class="text-mono">audioCtx.createMediaStreamDestination()</code> creates a node
        whose <code class="text-mono">.stream</code> is a live <code class="text-mono">MediaStream</code>.
        The audio is <em>not</em> played to the speakers — only available as a track.
        Perfect for recording or mixing without feedback.
      </p>
      <div class="control-row">
        <label>
          Frequency: {{ synthFreq }} Hz
          <input type="range" min="55" max="880" :disabled="!synthEnabled"
                 v-model.number="synthFreq" @input="onSynthFreqChange">
        </label>
      </div>
      <div class="btn-row mt-1">
        <button class="btn btn-green"  :disabled="synthRunning"  @click="startSynth">Start synth tone</button>
        <button class="btn btn-danger" :disabled="!synthRunning" @click="stopSynth">Stop synth</button>
      </div>
      <div class="state-badge mt-1" :class="{ active: synthActive }">{{ synthState }}</div>

      <template #code>
        <CodePanel title="MediaStreamDestination" :code="code3" />
      </template>
    </DemoStep>

    <!-- Step 4 — Combine tracks -->
    <DemoStep :number="4" title="new MediaStream([videoTrack, audioTrack])">
      <p class="step-desc">
        <code class="text-mono">new MediaStream([...tracks])</code> is the compositor.
        Pick any tracks from any source and combine them into a single stream.
        This stream can be played, recorded, or sent over WebRTC.
      </p>
      <video ref="combinedVideoEl" autoplay playsinline controls
             style="width:100%;max-width:400px;margin-top:0.5rem"></video>
      <div class="btn-row mt-1">
        <button class="btn btn-primary" :disabled="!canCombine" @click="combineStreams">Combine tracks</button>
      </div>
      <div class="state-badge mt-1" :class="{ active: combineActive }">{{ combineState }}</div>

      <details style="margin-top:1rem">
        <summary>Bonus: MediaRecorder — record to a file</summary>
        <p class="step-desc mt-1">
          <code class="text-mono">MediaRecorder</code> records any
          <code class="text-mono">MediaStream</code> to a Blob.
        </p>
        <div class="btn-row">
          <button class="btn btn-primary" :disabled="!canRecord" @click="recordStream">Record 3s</button>
          <a v-if="downloadUrl" :href="downloadUrl" download="recording.webm" class="btn btn-green">
            Download recording
          </a>
        </div>
        <div class="state-badge mt-1" :class="{ active: recordActive }">{{ recordState }}</div>
      </details>

      <template #code>
        <CodePanel title="Combine tracks" :code="code4" />
      </template>
    </DemoStep>

    <div class="connection-banner mt-3">
      <span class="connection-badge">Connected to Canvas</span>
      <span>Step 1 uses the Canvas API — see <RouterLink to="/canvas">Canvas demo →</RouterLink></span>
    </div>
    <div class="connection-banner mt-2">
      <span class="connection-badge">Connected to AudioContext</span>
      <span>Step 3 uses an AudioContext oscillator — see <RouterLink to="/audiocontext">AudioContext demo →</RouterLink></span>
    </div>
  </div>
</template>

<style scoped>
.stream-assembly {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.82rem;
  font-family: var(--font-mono);
}
.track-pill {
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.78rem;
  transition: all 0.2s;
}
.track-pill.active-video { border-color: var(--accent); color: var(--accent2); background: #1e1a3a; }
.track-pill.active-audio { border-color: var(--green);  color: var(--green);   background: #064e3b; }
.track-pill.active-combo { border-color: var(--yellow); color: var(--yellow);  background: #451a03; }
.side-by-side { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
.side-by-side canvas, .side-by-side video { width: 100%; aspect-ratio: 16/9; }
.canvas-label, .video-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-align: center;
  margin-top: 0.3rem;
  font-family: var(--font-mono);
}
</style>
