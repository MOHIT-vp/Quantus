import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import PipelinePage from './pages/PipelinePage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import TeamPage from './pages/TeamPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-ink-50 animate-pulse-slow">
          Initializing Quantus...
        </p>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, isManager } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isManager) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-ink-50 animate-pulse-slow">
          Initializing Quantus...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="team" element={<ManagerRoute><TeamPage /></ManagerRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
