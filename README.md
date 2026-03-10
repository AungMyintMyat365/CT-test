# CIY.club Assessment System

Production-ready full-stack School Assessment Management Web App for coding schools.

## Architecture

Web App (React) -> Backend API (Express) -> Database (Supabase Postgres) -> Google Sheets API

- The database drives system logic, permissions, and scheduling.
- Google Sheets stores official assessment marks (`ICT-MDY`, `DCT-MDY`, and optional `PROFESSIONAL-MDY`).

## Tech Stack

- Frontend: React + Vite + TailwindCSS
- Backend: Node.js + Express.js
- Database: PostgreSQL (Supabase)
- Auth: Google OAuth (coach/admin sign-in)
- Integration: Google Sheets API
- Hosting: Vercel (frontend), Render (backend), Supabase (database)

## Project Structure

```txt
assessment-system/
  frontend/
    src/
      components/
        AssessmentTimeline.jsx
        DashboardCards.jsx
        MarkingForm.jsx
        NavBar.jsx
        StudentProfile.jsx
        StudentTable.jsx
      context/
        AuthContext.jsx
      pages/
        CoachKpiPage.jsx
        DashboardPage.jsx
        DueBoardPage.jsx
        LoginPage.jsx
        MarkingPage.jsx
        ReportsPage.jsx
        RulesPage.jsx
        StudentProfilePage.jsx
        StudentsPage.jsx
        SyncQueuePage.jsx
      services/
        api.js
        assessmentRuleService.js
        assessmentService.js
        authService.js
        markService.js
        reportService.js
        studentService.js
      utils/
        assessmentLabels.js
  backend/
    config/
      env.js
    controllers/
      assessmentRulesController.js
      assessmentsController.js
      authController.js
      marksController.js
      reportsController.js
      studentsController.js
    middleware/
      authMiddleware.js
      errorHandler.js
    routes/
      assessmentRoutes.js
      assessmentRuleRoutes.js
      authRoutes.js
      marksRoutes.js
      reportRoutes.js
      studentRoutes.js
    services/
      assessmentLogicService.js
      auditService.js
      googleSheetsService.js
      sheetSyncQueueService.js
      supabaseClient.js
    app.js
    server.js
  database/
    schema.sql
```

## Core Features

- Google OAuth login for coaches/admins (email allow-list support).
- Admin and Coach role separation.
- Student management with streamline, coach assignment, and next-assessment tracking.
- Automatic assessment schedule logic:
  - New student -> `INITIAL_CT`
  - +6 months -> `INITIAL_CT_SECOND`
  - Professional completed -> `PROFESSIONAL`
  - +12 months baseline, then every +6 months -> `DEVELOPMENT_CT`
- Mark submission flow (`POST /marks`):
  1. Save marks to database
  2. Save assessment summary
  3. Append official record to Google Sheets
  4. Auto-calculate `Total` and `TP` where `TP = (Total / 59) * 100`
- Dashboard analytics and optional chart visualizations.
- Due Board for overdue/this-week/upcoming assessments.
- Google Sheets sync retry queue with failure tracking.
- Coach KPI page (monthly activity, average score, due students).
- Admin assessment rules management.
- CSV reports export for students and assessments.
- Student status filtering (DUE / UPCOMING / UNKNOWN).
- Admin add-student supports latest assessment type/date seeding.
- Responsive coach-friendly UI for laptop/tablet.

## Database Setup (Supabase)

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run [`database/schema.sql`](./database/schema.sql).
4. If your DB was created before queue/audit features, run:
   - [`database/migrations/2026-03-05_marks_category_tp_migration.sql`](./database/migrations/2026-03-05_marks_category_tp_migration.sql)
   - [`database/migrations/2026-03-07_ops_improvements.sql`](./database/migrations/2026-03-07_ops_improvements.sql)
5. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Google OAuth Setup

1. Create OAuth Client ID in Google Cloud Console (Web application).
2. Add allowed origins:
   - `http://localhost:5173`
   - your Vercel production domain
3. Set client ID in:
   - `backend/.env` -> `GOOGLE_CLIENT_ID`
   - `frontend/.env` -> `VITE_GOOGLE_CLIENT_ID`

## Google Sheets API Setup

1. Enable Google Sheets API in GCP.
2. Create a Service Account and key.
3. Share target spreadsheet with service account email.
4. Set backend env variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - tabs: `GOOGLE_SHEET_TAB_ICT_MDY`, `GOOGLE_SHEET_TAB_DCT_MDY`, optional professional tab

## Environment Variables

- Backend template: [`backend/.env.example`](./backend/.env.example)
- Frontend template: [`frontend/.env.example`](./frontend/.env.example)

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

### Auth

- `POST /auth/google`
- `POST /auth/admin-login`
- `GET /auth/me`

### Students

- `GET /students`
- `POST /students` (ADMIN)
- `GET /students/:id`
- `GET /students/:id/marking-context`
- `GET /students/dashboard/stats`
- `GET /students/due-board`
- `GET /students/coach-kpi`

### Assessments

- `GET /assessments`
- `POST /assessments`

### Marks

- `POST /marks`
- `GET /marks/sync-failures`
- `POST /marks/:id/retry-sync`

`POST /marks` body scoring fields:
- `sequencing_debugging_score`
- `decomposition_score`
- `abstraction_score`
- `pattern_recognition_score`

`total_score` and `tp_score` are auto-calculated by backend/database.

### Assessment Rules

- `GET /assessment-rules`
- `PUT /assessment-rules/:assessment_type` (ADMIN)

### Reports

- `GET /reports/students.csv`
- `GET /reports/assessments.csv`

## Deployment Guide

### 1) Deploy Database (Supabase)

- Provision Supabase project.
- Run [`database/schema.sql`](./database/schema.sql).

### 2) Deploy Backend (Render)

- Create new Web Service from `/backend`, or use the blueprint in `render.yaml`.
- Build command: `npm install`
- Start command: `npm start`
- Set environment variables from `backend/.env.example`.
- Set `FRONTEND_URL` to your Vercel domain.

### 3) Deploy Frontend (Vercel)

- Import project and set root directory to `/frontend` (uses `frontend/vercel.json`).
- Build command: `npm run build`
- Output directory: `dist`
- Set env:
  - `VITE_API_URL=https://<your-render-service>.onrender.com`
  - `VITE_GOOGLE_CLIENT_ID=<google-client-id>`

### 4) Google OAuth Production

- Add Vercel domain as authorized JavaScript origin in Google OAuth client.
- Add Render backend URL in CORS config via `FRONTEND_URL` env.

## Security Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only.
- Use strong `APP_JWT_SECRET`.
- Restrict logins with `APPROVED_COACH_EMAILS` and `ADMIN_EMAILS`.
- Use HTTPS in production for both frontend and backend.
`POST /students` payload fields:
- `name`, `streamline`, `coach`, `coach_email`
- For new students: `join_date`
- For existing students: `latest_assessment_type`, `latest_assessment_date`
