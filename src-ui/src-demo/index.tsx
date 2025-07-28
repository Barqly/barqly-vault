/**
 * Demo Application Bootstrap
 *
 * Entry point for the demo application
 * This file is only used when running demos in browser
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import DemoApp from './DemoApp';
import '../src/globals.css'; // Reuse production styles

// Only render if we're in a browser environment
if (typeof window !== 'undefined' && !(window as any).__TAURI__) {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

  root.render(
    <React.StrictMode>
      <DemoApp />
    </React.StrictMode>,
  );
} else {
  console.warn('Demo app should only run in browser environment');
}
