/**
 * shared/nav.js — Injects the navigation bar into every demo page.
 * Called automatically via <script src="../shared/nav.js"></script>
 */
(function () {
  const pages = [
    { label: 'Canvas',       href: '../demos/canvas.html' },
    { label: 'AudioContext', href: '../demos/audiocontext.html' },
    { label: 'MediaStream',  href: '../demos/mediastream.html' },
  ];

  const current = window.location.pathname.split('/').pop();

  const nav = document.createElement('nav');
  nav.className = 'demo-nav';
  nav.innerHTML = `
    <a class="back-link" href="../index.html">← All demos</a>
    <span class="nav-title">${document.title}</span>
    <div class="nav-pills">
      ${pages.map(p => `
        <a class="nav-pill ${p.href.includes(current) ? 'active' : ''}"
           href="${p.href}">${p.label}</a>
      `).join('')}
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);
})();
