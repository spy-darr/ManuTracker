# 🏭 Manufacturing Project Tracker

A full-featured project tracking system for manufacturing, with role-based access for Admin, HOD, and 8 department engineers.

## 🚀 Setup Instructions

### Step 1: Configure Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** → paste the entire contents of `supabase_schema.sql` → **Run**
3. Get your credentials from **Settings → API**:
   - Project URL
   - `anon` public key

### Step 2: Add Your Supabase Credentials

Open `js/config.js` and replace:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // eyJhb...
```

### Step 3: Disable Email Confirmation (Recommended for internal use)

In Supabase → Authentication → Settings → **Disable "Enable email confirmations"**

This allows admin to create users that can immediately log in.

### Step 4: Create First Admin User

1. Go to Supabase → **Authentication → Users → Add User**
2. Create a user with email/password
3. Go to **SQL Editor** and run:
```sql
INSERT INTO public.profiles (id, full_name, email, role)
VALUES (
  'YOUR-USER-UUID-FROM-AUTH',
  'Admin Name',
  'admin@yourcompany.com',
  'admin'
);
```

### Step 5: Deploy to GitHub Pages

1. Create a new **GitHub repository**
2. Push this entire folder:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
3. Go to **Settings → Pages → Source → GitHub Actions**
4. The workflow will auto-deploy on every push

### Step 6: Access Your App

Your app will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access: projects, tasks, deadlines, delay management, user creation |
| **HOD** | Read-only: all projects, department overview, delay reports |
| **Department Engineers** (8) | Update their own tasks, log progress, mark completion |

## 🏭 Departments

Marketing • Engineering • Purchase • QAC • Welding • Production • Logistics • Finance

## ⚙️ Features

- ✅ Admin creates projects and assigns department tasks with deadlines
- ✅ Department engineers update task status and log progress
- ✅ **Flashing red animation** for overdue tasks visible to engineers
- ✅ HOD sees full project overview with department progress
- ✅ Delay management: admin logs delays with reason and updates EDD
- ✅ Delay cascades: if any task misses deadline → project marked DELAYED
- ✅ Real-time updates via Supabase
- ✅ Notification bell for overdue alerts
- ✅ Full delay audit log

## 📁 File Structure

```
project-tracker/
├── index.html                  # Login page
├── css/styles.css              # All styles
├── js/
│   ├── config.js              # ⚠️ PUT YOUR SUPABASE KEYS HERE
│   ├── supabase.js            # All database calls
│   └── ui.js                  # Shared UI components
├── pages/
│   ├── admin-dashboard.html   # Admin home
│   ├── projects.html          # Project list/management
│   ├── project-detail.html    # Project + task management
│   ├── dept-dashboard.html    # Engineer's task view
│   ├── hod-dashboard.html     # HOD overview
│   └── users.html             # User management
├── supabase_schema.sql        # Database setup
└── .github/workflows/deploy.yml
```
