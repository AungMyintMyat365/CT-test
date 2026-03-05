import { useMemo, useState } from 'react';

const scoreFields = [
  { key: 'sequencing_debugging_score', label: 'Sequencing & Debugging' },
  { key: 'decomposition_score', label: 'Decomposition' },
  { key: 'abstraction_score', label: 'Abstraction' },
  { key: 'pattern_recognition_score', label: 'Pattern Recognition' },
];

const parseStudentDisplayName = (name = '') => {
  const match = name.match(/^([A-Za-z]{3}\d+)\s*[-|]\s*(.+)$/);
  if (!match) {
    return {
      coderId: '',
      candidate: name || '',
    };
  }

  return {
    coderId: match[1].trim(),
    candidate: match[2].trim(),
  };
};

const MarkingForm = ({ defaultAssessmentType, coachName, student, onSubmit, submitting }) => {
  const parsedName = parseStudentDisplayName(student?.name || '');
  const [form, setForm] = useState({
    assessment_type: defaultAssessmentType || 'INITIAL_CT',
    date: new Date().toISOString().slice(0, 10),
    assessor: coachName || '',
    coder_id: parsedName.coderId,
    campus_code: '',
    candidate: parsedName.candidate,
    age: '',
    email: student?.coach_email || '',
    level: student?.streamline || '',
    sequencing_debugging_score: 0,
    decomposition_score: 0,
    abstraction_score: 0,
    pattern_recognition_score: 0,
    send_report: 'FALSE',
    status: 'UNSEND',
  });

  const totalScore = useMemo(
    () =>
      Number(form.sequencing_debugging_score) +
      Number(form.decomposition_score) +
      Number(form.abstraction_score) +
      Number(form.pattern_recognition_score),
    [
      form.abstraction_score,
      form.decomposition_score,
      form.pattern_recognition_score,
      form.sequencing_debugging_score,
    ],
  );
  const tpScore = useMemo(() => Number(((totalScore / 59) * 100).toFixed(2)), [totalScore]);

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      ...form,
      coder_id: form.coder_id || undefined,
      campus_code: form.campus_code || undefined,
      candidate: form.candidate || undefined,
      age: form.age ? Number(form.age) : undefined,
      email: form.email || undefined,
      level: form.level || undefined,
      sequencing_debugging_score: Number(form.sequencing_debugging_score),
      decomposition_score: Number(form.decomposition_score),
      abstraction_score: Number(form.abstraction_score),
      pattern_recognition_score: Number(form.pattern_recognition_score),
    });
  };

  return (
    <form className="space-y-4 rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200" onSubmit={handleSubmit}>
      <h2 className="text-lg font-bold text-slate-900">Enter Assessment Marks</h2>

      <input type="hidden" value={form.assessment_type} />

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="date">
          Date
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="date"
          onChange={(event) => updateField('date', event.target.value)}
          required
          type="date"
          value={form.date}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="assessor">
          Assessor
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="assessor"
          onChange={(event) => updateField('assessor', event.target.value)}
          required
          type="text"
          value={form.assessor}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="coder_id">
          Coder ID
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="coder_id"
          onChange={(event) => updateField('coder_id', event.target.value)}
          required
          type="text"
          value={form.coder_id}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="campus_code">
          Campus code
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="campus_code"
          onChange={(event) => updateField('campus_code', event.target.value)}
          type="text"
          value={form.campus_code}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="candidate">
          Candidate
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="candidate"
          onChange={(event) => updateField('candidate', event.target.value)}
          required
          type="text"
          value={form.candidate}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="age">
          Age
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="age"
          max={99}
          min={0}
          onChange={(event) => updateField('age', event.target.value)}
          type="number"
          value={form.age}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="email"
          onChange={(event) => updateField('email', event.target.value)}
          type="email"
          value={form.email}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="level">
          Level
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="level"
          onChange={(event) => updateField('level', event.target.value)}
          type="text"
          value={form.level}
        />
      </div>

      {scoreFields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-semibold text-slate-700" htmlFor={field.key}>
            {field.label}
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            id={field.key}
            max={59}
            min={0}
            onChange={(event) => updateField(field.key, event.target.value)}
            required
            type="number"
            value={form[field.key]}
          />
        </div>
      ))}

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="total_score">
          Total
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="total_score"
          readOnly
          type="number"
          value={totalScore}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="tp_score">
          TP
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="tp_score"
          readOnly
          type="number"
          value={tpScore}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="send_report">
          Send Report
        </label>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="send_report"
          onChange={(event) => updateField('send_report', event.target.value)}
          value={form.send_report}
        >
          <option value="FALSE">FALSE</option>
          <option value="TRUE">TRUE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="status">
          Status
        </label>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          id="status"
          onChange={(event) => updateField('status', event.target.value)}
          value={form.status}
        >
          <option value="UNSEND">UNSEND</option>
          <option value="SEND">SEND</option>
        </select>
      </div>

      <button
        className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Submitting...' : 'Submit Marks'}
      </button>
    </form>
  );
};

export default MarkingForm;
