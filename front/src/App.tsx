import { Navigate, Outlet, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import TicketsPage from './pages/TicketsPage';
import TicketPage from './pages/TicketPage';

function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-cyan-400">HelpDesk Campus</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-400 sm:inline">{user?.name}</span>
            <button
              className="rounded-lg border border-slate-700 px-3 py-2 hover:border-cyan-400"
              onClick={async () => { await signOut(); navigate('/login'); }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8"><Outlet /></main>
    </div>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="py-20 text-center text-slate-400">Chargement...</div>;
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-950 py-20 text-center text-slate-400">Chargement...</div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Protected />}>
        <Route path="/" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}
