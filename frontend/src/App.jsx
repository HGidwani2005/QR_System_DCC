import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import AdminDashboard from './pages/AdminDashboard';
import GenerateQRPage from './pages/GenerateQRPage';
import CheckInPage from './pages/CheckInPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StudentDashboard from './pages/StudentDashboard';

function AppRoutes() {
  const { user, profile, loading, isAdmin, profileComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium font-display">Loading Dean Career Cloud...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Routes>
        <Route path="/checkin" element={<CheckInPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // Logged in but profile not complete
  if (!profileComplete) {
    return (
      <Routes>
        <Route path="/setup" element={<ProfileSetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Admin-only routes */}
      {isAdmin && (
        <>
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/generate-qr" element={<GenerateQRPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </>
      )}

      {/* Student routes */}
      {!isAdmin && (
        <>
          <Route path="/my-attendance" element={<StudentDashboard />} />
          <Route path="/" element={<Navigate to="/my-attendance" replace />} />
        </>
      )}

      {/* Shared */}
      <Route path="/checkin" element={<CheckInPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'font-display text-sm',
            style: { borderRadius: '0.75rem', fontFamily: 'Lexend, sans-serif' },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
