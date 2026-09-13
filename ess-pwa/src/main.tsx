import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { startSyncManager } from './services/syncManager';
import './index.css';

registerSW({ immediate: true });

// Starts listening for `online` events and background-flushes any
// jobs sitting in Dexie with status === 'pending_sync'.
startSyncManager();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
