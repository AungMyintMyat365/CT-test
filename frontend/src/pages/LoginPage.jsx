import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
  });
  const { login, loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      await login(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      await loginAdmin(adminForm);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Coach Portal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">CIY.club Assessment System</h1>
        <p className="mt-3 text-sm text-slate-600">
          Login with Google for coaches, or use local admin credentials.
        </p>

        <div className="mt-6 flex justify-center">
          <GoogleLogin onError={() => setError('Google authentication popup failed.')} onSuccess={handleGoogleSuccess} />
        </div>

        <div className="my-6 h-px bg-slate-200" />

        <form className="space-y-3" onSubmit={handleAdminLogin}>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Admin Login</h2>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            onChange={(event) =>
              setAdminForm((prev) => ({
                ...prev,
                username: event.target.value,
              }))
            }
            placeholder="Username"
            required
            type="text"
            value={adminForm.username}
          />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            onChange={(event) =>
              setAdminForm((prev) => ({
                ...prev,
                password: event.target.value,
              }))
            }
            placeholder="Password"
            required
            type="password"
            value={adminForm.password}
          />
          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Signing in...' : 'Login as Admin'}
          </button>
        </form>

        {loading && <p className="mt-4 text-center text-sm text-slate-500">Signing in...</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
      </section>
    </main>
  );
};

export default LoginPage;
