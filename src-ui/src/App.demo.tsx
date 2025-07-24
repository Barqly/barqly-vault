import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SetupPage from './pages/SetupPage';
import EncryptPage from './pages/EncryptPage';
import DecryptPage from './pages/DecryptPage';

// Lazy load demo components
const DemoLandingPage = lazy(() => import('./pages/DemoLandingPage'));
const FileSelectionDemo = lazy(() => import('./pages/FileSelectionDemo'));
const SuccessMessageDemo = lazy(() => import('./components/forms/SuccessMessageDemo'));
const ProgressBarDemo = lazy(() => import('./components/forms/ProgressBarDemo'));
const ErrorMessageDemo = lazy(() => import('./components/forms/ErrorMessageDemo'));
const LoadingSpinnerDemo = lazy(() => import('./components/forms/LoadingSpinnerDemo'));

function AppDemo(): ReactElement {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/encrypt" element={<EncryptPage />} />
          <Route path="/decrypt" element={<DecryptPage />} />

          {/* Demo Routes */}
          <Route
            path="/demo"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">Loading demo...</div>
                }
              >
                <DemoLandingPage />
              </Suspense>
            }
          />
          <Route
            path="/demo/file-selection-demo"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">Loading demo...</div>
                }
              >
                <FileSelectionDemo />
              </Suspense>
            }
          />
          <Route
            path="/demo/success-message-demo"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">Loading demo...</div>
                }
              >
                <SuccessMessageDemo />
              </Suspense>
            }
          />
          <Route
            path="/demo/progress-bar-demo"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">Loading demo...</div>
                }
              >
                <ProgressBarDemo />
              </Suspense>
            }
          />
          <Route
            path="/demo/loading-spinner-demo"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">Loading demo...</div>
                }
              >
                <LoadingSpinnerDemo />
              </Suspense>
            }
          />
          <Route
            path="/demo/error-message-demo"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">Loading demo...</div>
                }
              >
                <ErrorMessageDemo />
              </Suspense>
            }
          />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default AppDemo;
