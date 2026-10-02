import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import Layout, { type Page } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import NewPatient from '@/pages/NewPatient';
import PatientList from '@/pages/PatientList';
import PatientDetail from '@/pages/PatientDetail';

type View = { page: Page } | { page: 'patient-detail'; patientId: string };

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>({ page: 'dashboard' });

  // Reset to dashboard when user changes
  useEffect(() => {
    if (user) setView({ page: 'dashboard' });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="inline-block w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  function navigate(page: Page) {
    setView({ page });
  }

  function selectPatient(id: string) {
    setView({ page: 'patient-detail', patientId: id });
  }

  const currentNav: Page = view.page === 'patient-detail' ? 'patient-list' : view.page;

  let content: React.ReactNode;
  if (view.page === 'dashboard') {
    content = <Dashboard onSelectPatient={selectPatient} onNavigate={navigate} />;
  } else if (view.page === 'new-patient') {
    content = <NewPatient onCreated={(id) => selectPatient(id)} />;
  } else if (view.page === 'patient-list') {
    content = <PatientList onSelectPatient={selectPatient} onNavigate={navigate} />;
  } else if (view.page === 'patient-detail') {
    content = <PatientDetail patientId={view.patientId} onBack={() => navigate('patient-list')} onDeleted={() => navigate('dashboard')} />;
  }

  return (
    <Layout currentPage={currentNav} onNavigate={navigate}>
      {content}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
