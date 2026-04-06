-- ============================================================
-- ENPRO Project Tracking System — Supabase Database Setup
-- ============================================================
-- Run this ENTIRE script in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste & Run)
-- ============================================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'project_engineer' 
    CHECK (role IN ('admin','hod','project_engineer','marketing','engineering','purchase','qac','welding','production','logistics','finance')),
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'project_engineer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order TEXT NOT NULL,
  customer TEXT,
  description TEXT,
  project_engineer TEXT,
  cdd DATE,            -- Contractual Delivery Date
  edd DATE,            -- Expected Delivery Date
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','hold','cancelled')),
  has_delay BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Admins can insert projects" ON public.projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update projects" ON public.projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- 3. PROJECT STEPS TABLE
CREATE TABLE IF NOT EXISTS public.project_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_order INTEGER DEFAULT 1,
  deadline DATE,
  actual_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','hold')),
  remarks TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_steps_project ON public.project_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_steps_dept ON public.project_steps(department);
CREATE INDEX IF NOT EXISTS idx_steps_deadline ON public.project_steps(deadline);

ALTER TABLE public.project_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view steps" ON public.project_steps FOR SELECT USING (true);
CREATE POLICY "Admins can do anything with steps" ON public.project_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Dept users can update own dept steps" ON public.project_steps FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR department = project_steps.department)
  )
);
CREATE POLICY "Anyone can insert steps" ON public.project_steps FOR INSERT WITH CHECK (true);


-- 4. ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  description TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_project ON public.activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_log(created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view activity" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activity" ON public.activity_log FOR INSERT WITH CHECK (true);


-- ============================================================
-- 5. CREATE YOUR FIRST ADMIN USER
-- ============================================================
-- After running this SQL, go to Supabase Authentication tab
-- and create your first user with email/password.
-- Then run this to make them admin:
--
-- UPDATE public.profiles 
-- SET role = 'admin', full_name = 'Project Admin' 
-- WHERE email = 'your-admin-email@company.com';
--
-- ============================================================


-- 6. ENABLE REALTIME (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;


-- Done! Your database is ready.
-- ============================================================
