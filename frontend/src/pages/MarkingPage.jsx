import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MarkingForm from '../components/MarkingForm';
import ProfessionalMarkingForm from '../components/ProfessionalMarkingForm';
import { useAuth } from '../context/AuthContext';
import { submitMark } from '../services/markService';
import { getStudentForMarking } from '../services/studentService';
import { getProfessionalTemplates, submitProfessionalMark } from '../services/professionalService';

const guessTemplateKey = (streamline = '') => {
  const s = streamline.toLowerCase();
  if (s.includes('scratch')) return 'scratch';
  if (s.includes('python')) return 'python';
  if (s.includes('javascript')) return 'javascript';
  if (s.includes('app lab') || s.includes('applab')) return 'app-lab';
  if (s.includes('electronics')) return 'electronics';
  if (s.includes('game')) return 'game-creation';
  if (s.includes('html') || s.includes('css')) return 'html-css';
  if (s.includes('3d')) return '3d-design';
  return '';
};

const MarkingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateError, setTemplateError] = useState('');
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

  useEffect(() => {
    if (!student || student.next_assessment_type !== 'PROFESSIONAL') return;

    const loadTemplates = async () => {
      try {
        const data = await getProfessionalTemplates();
        setTemplates(data || []);
      } catch (err) {
        setTemplateError(err.response?.data?.message || 'Failed to load professional templates.');
      }
    };

    loadTemplates();
  }, [student]);

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

  const handleProfessionalSubmit = async (payload) => {
    if (!student) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const result = await submitProfessionalMark({
        ...payload,
        student_id: student.id,
      });

      if (result?.sheet_sync_status === 'FAILED') {
        setSuccess('Professional marks saved. Google Sheets sync failed — try again later.');
      } else {
        setSuccess('Professional marks submitted and synced to Google Sheets.');
      }
      setTimeout(() => navigate(`/students/${student.id}`), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit professional marks.');
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

      {student.next_assessment_type === 'PROFESSIONAL' ? (
        <>
          {templateError && (
            <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{templateError}</p>
          )}
          <ProfessionalMarkingForm
            coachName={user?.name || student.coach}
            defaultTemplateKey={guessTemplateKey(student.streamline)}
            onSubmit={handleProfessionalSubmit}
            submitting={submitting}
            templates={templates}
          />
        </>
      ) : (
        <MarkingForm
          coachName={user?.name || student.coach}
          defaultAssessmentType={student.next_assessment_type}
          onSubmit={handleSubmit}
          student={student}
          submitting={submitting}
        />
      )}
    </main>
  );
};

export default MarkingPage;
