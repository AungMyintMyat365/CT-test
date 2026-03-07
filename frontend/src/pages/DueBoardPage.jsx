import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentLabels } from '../utils/assessmentLabels';
import { getDueBoard } from '../services/studentService';

const SectionCard = ({ title, tone, students }) => (
  <section className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200">
    <header className="mb-3 flex items-center justify-between">
      <h2 className={`text-lg font-bold ${tone}`}>{title}</h2>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
        {students.length}
      </span>
    </header>

    <div className="space-y-2">
      {students.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No students.</p>
      ) : (
        students.map((student) => (
          <article className="rounded-lg border border-slate-200 p-3" key={student.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{student.name}</p>
                <p className="text-xs text-slate-500">
                  {student.streamline} | {student.coach}
                </p>
              </div>
              <Link
                className="rounded-md bg-teal-700 px-3 py-1 text-xs font-bold text-white hover:bg-teal-600"
                to={`/students/${student.id}/mark`}
              >
                Mark
              </Link>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {assessmentLabels[student.next_assessment_type] || student.next_assessment_type || 'Assessment'}
              {student.next_assessment_date
                ? ` • ${format(new Date(student.next_assessment_date), 'dd MMM yyyy')}`
                : ''}
            </p>
          </article>
        ))
      )}
    </div>
  </section>
);

const DueBoardPage = () => {
  const [data, setData] = useState({
    board: { overdue: [], dueThisWeek: [], upcoming: [], noDate: [] },
    totals: { overdue: 0, dueThisWeek: 0, upcoming: 0, noDate: 0 },
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const response = await getDueBoard();
        setData(response);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load due board.');
      }
    };

    run();
  }, []);

  if (error) {
    return <p className="m-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Assessments</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Due Board</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard students={data.board.overdue} title="Overdue" tone="text-red-700" />
        <SectionCard students={data.board.dueThisWeek} title="Due This Week" tone="text-amber-700" />
        <SectionCard students={data.board.upcoming} title="Upcoming" tone="text-emerald-700" />
        <SectionCard students={data.board.noDate} title="No Due Date" tone="text-slate-700" />
      </div>
    </main>
  );
};

export default DueBoardPage;
