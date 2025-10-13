import { type ReactElement, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { VaultProvider, useVault } from './contexts/VaultContext';
import { UIProvider } from './contexts/UIContext';

// Lazy load page components for better initial render performance
const VaultHub = lazy(() => import('./pages/VaultHub'));
const ManageKeysPage = lazy(() => import('./pages/ManageKeysPage'));
const EncryptPage = lazy(() => import('./pages/EncryptPage'));
const DecryptPage = lazy(() => import('./pages/DecryptPage'));
const YubiKeySetupPage = lazy(() => import('./pages/YubiKeySetupPage'));

/**
 * Smart Landing - Determines initial route based on setup state
 * Guides users through proper sequence: Keys → Vaults → Encrypt
 */
function SmartLanding(): ReactElement {
  const navigate = useNavigate();
  const { vaults, keyCache } = useVault();

  useEffect(() => {
    // Calculate total keys across all vaults
    const totalKeys = Array.from(keyCache.values()).reduce((acc, keys) => acc + keys.length, 0);

    // Landing logic: Guide through setup sequence
    if (totalKeys === 0) {
      // No keys exist → Must create keys first
      navigate('/keys', { replace: true });
    } else if (vaults.length === 0) {
      // Has keys but no vaults → Must create vault
      navigate('/vault-hub', { replace: true });
    } else {
      // Setup complete → Ready to encrypt
      navigate('/encrypt', { replace: true });
    }
  }, []); // Run only once on mount

  return <LoadingSpinner centered showText text="Loading..." />;
}

function AppRoutes(): ReactElement {
  return (
    <Suspense fallback={<LoadingSpinner centered showText text="Loading page..." />}>
      <Routes>
        {/* Smart landing - determines initial route */}
        <Route path="/" element={<SmartLanding />} />

        {/* Main routes - New order: Encrypt, Decrypt, Vault Hub, Manage Keys */}
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
  );
}

function App(): ReactElement {
  return (
    <Router>
      <UIProvider>
        <VaultProvider>
          <AppRoutes />
        </VaultProvider>
      </UIProvider>
    </Router>
  );
}

export default App;
