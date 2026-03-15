import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGoogleSheetsSettings, updateGoogleSheetsSettings } from '../services/settingsService';

const SettingsPage = () => {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({
    spreadsheet_id: '',
    tab_ict_mdy: '',
    tab_dct_mdy: '',
    tab_professional: '',
    professional_sheet_mode: 'total_only',
  });
  const [stored, setStored] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getGoogleSheetsSettings();
      setStored(data.stored || {});
      const effective = data.effective || {};
      setForm({
        spreadsheet_id: effective.spreadsheet_id || '',
        tab_ict_mdy: effective.tab_ict_mdy || '',
        tab_dct_mdy: effective.tab_dct_mdy || '',
        tab_professional: effective.tab_professional || '',
        professional_sheet_mode: effective.professional_sheet_mode || 'total_only',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const updated = await updateGoogleSheetsSettings(form);
      setStored(updated.stored || {});
      setSuccess('Google Sheets settings updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <p className="m-4 rounded-xl bg-amber-50 p-4 font-semibold text-amber-700">
        Only admins can manage system settings.
      </p>
    );
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Admin</p>
        <h1 className="text-2xl font-extrabold text-slate-900">System Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Update Google Sheets settings here. These values override the backend environment variables.
        </p>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-700">{success}</p>}

      <section className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <p className="text-sm font-semibold text-slate-600">Loading settings...</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="sheet-id">
                Google Sheet ID
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                id="sheet-id"
                onChange={(event) => setForm((prev) => ({ ...prev, spreadsheet_id: event.target.value }))}
                placeholder="1H7SRPLzIeH44DKfoWBDGcefNIjSjKW2otZMVcUbRSo4"
                required
                type="text"
                value={form.spreadsheet_id}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="tab-ict">
                  ICT-MDY Tab
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  id="tab-ict"
                  onChange={(event) => setForm((prev) => ({ ...prev, tab_ict_mdy: event.target.value }))}
                  type="text"
                  value={form.tab_ict_mdy}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="tab-dct">
                  DCT-MDY Tab
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  id="tab-dct"
                  onChange={(event) => setForm((prev) => ({ ...prev, tab_dct_mdy: event.target.value }))}
                  type="text"
                  value={form.tab_dct_mdy}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  htmlFor="tab-professional"
                >
                  Professional Tab
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  id="tab-professional"
                  onChange={(event) => setForm((prev) => ({ ...prev, tab_professional: event.target.value }))}
                  type="text"
                  value={form.tab_professional}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                htmlFor="professional-mode"
              >
                Professional Sheet Mode
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                id="professional-mode"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, professional_sheet_mode: event.target.value }))
                }
                value={form.professional_sheet_mode}
              >
                <option value="total_only">Total Only</option>
                <option value="full">Full</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Status: {stored?.spreadsheet_id ? 'Using admin override' : 'Using environment defaults'}
              </p>
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={saving}
                type="submit"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
};

export default SettingsPage;
