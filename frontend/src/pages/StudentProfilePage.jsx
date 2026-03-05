import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AssessmentTimeline from '../components/AssessmentTimeline';
import StudentProfile from '../components/StudentProfile';
import { getStudentById } from '../services/studentService';

const StudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');

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
        <button
          className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-600"
          onClick={() => navigate(`/students/${student.id}/mark`)}
          type="button"
        >
          Enter Marks
        </button>
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
