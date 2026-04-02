<template>
  <div class="page">
    <header class="hero">
      <h1>Web API Deep Dive</h1>
      <p>Interactive demos for <strong>Canvas</strong>, <strong>AudioContext</strong>, and <strong>MediaStream</strong> — and how they connect.</p>
    </header>

    <div class="cards">
      <div class="card">
        <div class="card-icon">🎨</div>
        <h2>Canvas</h2>
        <ul>
          <li>drawImage — images, videos, other canvases</li>
          <li>save / restore — the context state stack</li>
          <li>clip — masking regions with paths</li>
          <li>Combined: animated rotating clipped image</li>
        </ul>
        <RouterLink to="/canvas" class="btn btn-primary">Open demo →</RouterLink>
      </div>

      <div class="card">
        <div class="card-icon">🔊</div>
        <h2>AudioContext</h2>
        <ul>
          <li>OscillatorNode — generate tones</li>
          <li>GainNode — volume control</li>
          <li>BiquadFilterNode — lowpass / highpass / bandpass</li>
          <li>AnalyserNode → Canvas — real-time FFT visualizer</li>
        </ul>
        <RouterLink to="/audiocontext" class="btn btn-primary">Open demo →</RouterLink>
      </div>

      <div class="card">
        <div class="card-icon">📡</div>
        <h2>MediaStream</h2>
        <ul>
          <li>canvas.captureStream() — canvas as video source</li>
          <li>getUserMedia — camera / microphone</li>
          <li>createMediaStreamDestination — AudioContext → stream</li>
          <li>Combining tracks from multiple sources</li>
        </ul>
        <RouterLink to="/mediastream" class="btn btn-primary">Open demo →</RouterLink>
      </div>
    </div>

    <div class="connections">
      <h2>How they connect</h2>
      <p>These three APIs are not isolated — they compose.</p>

      <div class="conn-group">
        <div class="conn-row">
          <div class="conn-node">Canvas</div>
          <div class="conn-arrow">
            <span class="label">captureStream()</span>
            <div class="line"></div>
          </div>
          <div class="conn-node">MediaStream</div>
        </div>

        <div class="conn-row">
          <div class="conn-node">AudioContext</div>
          <div class="conn-arrow">
            <span class="label">createMediaStreamDestination()</span>
            <div class="line"></div>
          </div>
          <div class="conn-node">MediaStream</div>
        </div>

        <div class="conn-row">
          <div class="conn-node">AudioContext</div>
          <div class="conn-arrow">
            <span class="label">AnalyserNode data</span>
            <div class="line"></div>
          </div>
          <div class="conn-node">Canvas</div>
          <span class="text-dim" style="margin-left:0.75rem">(FFT visualizer)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 4rem 2rem 2rem;
}
.hero p {
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0.75rem auto 0;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.2s, transform 0.15s;
}
.card:hover { border-color: var(--accent); transform: translateY(-2px); }
.card-icon { font-size: 2rem; line-height: 1; }
.card h2 { font-size: 1.3rem; }
.card ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.card ul li {
  font-size: 0.85rem;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.card ul li::before {
  content: '';
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.card .btn { margin-top: auto; }

.connections {
  margin-top: 3.5rem;
  padding-top: 2.5rem;
  border-top: 1px solid var(--border);
}
.connections h2 { text-align: center; margin-bottom: 0.5rem; }
.connections > p { text-align: center; margin-bottom: 2rem; }
.conn-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}
.conn-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
}
.conn-node {
  padding: 0.6rem 1.2rem;
  background: var(--surface);
  border: 2px solid var(--accent);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--accent2);
  white-space: nowrap;
}
.conn-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0.75rem;
  min-width: 120px;
}
.conn-arrow .label {
  font-size: 0.72rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
  text-align: center;
}
.conn-arrow .line {
  width: 100%;
  height: 1px;
  background: var(--border);
  position: relative;
  margin: 0.3rem 0;
}
.conn-arrow .line::after {
  content: '▶';
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  color: var(--text-dim);
}
</style>
