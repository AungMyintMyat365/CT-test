import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAssessmentRules, updateAssessmentRule } from '../services/assessmentRuleService';

const RulesPage = () => {
  const { isAdmin } = useAuth();
  const [rules, setRules] = useState([]);
  const [error, setError] = useState('');
  const [savingType, setSavingType] = useState('');

  const loadRules = async () => {
    try {
      const data = await getAssessmentRules();
      setRules(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rules.');
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const updateRule = async (assessmentType, patch) => {
    try {
      setSavingType(assessmentType);
      setError('');
      await updateAssessmentRule(assessmentType, patch);
      await loadRules();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update rule.');
    } finally {
      setSavingType('');
    }
  };

  if (!isAdmin) {
    return (
      <p className="m-4 rounded-xl bg-amber-50 p-4 font-semibold text-amber-700">
        Only admins can manage assessment rules.
      </p>
    );
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Admin</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Assessment Rules</h1>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      <section className="grid gap-4 lg:grid-cols-2">
        {rules.map((rule) => (
          <article className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200" key={rule.id}>
            <h2 className="text-lg font-bold text-slate-900">{rule.assessment_type}</h2>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`${rule.id}-months`}>
              Months Interval
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              defaultValue={rule.months_interval ?? ''}
              id={`${rule.id}-months`}
              onBlur={(event) => {
                const value = event.target.value.trim();
                updateRule(rule.assessment_type, {
                  months_interval: value === '' ? null : Number(value),
                });
              }}
              type="number"
            />

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`${rule.id}-notes`}>
              Notes
            </label>
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              defaultValue={rule.notes || ''}
              id={`${rule.id}-notes`}
              onBlur={(event) =>
                updateRule(rule.assessment_type, {
                  notes: event.target.value,
                })
              }
            />

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Status: {rule.is_active ? 'Active' : 'Inactive'}</p>
              <button
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                disabled={savingType === rule.assessment_type}
                onClick={() =>
                  updateRule(rule.assessment_type, {
                    is_active: !rule.is_active,
                  })
                }
                type="button"
              >
                {savingType === rule.assessment_type ? 'Saving...' : rule.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
};

export default RulesPage;
