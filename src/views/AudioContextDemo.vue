<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import DemoStep from '../components/DemoStep.vue'
import CodePanel from '../components/CodePanel.vue'

// ─── AudioContext state ────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null
let gainNode: GainNode | null = null
let filterNode: BiquadFilterNode | null = null
let analyserNode: AnalyserNode | null = null
let currentOsc: OscillatorNode | null = null
let freqData: Uint8Array<ArrayBuffer> | null = null
let timeData: Uint8Array<ArrayBuffer> | null = null
let animating = false
let vizRafId = 0

// ─── Reactive UI state ────────────────────────────────────────────────────────

const ctxStarted   = ref(false)
const isPlaying    = ref(false)
const vizMode      = ref<'freq' | 'wave'>('freq')
const freq         = ref(440)
const gain         = ref(0.7)
const cutoff       = ref(2000)
const q            = ref(1)
const waveform     = ref<OscillatorType | 'buzz'>('sine')
const filterType   = ref<BiquadFilterType>('lowpass')

// Signal flow: which nodes are lit up
const activeNodes  = ref<Set<string>>(new Set())

function setActive(ids: string[]) {
  activeNodes.value = new Set(ids)
}

const vizCanvas = ref<HTMLCanvasElement | null>(null)

// ─── Init ──────────────────────────────────────────────────────────────────────

async function initContext() {
  if (audioCtx) return
  audioCtx = new AudioContext()
  await audioCtx.resume()

  gainNode     = audioCtx.createGain()
  filterNode   = audioCtx.createBiquadFilter()
  analyserNode = audioCtx.createAnalyser()
  analyserNode.fftSize = 2048

  gainNode.gain.value        = gain.value
  filterNode.type            = filterType.value
  filterNode.frequency.value = cutoff.value
  filterNode.Q.value         = q.value

  gainNode.connect(filterNode)
  filterNode.connect(analyserNode)
  analyserNode.connect(audioCtx.destination)

  freqData = new Uint8Array(analyserNode.frequencyBinCount)
  timeData = new Uint8Array(analyserNode.fftSize)

  ctxStarted.value = true
  setActive(['dest'])
}

// ─── Oscillator ───────────────────────────────────────────────────────────────

function createBuzzWave(): PeriodicWave {
  const N = 40
  const real = new Float32Array(N + 1)
  const imag = new Float32Array(N + 1)
  for (let k = 1; k <= N; k++) {
    imag[k] = 1 / Math.pow(k, 0.3) // flat-ish rolloff → many visible harmonics
  }
  return audioCtx!.createPeriodicWave(real, imag)
}

function applyWaveform(osc: OscillatorNode) {
  if (waveform.value === 'buzz') {
    osc.setPeriodicWave(createBuzzWave())
  } else {
    osc.type = waveform.value as OscillatorType
  }
}

function playOsc() {
  if (!audioCtx || !gainNode) return
  stopOsc()

  const osc = audioCtx.createOscillator()
  applyWaveform(osc)
  osc.frequency.setValueAtTime(freq.value, audioCtx.currentTime)
  osc.connect(gainNode)
  osc.start()
  currentOsc = osc

  osc.onended = () => {
    osc.disconnect()
    if (currentOsc === osc) currentOsc = null
  }

  setActive(['osc', 'gain', 'filter', 'analyser', 'dest'])
  startVizLoop()
  isPlaying.value = true
}

function stopOsc() {
  if (currentOsc) {
    try { currentOsc.stop() } catch (_) {}
    currentOsc = null
  }
  animating = false
  isPlaying.value = false
  setActive([])
}

// ─── Live parameter updates ───────────────────────────────────────────────────

function onFreqChange() {
  if (currentOsc && audioCtx) {
    currentOsc.frequency.setTargetAtTime(freq.value, audioCtx.currentTime, 0.01)
  }
}

function onGainChange() {
  if (gainNode && audioCtx) {
    gainNode.gain.setTargetAtTime(gain.value, audioCtx.currentTime, 0.01)
  }
}

function onCutoffChange() {
  if (filterNode) filterNode.frequency.value = cutoff.value
}

function onQChange() {
  if (filterNode) filterNode.Q.value = q.value
}

function onFilterTypeChange() {
  if (filterNode) filterNode.type = filterType.value
}

function onWaveformChange() {
  if (currentOsc) applyWaveform(currentOsc)
}

// ─── Visualizer ───────────────────────────────────────────────────────────────

function startVizLoop() {
  if (animating) return
  animating = true
  drawVizLoop()
}

