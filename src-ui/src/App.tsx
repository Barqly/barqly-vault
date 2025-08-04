import { type ReactElement, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/loading-spinner';
import DebugConsole from './components/ui/DebugConsole';
import TauriDiagnostics from './components/ui/TauriDiagnostics';
import './lib/debug-tauri'; // Import for side effects in dev

// Lazy load page components for better initial render performance
const SetupPage = lazy(() => import('./pages/SetupPage'));
const EncryptPage = lazy(() => import('./pages/EncryptPage'));
const DecryptPage = lazy(() => import('./pages/DecryptPage'));

function App(): ReactElement {
  return (
    <>
      <Router>
        <Suspense fallback={<LoadingSpinner centered showText text="Loading page..." />}>
          <Routes>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route
              path="/setup"
              element={
                <MainLayout>
                  <SetupPage />
                </MainLayout>
              }
            />
            <Route
              path="/encrypt"
              element={
                <MainLayout>
                  <EncryptPage />
                </MainLayout>
              }
            />
            <Route
              path="/decrypt"
              element={
                <MainLayout>
                  <DecryptPage />
                </MainLayout>
              }
            />
          </Routes>
        </Suspense>
      </Router>

      {/* Debug Console - only shown in development */}
      <DebugConsole enabled={import.meta.env.DEV} />

      {/* Tauri Diagnostics - only shown in development */}
      <TauriDiagnostics />
    </>
  );
}

export default App;
