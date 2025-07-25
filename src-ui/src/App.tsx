import { type ReactElement } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SetupPage from './pages/SetupPage';
import EncryptPage from './pages/EncryptPage';
import DecryptPage from './pages/DecryptPage';
import DemoLandingPage from './pages/DemoLandingPage';

// Demo Components
import FileSelectionDemo from './pages/FileSelectionDemo';
import KeyGenerationForm from './components/forms/KeyGenerationForm';
import { KeySelectionDropdown } from './components/forms/KeySelectionDropdown';
import PassphraseInput from './components/forms/PassphraseInput';
import ProgressBarDemo from './components/forms/ProgressBarDemo';
import ErrorMessageDemo from './components/forms/ErrorMessageDemo';
import SuccessMessageDemo from './components/forms/SuccessMessageDemo';
import LoadingSpinnerDemo from './components/forms/LoadingSpinnerDemo';
import KeyGenerationDemo from './components/forms/KeyGenerationDemo';
import FileEncryptionDemo from './components/forms/FileEncryptionDemo';
import FileDecryptionDemo from './components/forms/FileDecryptionDemo';
import ProgressTrackingDemo from './components/forms/ProgressTrackingDemo';

function App(): ReactElement {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/encrypt" element={<EncryptPage />} />
          <Route path="/decrypt" element={<DecryptPage />} />
          <Route path="/demo" element={<DemoLandingPage />} />

          {/* Demo Routes */}
          <Route path="/demo/file-selection-demo" element={<FileSelectionDemo />} />
          <Route path="/demo/key-generation-demo" element={<KeyGenerationForm />} />
          <Route path="/demo/key-selection-demo" element={<KeySelectionDropdown />} />
          <Route path="/demo/passphrase-input-demo" element={<PassphraseInput />} />
          <Route path="/demo/progress-bar-demo" element={<ProgressBarDemo />} />
          <Route path="/demo/error-message-demo" element={<ErrorMessageDemo />} />
          <Route path="/demo/success-message-demo" element={<SuccessMessageDemo />} />
          <Route path="/demo/loading-spinner-demo" element={<LoadingSpinnerDemo />} />
          <Route path="/demo/key-generation-hook-demo" element={<KeyGenerationDemo />} />
          <Route path="/demo/file-encryption-hook-demo" element={<FileEncryptionDemo />} />
          <Route path="/demo/file-decryption-hook-demo" element={<FileDecryptionDemo />} />
          <Route path="/demo/progress-tracking-hook-demo" element={<ProgressTrackingDemo />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
