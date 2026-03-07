import { useEffect, useState } from 'react';
import { getSyncFailures, retrySyncMark } from '../services/markService';

const SyncQueuePage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    try {
      const data = await getSyncFailures();
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sync queue.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const retry = async (markId) => {
    try {
      setBusyId(markId);
      setError('');
      await retrySyncMark(markId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Retry failed.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Operations</p>
          <h1 className="text-2xl font-extrabold text-slate-900">Google Sheet Sync Queue</h1>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={load}
          type="button"
        >
          Refresh
        </button>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      <section className="overflow-x-auto rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3">Next Retry</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No failed sync jobs.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr className="border-t border-slate-100" key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.student?.name || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.mark?.assessment_type || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.attempt_count}/{item.max_attempts}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-700">{item.last_error || item.mark?.sheet_sync_error}</td>
                  <td className="px-4 py-3 text-slate-700">{item.next_retry_at || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-teal-300"
                      disabled={busyId === item.mark_id}
                      onClick={() => retry(item.mark_id)}
                      type="button"
                    >
                      {busyId === item.mark_id ? 'Retrying...' : 'Retry Now'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default SyncQueuePage;
