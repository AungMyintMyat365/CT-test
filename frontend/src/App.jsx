import { Navigate, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
import { useAuth } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import DueBoardPage from './pages/DueBoardPage';
import LoginPage from './pages/LoginPage';
import MarkingPage from './pages/MarkingPage';
import RulesPage from './pages/RulesPage';
import SettingsPage from './pages/SettingsPage';
import SyncQueuePage from './pages/SyncQueuePage';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentsPage from './pages/StudentsPage';

const FullPageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <p className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm">Loading...</p>
  </div>
);

const ProtectedShell = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate replace to="/login" />;

  return (
    <>
      <NavBar />
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </>
  );
};

const PublicOnly = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate replace to="/dashboard" />;

  return children;
};

const App = () => (
  <Routes>
    <Route
      element={
        <PublicOnly>
          <LoginPage />
        </PublicOnly>
      }
      path="/login"
    />

    <Route
      element={
        <ProtectedShell>
          <DashboardPage />
        </ProtectedShell>
      }
      path="/dashboard"
    />

    <Route
      element={
        <ProtectedShell>
          <StudentsPage />
        </ProtectedShell>
      }
      path="/students"
    />

    <Route
      element={
        <ProtectedShell>
          <DueBoardPage />
        </ProtectedShell>
      }
      path="/due-board"
    />

    <Route
      element={
        <ProtectedShell>
          <SyncQueuePage />
        </ProtectedShell>
      }
      path="/sync-queue"
    />

    <Route
      element={
        <ProtectedShell>
          <RulesPage />
        </ProtectedShell>
      }
      path="/rules"
    />

    <Route
      element={
        <ProtectedShell>
          <SettingsPage />
        </ProtectedShell>
      }
      path="/settings"
    />

    <Route
      element={
        <ProtectedShell>
          <StudentProfilePage />
        </ProtectedShell>
      }
      path="/students/:id"
    />

    <Route
      element={
        <ProtectedShell>
          <MarkingPage />
        </ProtectedShell>
      }
      path="/students/:id/mark"
    />

    <Route element={<Navigate replace to="/dashboard" />} path="*" />
  </Routes>
);

export default App;
