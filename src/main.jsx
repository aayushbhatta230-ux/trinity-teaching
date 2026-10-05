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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Windows app: confirm this version started, so the updater keeps it.
window.trinityDesktop?.appReady?.();
