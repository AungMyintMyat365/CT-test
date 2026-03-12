/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';

const buildDefaultScores = (items) =>
  items.reduce((acc, item) => {
    acc[item.id] = 0;
    return acc;
  }, {});

const ProfessionalMarkingForm = ({
  templates,
  defaultTemplateKey,
  coachName,
  student,
  onSubmit,
  submitting,
}) => {
  const [templateKey, setTemplateKey] = useState(defaultTemplateKey || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [assessor, setAssessor] = useState(coachName || '');
  const [candidateName, setCandidateName] = useState(student?.name || '');
  const [age, setAge] = useState('');
  const [streamline, setStreamline] = useState(student?.streamline || '');
  const [level, setLevel] = useState(student?.streamline || '');
  const [centerCode, setCenterCode] = useState('');
  const activeTemplate = useMemo(
    () => templates.find((template) => template.key === templateKey) || templates[0],
    [templateKey, templates],
  );

  const [scores, setScores] = useState(() => buildDefaultScores(activeTemplate?.items || []));

  useEffect(() => {
    if (!activeTemplate) return;
    setScores(buildDefaultScores(activeTemplate.items || []));
  }, [activeTemplate]);

  const total = useMemo(() => {
    if (!activeTemplate) return 0;
    return activeTemplate.items.reduce((sum, item) => sum + Number(scores[item.id] || 0), 0);
  }, [activeTemplate, scores]);

  const percentage = useMemo(() => {
    if (!activeTemplate?.maxScore) return 0;
    return Number(((total / activeTemplate.maxScore) * 100).toFixed(2));
  }, [activeTemplate, total]);

  const result = useMemo(() => {
    if (!activeTemplate) return 'NOT_MET';
    return total >= Number(activeTemplate.passingScore || 0) ? 'MET' : 'NOT_MET';
  }, [activeTemplate, total]);

  if (!activeTemplate) {
    return <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">No templates available.</p>;
  }

  return (
    <form
      className="space-y-4 rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          template_key: activeTemplate.key,
          scores,
          assessor,
          date,
          candidate_name: candidateName,
          age: age ? Number(age) : undefined,
          streamline,
          level,
          center_code: centerCode,
        });
      }}
    >
      <h2 className="text-lg font-bold text-slate-900">Professional Assessment</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-date">
            Date
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-date"
            onChange={(event) => setDate(event.target.value)}
            required
            type="date"
            value={date}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-assessor">
            Assessor
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-assessor"
            onChange={(event) => setAssessor(event.target.value)}
            required
            type="text"
            value={assessor}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-candidate">
            Candidate (Coder Name)
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-candidate"
            onChange={(event) => setCandidateName(event.target.value)}
            required
            type="text"
            value={candidateName}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-age">
            Age
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-age"
            onChange={(event) => setAge(event.target.value)}
            type="number"
            min={0}
            max={120}
            value={age}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-streamline">
            Streamline
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-streamline"
            onChange={(event) => setStreamline(event.target.value)}
            type="text"
            value={streamline}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-level">
            Level
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-level"
            onChange={(event) => setLevel(event.target.value)}
            type="text"
            value={level}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-center">
            Center Code
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-center"
            onChange={(event) => setCenterCode(event.target.value)}
            type="text"
            value={centerCode}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="professional-template">
            Assessment Template
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id="professional-template"
            onChange={(event) => setTemplateKey(event.target.value)}
            value={activeTemplate.key}
          >
            {templates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {activeTemplate.items.map((item) => (
          <div className="flex flex-wrap items-center justify-between gap-2" key={item.id}>
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-500">Max: {item.max}</p>
            </div>
            <input
              className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right"
              max={item.max}
              min={0}
              onChange={(event) =>
                setScores((prev) => ({
                  ...prev,
                  [item.id]: Number(event.target.value),
                }))
              }
              required
              type="number"
              value={scores[item.id] ?? 0}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase text-slate-500">Total</p>
          <p className="text-lg font-bold text-slate-900">
            {total} / {activeTemplate.maxScore}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase text-slate-500">Percentage</p>
          <p className="text-lg font-bold text-slate-900">{percentage}%</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase text-slate-500">Result</p>
          <p className={`text-lg font-bold ${result === 'MET' ? 'text-emerald-700' : 'text-red-700'}`}>
            {result}
          </p>
        </div>
      </div>

      <button
        className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Submitting...' : 'Submit Professional Marks'}
      </button>
    </form>
  );
};

export default ProfessionalMarkingForm;