function drawVizLoop() {
  if (!animating) return
  vizRafId = requestAnimationFrame(drawVizLoop)

  const canvas = vizCanvas.value
  if (!canvas || !analyserNode) return
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  if (vizMode.value === 'freq') {
    const fd = freqData!
    analyserNode.getByteFrequencyData(fd)
    const barW = W / fd.length * 2.5
    let x = 0
    for (let i = 0; i < fd.length; i++) {
      const barH = (fd[i]! / 255) * H
      const hue  = 260 + (i / fd.length) * 80
      ctx.fillStyle = `hsl(${hue}, 80%, 60%)`
      ctx.fillRect(x, H - barH, barW - 1, barH)
      x += barW
      if (x > W) break
    }
  } else {
    const td = timeData!
    analyserNode.getByteTimeDomainData(td)
    ctx.strokeStyle = '#7c6af7'
    ctx.lineWidth   = 2
    ctx.beginPath()
    const sliceW = W / td.length
    let x = 0
    for (let i = 0; i < td.length; i++) {
      const v = td[i]! / 128.0
      const y = (v * H) / 2
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      x += sliceW
    }
    ctx.stroke()
  }

  setActive(['osc', 'gain', 'filter', 'analyser', 'dest', 'canvas'])
}

function setVizMode(mode: 'freq' | 'wave') {
  vizMode.value = mode
}

// ─── Full chain animation ─────────────────────────────────────────────────────

const chainRunning = ref(false)

function runFullChain() {
  if (!audioCtx) return
  chainRunning.value = true
  const steps = [
    ['osc'],
    ['osc', 'gain'],
    ['osc', 'gain', 'filter'],
    ['osc', 'gain', 'filter', 'analyser', 'canvas'],
    ['osc', 'gain', 'filter', 'analyser', 'canvas', 'dest'],
  ]
  let i = 0
  const interval = setInterval(() => {
    const step = steps[i++]
    if (step) setActive(step)
    if (i >= steps.length) clearInterval(interval)
  }, 400)

  playOsc()
}

function stopChain() {
  stopOsc()
  chainRunning.value = false
}

onUnmounted(() => {
  stopOsc()
  cancelAnimationFrame(vizRafId)
  audioCtx?.close()
})

// ─── Code panel content ───────────────────────────────────────────────────────

const code1 = `<span class="cm">// Must be inside a user-gesture handler</span>
<span class="kw">const</span> audioCtx = <span class="kw">new</span> <span class="fn">AudioContext</span>();
<span class="kw">await</span> audioCtx.<span class="fn">resume</span>();

<span class="cm">// Oscillators are ONE-SHOT:</span>
<span class="cm">// .start() can only be called once per node.</span>
<span class="cm">// Create a new oscillator each time you play.</span>
<span class="kw">let</span> osc = audioCtx.<span class="fn">createOscillator</span>();
osc.type = <span class="str">'sine'</span>; <span class="cm">// sine|square|triangle|sawtooth</span>
osc.frequency.<span class="fn">setValueAtTime</span>(<span class="num">440</span>, audioCtx.currentTime);

osc.<span class="fn">connect</span>(audioCtx.destination);
osc.<span class="fn">start</span>();

<span class="cm">// To stop:</span>
osc.<span class="fn">stop</span>();
osc.<span class="fn">disconnect</span>();`

const code2 = `<span class="kw">const</span> gain = audioCtx.<span class="fn">createGain</span>();
gain.gain.value = <span class="num">0.7</span>; <span class="cm">// 0 = silence, 1 = full</span>

<span class="cm">// osc → gain → speakers</span>
osc.<span class="fn">connect</span>(gain);
gain.<span class="fn">connect</span>(audioCtx.destination);

<span class="cm">// Smooth ramp — avoids clicks</span>
gain.gain.<span class="fn">setTargetAtTime</span>(
  newVolume,
  audioCtx.currentTime,
  <span class="num">0.01</span>  <span class="cm">// time constant (s)</span>
);

<span class="cm">// Or direct (fine for small changes):</span>
gain.gain.value = <span class="num">0.5</span>;`

const code3 = `<span class="kw">const</span> filter = audioCtx.<span class="fn">createBiquadFilter</span>();
filter.type            = <span class="str">'lowpass'</span>;
filter.frequency.value = <span class="num">2000</span>; <span class="cm">// cutoff in Hz</span>
filter.Q.value         = <span class="num">1</span>;    <span class="cm">// resonance</span>

<span class="cm">// osc → gain → filter → speakers</span>
osc.<span class="fn">connect</span>(gain);
gain.<span class="fn">connect</span>(filter);
filter.<span class="fn">connect</span>(audioCtx.destination);

<span class="cm">// Update live — values take effect immediately</span>
filter.frequency.value = <span class="num">500</span>;
filter.type = <span class="str">'highpass'</span>;`

