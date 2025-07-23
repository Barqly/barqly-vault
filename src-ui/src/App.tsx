import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SetupPage from './pages/SetupPage';
import EncryptPage from './pages/EncryptPage';
import DecryptPage from './pages/DecryptPage';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/encrypt" element={<EncryptPage />} />
          <Route path="/decrypt" element={<DecryptPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
