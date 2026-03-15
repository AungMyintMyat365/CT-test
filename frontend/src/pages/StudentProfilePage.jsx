import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AssessmentTimeline from '../components/AssessmentTimeline';
import StudentProfile from '../components/StudentProfile';
import { getStudentById, deleteStudent, updateStudent } from '../services/studentService';
import { useAuth } from '../context/AuthContext';
import { updateMark } from '../services/markService';
import { assessmentLabels } from '../utils/assessmentLabels';

const getScoreValue = (mark, primary, fallback) =>
  Number(mark?.[primary] ?? mark?.[fallback] ?? 0);

const StudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [updatingProfessional, setUpdatingProfessional] = useState(false);
  const [professionalDate, setProfessionalDate] = useState('');
  const [editingMarkId, setEditingMarkId] = useState('');
  const [markForm, setMarkForm] = useState(null);
  const [savingMark, setSavingMark] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getStudentById(id);
        setStudent(data);
        setProfessionalDate(data.professional_level_completed_at || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load student profile.');
      }
    };

    run();
  }, [id]);

  const startEditMark = (mark) => {
    setEditingMarkId(mark.id);
    setMarkForm({
      sequencing_debugging_score: getScoreValue(mark, 'sequencing_debugging_score', 'logic_score'),
      decomposition_score: getScoreValue(mark, 'decomposition_score', 'algorithm_score'),
      abstraction_score: getScoreValue(mark, 'abstraction_score', 'problem_score'),
      pattern_recognition_score: getScoreValue(mark, 'pattern_recognition_score', 'pattern_score'),
    });
  };

  const cancelEditMark = () => {
    setEditingMarkId('');
    setMarkForm(null);
  };

  const saveEditMark = async (markId) => {
    if (!markForm) return;
    try {
      setSavingMark(true);
      setError('');
      await updateMark(markId, {
        ...markForm,
        assessor: user?.name || student?.coach,
      });
      const refreshed = await getStudentById(id);
      setStudent(refreshed);
      cancelEditMark();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update mark.');
    } finally {
      setSavingMark(false);
    }
  };

  const onUpdateProfessional = async () => {
    if (!student) return;
    try {
      setUpdatingProfessional(true);
      setError('');
      const updated = await updateStudent(student.id, {
        professional_level_completed_at: professionalDate || null,
      });
      setStudent(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update professional completion.');
    } finally {
      setUpdatingProfessional(false);
    }
  };

  const onDelete = async () => {
    if (!student) return;
    const confirmed = window.confirm(
      `Delete ${student.name}? This will remove all assessments and marks for this student.`,
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError('');
      await deleteStudent(student.id);
      navigate('/students');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  };

  if (error) {
    return <p className="m-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>;
  }

  if (!student) {
    return <p className="m-4 rounded-xl bg-slate-100 p-4 font-semibold text-slate-600">Loading profile...</p>;
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Student</p>
          <h1 className="text-2xl font-extrabold text-slate-900">{student.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-600"
            onClick={() => navigate(`/students/${student.id}/mark`)}
            type="button"
          >
            Enter Marks
          </button>
          {isAdmin && (
            <button
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deleting}
              onClick={onDelete}
              type="button"
            >
              {deleting ? 'Deleting...' : 'Delete Student'}
            </button>
          )}
        </div>
      </header>

      <StudentProfile student={student} />
      {isAdmin && (
        <section className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Professional Completion</h2>
          <p className="mt-1 text-sm text-slate-600">
            Set this date to make the next assessment type PROFESSIONAL.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) => setProfessionalDate(event.target.value)}
              type="date"
              value={professionalDate}
            />
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={updatingProfessional}
              onClick={onUpdateProfessional}
              type="button"
            >
              {updatingProfessional ? 'Saving...' : 'Save'}
            </button>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => setProfessionalDate('')}
              type="button"
            >
              Clear
            </button>
          </div>
        </section>
      )}
      <AssessmentTimeline
        assessments={student.assessments || []}
        nextAssessmentDate={student.next_assessment_date}
        nextAssessmentType={student.next_assessment_type}
      />

      <section className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Marks</h2>
        {student.marks?.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Seq & Debug</th>
                  <th className="px-3 py-2">Decomposition</th>
                  <th className="px-3 py-2">Abstraction</th>
                  <th className="px-3 py-2">Pattern</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">TP</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {student.marks.map((mark) => {
                  const seq = getScoreValue(mark, 'sequencing_debugging_score', 'logic_score');
                  const dec = getScoreValue(mark, 'decomposition_score', 'algorithm_score');
                  const abs = getScoreValue(mark, 'abstraction_score', 'problem_score');
                  const pat = getScoreValue(mark, 'pattern_recognition_score', 'pattern_score');
                  const total = Number(mark.total_score ?? seq + dec + abs + pat);
                  const tp = Number(mark.tp_score ?? ((total / 59) * 100).toFixed(2));
                  const isEditing = editingMarkId === mark.id;

                  return (
                    <tr className="border-t border-slate-100" key={mark.id}>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {assessmentLabels[mark.assessment_type] || mark.assessment_type}
                      </td>
                      {isEditing ? (
                        <>
                          <td className="px-3 py-2">
                            <input
                              className="w-20 rounded border border-slate-300 px-2 py-1"
                              max={59}
                              min={0}
                              onChange={(event) =>
                                setMarkForm((prev) => ({
                                  ...prev,
                                  sequencing_debugging_score: Number(event.target.value),
                                }))
                              }
                              type="number"
                              value={markForm?.sequencing_debugging_score ?? 0}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="w-20 rounded border border-slate-300 px-2 py-1"
                              max={59}
                              min={0}
                              onChange={(event) =>
                                setMarkForm((prev) => ({
                                  ...prev,
                                  decomposition_score: Number(event.target.value),
                                }))
                              }
                              type="number"
                              value={markForm?.decomposition_score ?? 0}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="w-20 rounded border border-slate-300 px-2 py-1"
                              max={59}
                              min={0}
                              onChange={(event) =>
                                setMarkForm((prev) => ({
                                  ...prev,
                                  abstraction_score: Number(event.target.value),
                                }))
                              }
                              type="number"
                              value={markForm?.abstraction_score ?? 0}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="w-20 rounded border border-slate-300 px-2 py-1"
                              max={59}
                              min={0}
                              onChange={(event) =>
                                setMarkForm((prev) => ({
                                  ...prev,
                                  pattern_recognition_score: Number(event.target.value),
                                }))
                              }
                              type="number"
                              value={markForm?.pattern_recognition_score ?? 0}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-slate-700">{seq}</td>
                          <td className="px-3 py-2 text-slate-700">{dec}</td>
                          <td className="px-3 py-2 text-slate-700">{abs}</td>
                          <td className="px-3 py-2 text-slate-700">{pat}</td>
                        </>
                      )}
                      <td className="px-3 py-2 text-slate-700">{total}</td>
                      <td className="px-3 py-2 text-slate-700">{tp}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                              disabled={savingMark}
                              onClick={() => saveEditMark(mark.id)}
                              type="button"
                            >
                              {savingMark ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                              onClick={cancelEditMark}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                            onClick={() => startEditMark(mark)}
                            type="button"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No marks recorded yet.</p>
        )}
      </section>
    </main>
  );
};

export default StudentProfilePage;
