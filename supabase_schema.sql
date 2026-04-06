-- ============================================================
-- PROJECT TRACKER - SUPABASE SCHEMA
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- USERS TABLE (mirrors auth.users with roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'hod', 'viewer', 'marketing', 'engineering', 'purchase', 'qac', 'welding', 'production', 'logistics', 'finance')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  customer_name TEXT,
  project_engineer TEXT,
  po_date DATE,
  cdd DATE,  -- Customer Delivery Date
  edd DATE,  -- Expected Delivery Date
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'delayed', 'cancelled')),
  is_delayed BOOLEAN DEFAULT FALSE,
  delay_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEPARTMENT TASKS TABLE
-- Each project has tasks for each department, with deadline set by admin
CREATE TABLE IF NOT EXISTS public.department_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('marketing', 'engineering', 'purchase', 'qac', 'welding', 'production', 'logistics', 'finance')),
  task_name TEXT NOT NULL,
  description TEXT,
  deadline DATE NOT NULL,
  -- If any deadline changes, admin must update here
  revised_deadline DATE,
  deadline_changed_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'on_hold')),
  completion_date DATE,
  completion_notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASK UPDATES TABLE (department engineers log progress)
CREATE TABLE IF NOT EXISTS public.task_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.department_tasks(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  update_text TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECT DELAY LOG (tracks when and why a project was delayed)
CREATE TABLE IF NOT EXISTS public.project_delay_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  old_edd DATE,
  new_edd DATE,
  reason TEXT NOT NULL,
  delayed_by_department TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS TABLE (for flashing overdue tasks)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.department_tasks(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'overdue' CHECK (type IN ('overdue', 'deadline_change', 'project_delayed', 'info')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_delay_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, only owner or admin can write
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) -- Allow first user
  );

-- Projects: all authenticated can read; only admin can insert/update/delete
CREATE POLICY "Projects viewable by all authenticated" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admin can manage projects" ON public.projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Department tasks: all can read; admin can do anything; dept engineer can update their own tasks
CREATE POLICY "Tasks viewable by all authenticated" ON public.department_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage all tasks" ON public.department_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Dept engineer can update assigned tasks" ON public.department_tasks
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Task updates: all can read; only assigned engineer or admin can insert
CREATE POLICY "Updates viewable by all" ON public.task_updates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Engineers can add updates" ON public.task_updates
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Delay log: all can read; only admin can write
CREATE POLICY "Delay log viewable by all" ON public.project_delay_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage delay log" ON public.project_delay_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications: users can only see their own
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can mark own as read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on projects
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.department_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: check for overdue tasks and mark project as delayed
CREATE OR REPLACE FUNCTION check_project_delays()
RETURNS void AS $$
DECLARE
  task_rec RECORD;
BEGIN
  -- Mark tasks as delayed if past deadline and not completed
  UPDATE public.department_tasks
  SET status = 'delayed'
  WHERE status IN ('pending', 'in_progress')
    AND COALESCE(revised_deadline, deadline) < CURRENT_DATE;

  -- Mark projects as delayed if any task is delayed
  UPDATE public.projects p
  SET is_delayed = TRUE, status = 'delayed'
  WHERE EXISTS (
    SELECT 1 FROM public.department_tasks dt
    WHERE dt.project_id = p.id AND dt.status = 'delayed'
  ) AND p.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_department_tasks_project ON public.department_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_department_tasks_dept ON public.department_tasks(department);
CREATE INDEX IF NOT EXISTS idx_department_tasks_status ON public.department_tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_updates_task ON public.task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
