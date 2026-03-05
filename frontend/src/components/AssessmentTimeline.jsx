import { format } from 'date-fns';
import { assessmentLabels } from '../utils/assessmentLabels';

const orderedTypes = ['INITIAL_CT', 'INITIAL_CT_SECOND', 'PROFESSIONAL', 'DEVELOPMENT_CT'];

const AssessmentTimeline = ({ assessments, nextAssessmentType, nextAssessmentDate }) => {
  const assessmentMap = assessments.reduce((acc, item) => {
    if (!acc[item.assessment_type]) acc[item.assessment_type] = [];
    acc[item.assessment_type].push(item);
    return acc;
  }, {});

  return (
    <section className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-bold text-slate-900">Assessment Timeline</h2>
      <div className="mt-4 space-y-4">
        {orderedTypes.map((type) => {
          const history = assessmentMap[type] || [];
          const latest = history.at(-1);
          const isNext = type === nextAssessmentType;

          return (
            <article className="rounded-xl border border-slate-200 bg-white p-4" key={type}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{assessmentLabels[type]}</h3>
                {latest ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Completed
                  </span>
                ) : isNext ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    Pending
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    Not Assigned
                  </span>
                )}
              </div>

              {latest ? (
                <p className="mt-2 text-sm text-slate-700">
                  Score: <b>{latest.score}</b> | Date: {format(new Date(latest.date), 'dd MMM yyyy')}
                </p>
              ) : isNext ? (
                <p className="mt-2 text-sm text-slate-700">
                  Next due: {nextAssessmentDate ? format(new Date(nextAssessmentDate), 'dd MMM yyyy') : '-'}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No record yet.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AssessmentTimeline;
