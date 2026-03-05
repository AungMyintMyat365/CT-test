import { format } from 'date-fns';

const getStatusClass = (status) => {
  if (status === 'DUE') return 'bg-red-100 text-red-700';
  if (status === 'UPCOMING') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const StudentTable = ({ students, onOpenProfile, onOpenMarking }) => (
  <div className="overflow-x-auto rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
        <tr>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Streamline</th>
          <th className="px-4 py-3">Coach</th>
          <th className="px-4 py-3">Next Assessment</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {students.length === 0 ? (
          <tr>
            <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
              No students found.
            </td>
          </tr>
        ) : (
          students.map((student) => (
            <tr className="border-t border-slate-100" key={student.id}>
              <td className="px-4 py-3 font-semibold text-slate-800">{student.name}</td>
              <td className="px-4 py-3 text-slate-700">{student.streamline}</td>
              <td className="px-4 py-3 text-slate-700">{student.coach}</td>
              <td className="px-4 py-3 text-slate-700">
                {student.next_assessment_date
                  ? format(new Date(student.next_assessment_date), 'dd MMM yyyy')
                  : '-'}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(student.status)}`}>
                  {student.status || 'UNKNOWN'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                    onClick={() => onOpenProfile(student.id)}
                    type="button"
                  >
                    Profile
                  </button>
                  <button
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600"
                    onClick={() => onOpenMarking(student.id)}
                    type="button"
                  >
                    Mark
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default StudentTable;
