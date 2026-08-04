@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --teal:       #1D9E75;
  --teal-dark:  #0F6E56;
  --teal-deep:  #085041;
  --teal-light: #E1F5EE;
  --teal-mid:   #9FE1CB;
  --blue:       #378ADD;
  --blue-light: #E6F1FB;
  --amber:      #BA7517;
  --amber-light:#FAEEDA;
  --red:        #E24B4A;
  --red-light:  #FCEBEB;
  --slate-50:   #F8FAFC;
  --slate-100:  #F1F5F9;
  --slate-200:  #E2E8F0;
  --slate-300:  #CBD5E1;
  --slate-400:  #94A3B8;
  --slate-500:  #64748B;
  --slate-600:  #475569;
  --slate-700:  #334155;
  --slate-800:  #1E293B;
  --slate-900:  #0F172A;
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-xl:  20px;
  --font-sans:  'Inter', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;
  --shadow-sm:  0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md:  0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
}

html { font-size: 16px; -webkit-font-smoothing: antialiased; }
body {
  font-family: var(--font-sans);
  background: var(--slate-100);
  color: var(--slate-800);
  min-height: 100vh;
  line-height: 1.5;
}

h1, h2, h3, h4 { font-weight: 500; line-height: 1.25; }

a { color: var(--teal); text-decoration: none; }
a:hover { text-decoration: underline; }

input[type="number"], input[type="date"], select {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--slate-800);
  background: white;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  width: 100%;
  transition: border-color .15s, box-shadow .15s;
  outline: none;
  height: 36px;
}
input:focus, select:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(29,158,117,.12);
}
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--slate-200);
  outline: none;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--teal);
  border: 2px solid white;
  box-shadow: 0 0 0 1px var(--teal);
  cursor: pointer;
}
input[type="range"]:focus { box-shadow: none; }

button {
  font-family: var(--font-sans);
  cursor: pointer;
  border: none;
  outline: none;
  border-radius: var(--radius-sm);
  transition: all .15s;
}
button:focus-visible { box-shadow: 0 0 0 3px rgba(29,158,117,.3); }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--slate-300); border-radius: 3px; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* ── Mobile global fixes ──────────────────────────────────────────────── */
@media (max-width: 700px) {
  html { font-size: 15px; }

  /* Prevent iOS zoom on input focus (inputs must be >= 16px font) */
  input[type="number"],
  input[type="date"],
  input[type="text"],
  select {
    font-size: 16px !important;
  }

  /* Bigger touch targets on mobile */
  input[type="range"]::-webkit-slider-thumb {
    width: 22px;
    height: 22px;
  }
}
