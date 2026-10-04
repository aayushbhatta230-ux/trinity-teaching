import React from 'react';
import ReactDOM from 'react-dom/client';
// Only the Latin and Devanagari subsets are bundled, keeping the single-file build small.
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-700.css';
import './styles.css';
import App from './App.jsx';

// Kiosk hardening: no long-press context menu, no browser pinch-zoom of the whole UI.
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Installable app + offline support when served over http(s). Opening index.html straight from disk
// (file://) skips both, because Chrome does not allow manifests or service workers there.
if (/^https?:$/.test(window.location.protocol)) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = './manifest.webmanifest';
  document.head.appendChild(link);
}
if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
