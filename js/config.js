// ============================================================
// config.js - Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase credentials
// ============================================================
const SUPABASE_URL = 'https://gjrhbxlkwrshprbkyjxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcmhieGxrd3JzaHByYmt5anhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzQ5NDAsImV4cCI6MjA5MDU1MDk0MH0.KuzP7Uvy5RsItKayIYTqw1phqmp8_NscbRQy-pzOTgE';

// Departments list
const DEPARTMENTS = [
  { id: 'marketing',    label: 'Marketing',    icon: '📊', color: '#6366f1' },
  { id: 'engineering',  label: 'Engineering',  icon: '⚙️',  color: '#0ea5e9' },
  { id: 'purchase',     label: 'Purchase',     icon: '🛒', color: '#f59e0b' },
  { id: 'qac',          label: 'QAC',          icon: '✅', color: '#10b981' },
  { id: 'welding',      label: 'Welding',      icon: '🔥', color: '#ef4444' },
  { id: 'production',   label: 'Production',   icon: '🏭', color: '#8b5cf6' },
  { id: 'logistics',    label: 'Logistics',    icon: '🚚', color: '#06b6d4' },
  { id: 'finance',      label: 'Finance',      icon: '💰', color: '#84cc16' },
];

const ROLES = {
  admin:       { label: 'Project Admin',  access: 'full'   },
  hod:         { label: 'HOD',            access: 'view'   },
  viewer:      { label: 'Viewer',         access: 'view'   },
  marketing:   { label: 'Marketing Eng',  access: 'dept'   },
  engineering: { label: 'Engineering Eng',access: 'dept'   },
  purchase:    { label: 'Purchase Eng',   access: 'dept'   },
  qac:         { label: 'QAC Eng',        access: 'dept'   },
  welding:     { label: 'Welding Eng',    access: 'dept'   },
  production:  { label: 'Production Eng', access: 'dept'   },
  logistics:   { label: 'Logistics Eng',  access: 'dept'   },
  finance:     { label: 'Finance Eng',    access: 'dept'   },
};

const STATUS_COLORS = {
  pending:     { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  in_progress: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  completed:   { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  delayed:     { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  on_hold:     { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
};
