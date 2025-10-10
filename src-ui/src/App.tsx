import { type ReactElement, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { VaultProvider } from './contexts/VaultContext';
import { UIProvider } from './contexts/UIContext';

// Lazy load page components for better initial render performance
const VaultHub = lazy(() => import('./pages/VaultHub'));
const ManageKeysPage = lazy(() => import('./pages/ManageKeysPage'));
const EncryptPage = lazy(() => import('./pages/EncryptPage'));
const DecryptPage = lazy(() => import('./pages/DecryptPage'));
const YubiKeySetupPage = lazy(() => import('./pages/YubiKeySetupPage'));

function App(): ReactElement {
  return (
    <Router>
      <UIProvider>
        <VaultProvider>
          <Suspense fallback={<LoadingSpinner centered showText text="Loading page..." />}>
            <Routes>
              {/* Redirect root to Vault Hub (new default) */}
              <Route path="/" element={<Navigate to="/vault-hub" replace />} />

              {/* Main routes with updated paths */}
              <Route
                path="/vault-hub"
                element={
                  <MainLayout>
                    <VaultHub />
                  </MainLayout>
                }
              />
              <Route
                path="/keys"
                element={
                  <MainLayout>
                    <ManageKeysPage />
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
              <Route
                path="/yubikey-setup"
                element={
                  <MainLayout>
                    <YubiKeySetupPage />
                  </MainLayout>
                }
              />

              {/* Fallback for old routes */}
              <Route path="/manage-keys" element={<Navigate to="/keys" replace />} />
            </Routes>
          </Suspense>
        </VaultProvider>
      </UIProvider>
    </Router>
  );
}

export default App;