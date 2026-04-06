# ENPRO — Manufacturing Project Tracking System

A complete role-based project tracking system for the manufacturing industry, built with **vanilla JS + Supabase**, deployable on **GitHub Pages**.

---

## 🏗 Architecture

```
Frontend (GitHub Pages)  ←→  Supabase (Auth + Database + Realtime)
```

**No backend server needed** — everything runs client-side with Supabase handling auth, database, and real-time subscriptions.

---

## 🚀 Setup Guide

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Once created, go to **SQL Editor** → **New Query**
3. Paste the entire contents of `supabase-setup.sql` and click **Run**
4. Go to **Settings** → **API** and copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public** key

### Step 2: Configure the App

Open `config.js` and replace:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### Step 3: Create Your First Admin User

1. In Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Enter email and password (e.g., `admin@enpro.com` / `admin123456`)
3. Go to **SQL Editor** and run:
```sql
UPDATE public.profiles 
SET role = 'admin', full_name = 'Project Admin' 
WHERE email = 'admin@enpro.com';
```

### Step 4: Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push all files to the repo:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
3. Go to repo **Settings** → **Pages**
4. Source: **Deploy from a branch** → **main** → **/ (root)**
5. Your app will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access. Create projects, set/shift deadlines, manage users, view everything |
| **HOD** | View all projects and all department updates |
| **Project Engineer** | View all projects, see deadline alerts |
| **Marketing** | Update Marketing department steps only |
| **Engineering** | Update Engineering department steps only |
| **Purchase** | Update Purchase department steps only |
| **QAC** | Update QAC department steps only |
| **Welding** | Update Welding department steps only |
| **Production** | Update Production department steps only |
| **Logistics** | Update Logistics department steps only |
| **Finance** | Update Finance department steps only |

---

## 🔄 Department Workflow (from your Excel Sheet)

Each project flows through these departments with specific tracked steps:

1. **Marketing** → PO Receipt, OTM, Kick-Off Meeting
2. **Engineering** → GA/FAB Drawings, Design Calcs, Shop Floor release
3. **Purchase** → Plates (SS/CS/DSS), Forgings, Tubes, Fittings, etc.
4. **QAC** → ITP, Inspections, NDE, Hydrotest, Certification
5. **Welding** → WPS/PQR, Welder Qualification, All seam welding, PWHT
6. **Production** → Cutting, Rolling, Fabrication, Assembly, Testing
7. **Logistics** → Dispatch planning, Transport, Documentation
8. **Finance** → ABG, PBG, Invoicing, Payments

---

## ⚡ Key Features

### For Admin (God Mode)
- **Onboard projects** with all department steps auto-generated
- **Set deadlines** for each department step
- **Shift deadlines** in bulk (e.g., push all Purchase deadlines by +10 days)
- **Cascade delay handling** — when one step is delayed, the system tracks it
- **Manage users** — create accounts with specific roles

### For Department Users
- **Update only their department** steps (actual completion dates)
- View the overall project but cannot modify other departments

### For Project Engineers
- **Real-time alerts** for overdue/due-today/due-soon deadlines
- **Auto-refresh every 30 seconds** — no need to reload
- Alerts filtered by their department

### For HOD
- **Bird's eye view** of all projects
- **Department progress overview** with progress bars
- **Activity feed** showing recent updates across all departments

---

## 📁 File Structure

```
project-tracker/
├── index.html          # Main SPA (Single Page Application)
├── style.css           # Complete styling (dark theme)
├── config.js           # Supabase config + department definitions
├── app.js              # All application logic
├── supabase-setup.sql  # Database schema (run in Supabase SQL Editor)
└── README.md           # This file
```

---

## 🔒 Security Notes

- Row Level Security (RLS) is enabled on all tables
- Department users can only update steps in their own department
- Only admins can create/modify projects and deadlines
- Supabase handles all authentication securely
- The `anon` key is safe to expose in frontend code (it's designed for this)

---

## 💡 Creating Additional Users

After logging in as admin, go to **User Mgmt** page and add users. Each user needs:
- **Email** — for login
- **Password** — minimum 6 characters
- **Role** — determines what they can access
- **Department** — auto-set from role, or override manually

---

## 🛠 Customizing Department Steps

Edit the `DEPARTMENTS` object in `config.js` to add/remove/rename steps for any department. Changes apply to **new projects only** (existing projects keep their steps).
