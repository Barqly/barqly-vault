/**
 * Demo Application Entry Point
 *
 * Separate demo app for showcasing components and features
 * This is completely isolated from the production desktop app
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Redirect root to demos */}
          <Route path="/" element={<Navigate to="/demos" replace />} />

          {/* All demo routes under /demos */}
          <Route path="/demos" element={<DemoLandingPage />} />
          <Route path="/demos/file-selection" element={<FileSelectionDemo />} />
          <Route path="/demos/key-generation" element={<KeyGenerationDemo />} />
          <Route path="/demos/file-encryption" element={<FileEncryptionDemo />} />
          <Route path="/demos/file-decryption" element={<FileDecryptionDemo />} />
          <Route path="/demos/progress-tracking" element={<ProgressTrackingDemo />} />
          <Route path="/demos/passphrase-input" element={<PassphraseInputDemo />} />
          <Route path="/demos/error-message" element={<ErrorMessageDemo />} />
          <Route path="/demos/success-message" element={<SuccessMessageDemo />} />
          <Route path="/demos/loading-spinner" element={<LoadingSpinnerDemo />} />
          <Route path="/demos/progress-bar" element={<ProgressBarDemo />} />

          {/* Catch all - redirect to demos */}
          <Route path="*" element={<Navigate to="/demos" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default DemoApp;
