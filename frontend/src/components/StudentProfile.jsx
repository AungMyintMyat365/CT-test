import { format } from 'date-fns';
import { assessmentLabels } from '../utils/assessmentLabels';

const StudentProfile = ({ student }) => (
  <section className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Student Name</p>
        <p className="text-xl font-bold text-slate-900">{student.name}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Streamline</p>
        <p className="text-xl font-bold text-slate-900">{student.streamline}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Coach</p>
        <p className="font-semibold text-slate-800">{student.coach}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Join Date</p>
        <p className="font-semibold text-slate-800">{format(new Date(student.join_date), 'dd MMM yyyy')}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Next Assessment</p>
        <p className="font-semibold text-slate-800">{assessmentLabels[student.next_assessment_type] || '-'}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Next Date</p>
        <p className="font-semibold text-slate-800">
          {student.next_assessment_date
            ? format(new Date(student.next_assessment_date), 'dd MMM yyyy')
            : '-'}
        </p>
      </div>
    </div>
  </section>
);

export default StudentProfile;
