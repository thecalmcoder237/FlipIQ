
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DealInputForm from '@/pages/DealInputForm';
import DealAnalysisPage from '@/pages/DealAnalysisPage';
import PDFReportPage from '@/pages/PDFReportPage';
import DealHistory from '@/pages/DealHistory';
import DealComparison from '@/pages/DealComparison';
import PortfolioDashboard from '@/pages/PortfolioDashboard';
import LoanProposalGenerator from '@/pages/LoanProposalGenerator';
import DealActionHub from '@/pages/DealActionHub';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans selection:bg-blue-200">
          <Navbar />
          <main className="flex-1 pt-20">
            <Routes>
              <Route path="/" element={<Navigate to="/portfolio-dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              
              <Route path="/deal-input" element={<ProtectedRoute><DealInputForm /></ProtectedRoute>} />
              <Route path="/deal-analysis" element={<ProtectedRoute><DealAnalysisPage /></ProtectedRoute>} />
              <Route path="/report" element={<ProtectedRoute><PDFReportPage /></ProtectedRoute>} />
              <Route path="/deal-history" element={<ProtectedRoute><DealHistory /></ProtectedRoute>} />
              <Route path="/deal-comparison" element={<ProtectedRoute><DealComparison /></ProtectedRoute>} />
              <Route path="/portfolio-dashboard" element={<ProtectedRoute><PortfolioDashboard /></ProtectedRoute>} />
              <Route path="/loan-proposal" element={<ProtectedRoute><LoanProposalGenerator /></ProtectedRoute>} />
              <Route path="/deal/action" element={<ProtectedRoute><DealActionHub /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
