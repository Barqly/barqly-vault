import { type ReactElement, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/loading-spinner';

// Lazy load page components for better initial render performance
const SetupPage = lazy(() => import('./pages/SetupPage'));
const EncryptPage = lazy(() => import('./pages/EncryptPage'));
const DecryptPage = lazy(() => import('./pages/DecryptPage'));

function App(): ReactElement {
  return (
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
  );
}

export default App;
