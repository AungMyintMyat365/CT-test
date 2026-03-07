import { useState } from 'react';
import { downloadReport } from '../services/reportService';

const triggerDownload = ({ blob, filename }) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ReportsPage = () => {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const onDownload = async (type) => {
    try {
      setBusy(type);
      setError('');
      const file = await downloadReport(type);
      triggerDownload(file);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download report.');
    } finally {
      setBusy('');
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Exports</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2">
        <button
          className="rounded-2xl bg-white/90 p-6 text-left shadow-sm ring-1 ring-slate-200"
          onClick={() => onDownload('students')}
          type="button"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">CSV</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {busy === 'students' ? 'Downloading...' : 'Download Students Report'}
          </h2>
        </button>

        <button
          className="rounded-2xl bg-white/90 p-6 text-left shadow-sm ring-1 ring-slate-200"
          onClick={() => onDownload('assessments')}
          type="button"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">CSV</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {busy === 'assessments' ? 'Downloading...' : 'Download Assessments Report'}
          </h2>
        </button>
      </section>
    </main>
  );
};

export default ReportsPage;
