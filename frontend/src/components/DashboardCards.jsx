const cardClasses = 'rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200';

const DashboardCards = ({ stats }) => {
  const items = [
    { title: 'Total Students', value: stats.totalStudents, tone: 'text-slate-800' },
    { title: 'Assessments Due', value: stats.dueAssessments, tone: 'text-red-600' },
    { title: 'Completed Assessments', value: stats.completedAssessments, tone: 'text-emerald-600' },
    { title: 'Upcoming (30 days)', value: stats.upcomingAssessments, tone: 'text-amber-600' },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article className={cardClasses} key={item.title}>
          <p className="text-sm font-semibold text-slate-500">{item.title}</p>
          <p className={`mt-2 text-3xl font-extrabold ${item.tone}`}>{item.value ?? 0}</p>
        </article>
      ))}
    </section>
  );
};

export default DashboardCards;
