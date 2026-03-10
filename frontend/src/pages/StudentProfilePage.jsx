import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AssessmentTimeline from '../components/AssessmentTimeline';
import StudentProfile from '../components/StudentProfile';
import { getStudentById, deleteStudent } from '../services/studentService';
import { useAuth } from '../context/AuthContext';

const StudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getStudentById(id);
        setStudent(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load student profile.');
      }
    };

    run();
  }, [id]);

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
      <AssessmentTimeline
        assessments={student.assessments || []}
        nextAssessmentDate={student.next_assessment_date}
        nextAssessmentType={student.next_assessment_type}
      />
    </main>
  );
};

export default StudentProfilePage;
