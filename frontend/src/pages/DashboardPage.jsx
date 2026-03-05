import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Legend,
} from 'recharts';
import DashboardCards from '../components/DashboardCards';
import { getAssessments } from '../services/assessmentService';
import { getDashboardStats } from '../services/studentService';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    dueAssessments: 0,
    completedAssessments: 0,
    upcomingAssessments: 0,
  });
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const [statsRes, assessmentsRes] = await Promise.all([getDashboardStats(), getAssessments()]);
        setStats(statsRes);
        setAssessments(assessmentsRes);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      }
    };

    run();
  }, []);

  const averageByType = useMemo(() => {
    const grouped = assessments.reduce((acc, item) => {
      if (!acc[item.assessment_type]) {
        acc[item.assessment_type] = { total: 0, count: 0 };
      }
      acc[item.assessment_type].total += item.score;
      acc[item.assessment_type].count += 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([type, data]) => ({
      type,
      average: Number((data.total / data.count).toFixed(1)),
    }));
  }, [assessments]);

  const coachPerformance = useMemo(() => {
    const grouped = assessments.reduce((acc, item) => {
      if (!acc[item.coach]) {
        acc[item.coach] = { total: 0, count: 0 };
      }
      acc[item.coach].total += item.score;
      acc[item.coach].count += 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([coach, data]) => ({
        coach,
        averageScore: Number((data.total / data.count).toFixed(1)),
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 8);
  }, [assessments]);

  if (error) {
    return <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Admin + Coach</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Assessment Dashboard</h1>
      </div>

      <DashboardCards stats={stats} />

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Average Assessment Scores</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={averageByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="average" fill="#0b7a75" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Coach Performance (Avg Score)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={coachPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="coach" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line dataKey="averageScore" name="Average Score" stroke="#e0901a" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </main>
  );
};

export default DashboardPage;
