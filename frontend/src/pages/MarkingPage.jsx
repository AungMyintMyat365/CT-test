import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarkingForm from '../components/MarkingForm';
import { useAuth } from '../context/AuthContext';
import { submitMark } from '../services/markService';
import { getStudentForMarking } from '../services/studentService';

const MarkingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getStudentForMarking(id);
        setStudent(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load student.');
      }
    };

    run();
  }, [id]);

  const handleSubmit = async (payload) => {
    if (!student) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const result = await submitMark({
        ...payload,
        student_id: student.id,
      });

      if (result?.queued_retry) {
        setSuccess('Marks saved. Google Sheets sync queued — check Sync Queue if needed.');
      } else {
        setSuccess('Marks submitted and synced to Google Sheets.');
      }
      setTimeout(() => navigate(`/students/${student.id}`), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit marks.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) {
    return <p className="m-4 rounded-xl bg-slate-100 p-4 font-semibold text-slate-600">Loading student...</p>;
  }

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Marking</p>
        <h1 className="text-2xl font-extrabold text-slate-900">{student.name}</h1>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-700">{success}</p>}

      <MarkingForm
        coachName={user?.name || student.coach}
        defaultAssessmentType={student.next_assessment_type}
        onSubmit={handleSubmit}
        student={student}
        submitting={submitting}
      />
    </main>
  );
};

export default MarkingPage;
