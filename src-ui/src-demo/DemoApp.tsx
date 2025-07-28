/**
 * Demo Application Entry Point
 *
 * Separate demo app for showcasing components and features
 * This is completely isolated from the production desktop app
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DemoLandingPage from './pages/DemoLandingPage';
import FileSelectionDemo from './pages/FileSelectionDemo';
import KeyGenerationDemo from './components/KeyGenerationDemo';
import FileEncryptionDemo from './components/FileEncryptionDemo';
import FileDecryptionDemo from './components/FileDecryptionDemo';
import ProgressTrackingDemo from './components/ProgressTrackingDemo';
import PassphraseInputDemo from './components/PassphraseInputDemo';
import ErrorMessageDemo from './components/ErrorMessageDemo';
import SuccessMessageDemo from './components/SuccessMessageDemo';
import LoadingSpinnerDemo from './components/LoadingSpinnerDemo';
import ProgressBarDemo from './components/ProgressBarDemo';

const DemoApp: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          <Route path="/demo" element={<DemoLandingPage />} />
          <Route path="/demo/file-selection" element={<FileSelectionDemo />} />
          <Route path="/demo/key-generation" element={<KeyGenerationDemo />} />
          <Route path="/demo/file-encryption" element={<FileEncryptionDemo />} />
          <Route path="/demo/file-decryption" element={<FileDecryptionDemo />} />
          <Route path="/demo/progress-tracking" element={<ProgressTrackingDemo />} />
          <Route path="/demo/passphrase-input" element={<PassphraseInputDemo />} />
          <Route path="/demo/error-message" element={<ErrorMessageDemo />} />
          <Route path="/demo/success-message" element={<SuccessMessageDemo />} />
          <Route path="/demo/loading-spinner" element={<LoadingSpinnerDemo />} />
          <Route path="/demo/progress-bar" element={<ProgressBarDemo />} />
        </Routes>
      </div>
    </Router>
  );
};

export default DemoApp;
