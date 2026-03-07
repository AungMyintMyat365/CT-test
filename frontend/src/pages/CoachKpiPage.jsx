import { useEffect, useState } from 'react';
import { getCoachKpi } from '../services/studentService';

const CoachKpiPage = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getCoachKpi();
        setRows(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load coach KPI.');
      }
    };

    run();
  }, []);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Performance</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Coach KPI</h1>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      <section className="overflow-x-auto rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Coach</th>
              <th className="px-4 py-3">Total Assessments</th>
              <th className="px-4 py-3">Avg Score</th>
              <th className="px-4 py-3">This Month</th>
              <th className="px-4 py-3">Active Students</th>
              <th className="px-4 py-3">Due Students</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No KPI data available.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr className="border-t border-slate-100" key={item.coach}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.coach}</td>
                  <td className="px-4 py-3 text-slate-700">{item.totalAssessments}</td>
                  <td className="px-4 py-3 text-slate-700">{item.avgScore}</td>
                  <td className="px-4 py-3 text-slate-700">{item.assessmentsThisMonth}</td>
                  <td className="px-4 py-3 text-slate-700">{item.activeStudents}</td>
                  <td className="px-4 py-3 text-slate-700">{item.dueStudents}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default CoachKpiPage;
