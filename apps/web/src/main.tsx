import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      if (name !== 'reported-cache-v5') {
        caches.delete(name);
      }
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      window.addEventListener('focus', () => {
        registration.update().catch(() => {});
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          registration.update().catch(() => {});
        }
      });
      setInterval(() => {
        registration.update().catch(() => {});
      }, 5 * 60 * 1000);
    }).catch(() => {});
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