const code4 = `<span class="kw">const</span> analyser = audioCtx.<span class="fn">createAnalyser</span>();
analyser.fftSize = <span class="num">2048</span>; <span class="cm">// power of 2</span>

filter.<span class="fn">connect</span>(analyser);
analyser.<span class="fn">connect</span>(audioCtx.destination);

<span class="cm">// FFT spectrum</span>
<span class="kw">const</span> freqData = <span class="kw">new</span> <span class="fn">Uint8Array</span>(analyser.frequencyBinCount);
analyser.<span class="fn">getByteFrequencyData</span>(freqData);

<span class="cm">// Waveform</span>
<span class="kw">const</span> timeData = <span class="kw">new</span> <span class="fn">Uint8Array</span>(analyser.fftSize);
analyser.<span class="fn">getByteTimeDomainData</span>(timeData);

<span class="kw">let</span> animating = <span class="kw">true</span>;
<span class="kw">function</span> <span class="fn">drawLoop</span>() {
  <span class="kw">if</span> (!animating) <span class="kw">return</span>;
  <span class="fn">requestAnimationFrame</span>(drawLoop);
  analyser.<span class="fn">getByteFrequencyData</span>(freqData);
  <span class="cm">// ... draw bars on canvas ...</span>
}`

const code5 = `<span class="cm">// .connect() returns the destination node</span>
<span class="cm">// so calls can be chained:</span>
osc
  .<span class="fn">connect</span>(gain)
  .<span class="fn">connect</span>(filter)
  .<span class="fn">connect</span>(analyser)
  .<span class="fn">connect</span>(audioCtx.destination);

osc.<span class="fn">start</span>();

<span class="cm">// Stop cleanly:</span>
osc.<span class="fn">stop</span>();  <span class="cm">// fires osc.onended</span>

osc.onended = () => {
  osc.<span class="fn">disconnect</span>();
  animating = <span class="kw">false</span>; <span class="cm">// stops visualizer</span>
};`
</script>

