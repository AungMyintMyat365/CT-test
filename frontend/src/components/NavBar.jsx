import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold ${
    isActive ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`;

const NavBar = () => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="text-lg font-extrabold text-slate-900" to="/dashboard">
          CIY.club Assessment System
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink className={linkClass} to="/dashboard">
            Dashboard
          </NavLink>
          <NavLink className={linkClass} to="/students">
            Students
          </NavLink>
          <NavLink className={linkClass} to="/due-board">
            Due Board
          </NavLink>
          <NavLink className={linkClass} to="/sync-queue">
            Sync Queue
          </NavLink>
          {isAdmin && (
            <NavLink className={linkClass} to="/rules">
              Rules
            </NavLink>
          )}
          {isAdmin && (
            <NavLink className={linkClass} to="/settings">
              Settings
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-slate-500">{user?.role}</p>
            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
          </div>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
