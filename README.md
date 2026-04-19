# ManuTrack v2 — Manufacturing Project Intelligence

A production-ready manufacturing project tracker with Excel import, real-time deadline cascade, and Supabase backend.

---

## 🚀 Quick Start (Demo Mode — no backend needed)

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (runs in demo mode with localStorage)
npm run dev
```

Open http://localhost:5173 — logs in with demo passwords below.

---

## 🔐 Demo Passwords

| Role             | Password   |
|------------------|------------|
| Project Admin    | admin123   |
| Department Member| dept123    |
| HOD              | hod123     |
| Project Engineer | eng123     |

---

## 🗄️ Supabase Setup (Production)

### 1. Create a Supabase project
Go to https://app.supabase.com → New Project

### 2. Run the schema
- Open your project → **SQL Editor**
- Paste the entire contents of `supabase_schema.sql`
- Click **Run**

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your actual Supabase URL and anon key
# Found in: Supabase Dashboard → Project Settings → API
```

### 4. Create your first admin user
- Go to Supabase Dashboard → **Authentication → Users** → Invite user
- After they sign up, run in SQL Editor:
```sql
UPDATE user_profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 5. Create department users
For each department member:
- Create their account in Supabase Auth
- Set their profile:
```sql
UPDATE user_profiles 
SET role = 'dept', dept_id = 2  -- 2=Engineering, see departments table
WHERE email = 'engineer@company.com';
```

Department IDs: 1=Marketing, 2=Engineering, 3=Purchase, 4=QAC, 5=Welding, 6=Production, 7=Logistics, 8=Finance

---

## 📊 Excel Import

The system reads your **Master Project Tracking Sheet** and supports 3 import modes:

| Sheet | What's imported |
|-------|----------------|
| **SUMMERY** | Dept-wise actions, C1–C6 deadline history, OPEN/CLOSED status |
| **TRACKING SHEET** | All activities, PLANNED vs ACTUAL dates per project |
| **P-XXXXXX sheets** | Baseline vs Actual manufacturing tasks with duration |

### Import flow:
1. Admin → Import Excel → Upload .xlsx file
2. Choose which sheet to import from
3. Preview parsed projects and step counts
4. Click Import → projects are created/updated

---

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── supabase.js      # Supabase client + all DB helpers
│   ├── excelParser.js   # Excel import logic (SUMMERY, TRACKING, proj sheets)
│   └── utils.js         # Constants, date helpers, project calculations
├── hooks/
│   └── useAuth.jsx      # Auth context (real Supabase + demo mode)
├── components/
│   ├── Layout.jsx        # App shell: topbar, sidebar, alert panel
│   └── UI.jsx            # Shared: Modal, Badge, ProgressBar, etc.
├── pages/
│   ├── Login.jsx
│   ├── AdminDashboard.jsx
│   ├── AllProjects.jsx
│   ├── ImportProject.jsx
│   ├── NewProject.jsx
│   ├── ProjectDetail.jsx  # Step management + postpone cascade
│   ├── DeptPages.jsx      # DeptDashboard + DeptUpdate
│   ├── HodOverview.jsx
│   └── EngPages.jsx       # EngDashboard + EngAlerts
├── index.css              # Global styles (industrial luxury theme)
└── App.jsx                # Routing + state
```

---

## ⚡ Key Features

- **Excel Import** — SUMMERY (C1–C6 history), TRACKING SHEET, individual project sheets
- **Delay Cascade** — Postponing any step auto-shifts all downstream steps across depts
- **Full History** — Every deadline revision stored with label (C1, C2, Cascade Rev, etc.)
- **Live Alerts** — Flashing overdue badges, bell notification count, alert slide-over
- **4 Roles** — Admin (godmode), Dept (update own steps), HOD (read-all), Engineer (overdue monitor)
- **Realtime** — Supabase subscriptions for live multi-user updates
- **Demo Mode** — Works entirely from localStorage when no Supabase configured

---

## 🚢 Deploy

```bash
npm run build
# Deploy the dist/ folder to Vercel, Netlify, or any static host
```

For Vercel: `vercel --prod`
For Netlify: drag the `dist/` folder into the dashboard.

---

## 📝 Adding Users (Production)

The `supabase_schema.sql` includes a trigger that auto-creates a profile row when a user signs up. 
To set their role and department, update the `user_profiles` table via the Supabase dashboard or SQL.