<template>
  <div class="page">
    <h1 style="margin-bottom:0.25rem">AudioContext API</h1>
    <p style="margin-bottom:1.5rem">
      The Web Audio API models audio as a graph of nodes — each node transforms or routes audio signal.
    </p>

    <!-- Signal flow diagram -->
    <div class="signal-flow" style="flex-wrap:nowrap;overflow-x:auto">
      <div class="sf-node" :class="{ active: activeNodes.has('osc') }">OscillatorNode</div>
      <span class="sf-arrow">→</span>
      <div class="sf-node" :class="{ active: activeNodes.has('gain') }">GainNode</div>
      <span class="sf-arrow">→</span>
      <div class="sf-node" :class="{ active: activeNodes.has('filter') }">BiquadFilterNode</div>
      <span class="sf-arrow">→</span>
      <div class="sf-node" :class="{ active: activeNodes.has('analyser') }">AnalyserNode</div>
      <span class="sf-arrow">→</span>
      <div class="sf-node" :class="{ active: activeNodes.has('dest') }">destination</div>
      <span class="sf-arrow" style="color:var(--accent)">↓</span>
      <div class="sf-node" style="border-color:var(--accent);color:var(--accent2)"
           :class="{ active: activeNodes.has('canvas') }">Canvas (FFT)</div>
    </div>

    <!-- Step 1 — AudioContext + Oscillator -->
    <DemoStep :number="1" title="AudioContext + OscillatorNode" style="margin-top:1.5rem">
      <p class="step-desc">
        Browsers require a user gesture before any audio can play.
        Click <strong>Start AudioContext</strong> first — this unlocks the audio system.
        OscillatorNodes are <em>one-shot</em>: a new node is created on each Play click.
      </p>
      <div class="btn-row">
        <button class="btn btn-primary" :disabled="ctxStarted" @click="initContext">Start AudioContext</button>
        <span class="state-badge" :class="{ active: ctxStarted }">
          {{ ctxStarted ? 'running' : 'not started' }}
        </span>
      </div>
      <div class="control-row mt-2">
        <label>
          Frequency: {{ freq }} Hz
          <input type="range" min="20" max="20000" :disabled="!ctxStarted"
                 v-model.number="freq" @input="onFreqChange">
        </label>
        <label>
          Waveform
          <select :disabled="!ctxStarted" v-model="waveform" @change="onWaveformChange">
            <option value="sine">sine</option>
            <option value="square">square</option>
            <option value="triangle">triangle</option>
            <option value="sawtooth">sawtooth</option>
            <option value="buzz">buzz (rich harmonics)</option>
          </select>
        </label>
      </div>
      <div class="btn-row mt-2">
        <button class="btn btn-green"  :disabled="!ctxStarted || isPlaying"  @click="playOsc">▶ Play</button>
        <button class="btn btn-danger" :disabled="!ctxStarted || !isPlaying" @click="stopOsc">■ Stop</button>
      </div>

      <template #code>
        <CodePanel title="AudioContext + Oscillator" :code="code1" />
      </template>
    </DemoStep>

    <!-- Step 2 — GainNode -->
    <DemoStep :number="2" title="GainNode — volume control">
      <p class="step-desc">
        A <code class="text-mono">GainNode</code> multiplies the signal by its
        <code class="text-mono">gain.value</code>. Audio parameters can be automated over time
        with <code class="text-mono">.setTargetAtTime()</code> to avoid clicks and pops.
      </p>
      <div class="control-row">
        <label>
          Volume: {{ gain.toFixed(2) }}
          <input type="range" min="0" max="1" step="0.01" :disabled="!ctxStarted"
                 v-model.number="gain" @input="onGainChange">
        </label>
      </div>

      <template #code>
        <CodePanel title="GainNode" :code="code2" />
      </template>
    </DemoStep>

    <!-- Step 3 — BiquadFilterNode -->
    <DemoStep :number="3" title="BiquadFilterNode — EQ / filtering">
      <p class="step-desc">
        Filters shape the frequency spectrum. Try <em>lowpass</em> with the <em>buzz</em> waveform —
        it has 40 harmonics, so sweeping the cutoff visibly carves through the FFT.
      </p>
      <div class="control-row">
        <label>
          Filter type
          <select :disabled="!ctxStarted" v-model="filterType" @change="onFilterTypeChange">
            <option value="lowpass">lowpass</option>
            <option value="highpass">highpass</option>
            <option value="bandpass">bandpass</option>
            <option value="notch">notch</option>
            <option value="peaking">peaking</option>
          </select>
        </label>
        <label>
          Cutoff: {{ Math.round(cutoff) }} Hz
          <input type="range" min="20" max="20000" :disabled="!ctxStarted"
                 v-model.number="cutoff" @input="onCutoffChange">
        </label>
        <label>
          Q: {{ q.toFixed(1) }}
          <input type="range" min="0.1" max="20" step="0.1" :disabled="!ctxStarted"
                 v-model.number="q" @input="onQChange">
        </label>
      </div>

      <template #code>
        <CodePanel title="BiquadFilterNode" :code="code3" />
      </template>
    </DemoStep>

    <!-- Step 4 — AnalyserNode + Canvas -->
    <DemoStep :number="4" title="AnalyserNode → Canvas — real-time visualizer">
      <p class="step-desc">
        The <code class="text-mono">AnalyserNode</code> exposes audio as raw data —
        time-domain (waveform) or frequency-domain (FFT). Drawn on a Canvas each frame.
      </p>
      <canvas ref="vizCanvas" style="width:100%;height:130px" width="600" height="130"></canvas>
      <div class="btn-row" style="margin-top:0.5rem">
        <button class="btn" :class="{ 'btn-primary': vizMode === 'wave' }"
                :disabled="!ctxStarted" @click="setVizMode('wave')">Waveform</button>
        <button class="btn" :class="{ 'btn-primary': vizMode === 'freq' }"
                :disabled="!ctxStarted" @click="setVizMode('freq')">Spectrum (FFT)</button>
      </div>

      <template #code>
        <CodePanel title="AnalyserNode" :code="code4" />
      </template>
    </DemoStep>

    <!-- Step 5 — Full chain -->
    <DemoStep :number="5" title="Full signal chain">
      <p class="step-desc">
        Wire all nodes with chained <code class="text-mono">.connect()</code> calls.
        Watch the signal flow diagram above light up as audio passes through each node.
      </p>
      <div class="btn-row">
        <button v-if="!chainRunning" class="btn btn-primary" :disabled="!ctxStarted" @click="runFullChain">
          Run full chain
        </button>
        <button v-else class="btn btn-danger" @click="stopChain">Stop</button>
      </div>

      <template #code>
        <CodePanel title="Full chain" :code="code5" />
      </template>
    </DemoStep>

    <div class="connection-banner">
      <span class="connection-badge">Connected to MediaStream</span>
      <span>
        The oscillator can feed a <code class="text-mono">MediaStreamDestination</code> —
        see <RouterLink to="/mediastream">MediaStream demo step 3 →</RouterLink>
      </span>
    </div>
    <div class="connection-banner mt-2">
      <span class="connection-badge">Connected to Canvas</span>
      <span>
        The AnalyserNode feeds the Canvas visualizer above —
        the same Canvas API from <RouterLink to="/canvas">Canvas demo →</RouterLink>
      </span>
    </div>
  </div>
</template>
