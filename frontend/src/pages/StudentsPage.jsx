import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentTable from '../components/StudentTable';
import { useAuth } from '../context/AuthContext';
import { createStudent, getStudents } from '../services/studentService';

const initialStudentForm = {
  name: '',
  join_date: new Date().toISOString().slice(0, 10),
  latest_assessment_date: new Date().toISOString().slice(0, 10),
  latest_assessment_type: '',
  streamline: '',
  coach: '',
  coach_email: '',
  professional_level_completed_at: '',
};

const StudentsPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [filterStreamline, setFilterStreamline] = useState('');
  const [filterCoach, setFilterCoach] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialStudentForm);

  const loadStudents = async (params = {}, nextPage = pagination.page) => {
    try {
      const data = await getStudents({
        ...params,
        page: nextPage,
        pageSize: pagination.pageSize,
      });

      if (Array.isArray(data)) {
        setStudents(data);
        setPagination((prev) => ({
          ...prev,
          page: nextPage,
          total: data.length,
          totalPages: 1,
        }));
      } else {
        setStudents(data.items || []);
        setPagination(data.pagination || pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students.');
    }
  };

  useEffect(() => {
    loadStudents({}, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => {
    loadStudents(
      {
        search,
        streamline: filterStreamline || undefined,
        coach: filterCoach || undefined,
        status: filterStatus || undefined,
      },
      1,
    );
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    loadStudents(
      {
        search,
        streamline: filterStreamline || undefined,
        coach: filterCoach || undefined,
        status: filterStatus || undefined,
      },
      nextPage,
    );
  };

  const streamlineOptions = useMemo(
    () => [...new Set(students.map((student) => student.streamline).filter(Boolean))],
    [students],
  );

  const coachOptions = useMemo(
    () => [...new Set(students.map((student) => student.coach).filter(Boolean))],
    [students],
  );

  const onCreateStudent = async (event) => {
    event.preventDefault();
    try {
      setCreating(true);
      setError('');
      await createStudent({
        name: form.name,
        streamline: form.streamline,
        coach: form.coach,
        coach_email: form.coach_email,
        join_date: form.latest_assessment_type ? undefined : form.join_date,
        latest_assessment_type: form.latest_assessment_type || undefined,
        latest_assessment_date: form.latest_assessment_type ? form.latest_assessment_date : undefined,
        professional_level_completed_at: form.professional_level_completed_at || undefined,
      });
      setForm(initialStudentForm);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create student.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Students</p>
          <h1 className="text-2xl font-extrabold text-slate-900">Student List</h1>
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-5">
        <input
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name"
          value={search}
        />
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          onChange={(event) => setFilterStreamline(event.target.value)}
          value={filterStreamline}
        >
          <option value="">All streamlines</option>
          {streamlineOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          onChange={(event) => setFilterCoach(event.target.value)}
          value={filterCoach}
        >
          <option value="">All coaches</option>
          {coachOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          onChange={(event) => setFilterStatus(event.target.value)}
          value={filterStatus}
        >
          <option value="">All statuses</option>
          <option value="DUE">Due</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
        <button
          className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-600"
          onClick={handleFilter}
          type="button"
        >
          Apply Filters
        </button>
      </section>

      {error && <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

      <StudentTable
        onOpenMarking={(id) => navigate(`/students/${id}/mark`)}
        onOpenProfile={(id) => navigate(`/students/${id}`)}
        students={students}
      />

      <section className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-slate-700">
          Page {pagination.page} of {pagination.totalPages} | Total Students: {pagination.total}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Add Student</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onCreateStudent}>
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Student Name"
              required
              value={form.name}
            />
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) => setForm((prev) => ({ ...prev, streamline: event.target.value }))}
              placeholder="Streamline"
              required
              value={form.streamline}
            />
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) => setForm((prev) => ({ ...prev, coach: event.target.value }))}
              placeholder="Coach Name"
              required
              value={form.coach}
            />
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) => setForm((prev) => ({ ...prev, coach_email: event.target.value }))}
              placeholder="Coach Email"
              required
              type="email"
              value={form.coach_email}
            />
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) => setForm((prev) => ({ ...prev, latest_assessment_type: event.target.value }))}
              value={form.latest_assessment_type}
            >
              <option value="">No assessment yet (new student)</option>
              <option value="INITIAL_CT">Initial CT</option>
              <option value="INITIAL_CT_SECOND">Initial CT Second</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="DEVELOPMENT_CT">Development CT</option>
            </select>
            {form.latest_assessment_type ? (
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                onChange={(event) => setForm((prev) => ({ ...prev, latest_assessment_date: event.target.value }))}
                required
                type="date"
                value={form.latest_assessment_date}
              />
            ) : (
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                onChange={(event) => setForm((prev) => ({ ...prev, join_date: event.target.value }))}
                required
                type="date"
                value={form.join_date}
              />
            )}
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, professional_level_completed_at: event.target.value }))
              }
              placeholder="Professional completion date"
              type="date"
              value={form.professional_level_completed_at}
            />
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 md:col-span-2"
              disabled={creating}
              type="submit"
            >
              {creating ? 'Adding...' : 'Add Student'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
};

export default StudentsPage;
