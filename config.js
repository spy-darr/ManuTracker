// ============================================================
// SUPABASE CONFIGURATION
// Replace these with your actual Supabase project credentials
// ============================================================
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

// Department workflow steps (from your Excel tracking sheet)
const DEPARTMENTS = {
  marketing: {
    name: 'Marketing',
    color: '#8B5CF6',
    steps: [
      'PO Receipt',
      'OTM (Order Transmittal Memo)',
      'Kick-Off Meeting',
      'Customer Coordination'
    ]
  },
  engineering: {
    name: 'Engineering',
    color: '#3B82F6',
    steps: [
      'GA Drawing Submission Rev.00',
      'GA Drawing Comments/Approval Rev.00',
      'Revised Drawing Submission Rev.01',
      'Comments on Rev.01 / CRS Resolution',
      'Mech Design/Thermal Calc Submission Rev.00',
      'Mech Design/Thermal Calc Approval',
      'FAB Drawing to Customer Rev.00',
      'FAB Drawing Comment/Approval Rev.00',
      'Revised FAB Submission Rev.01',
      'FAB Drawing Comment/Approval Rev.01',
      'Submission to AI/NOBO for Approval',
      'Approval from AI/NOBO',
      'Drawing to Shop Floor — Fabrication & GAD',
      'Plate Cutting Layouts to Shop Floor',
      'Major Indents in SAP',
      'Balance Indent in SAP'
    ]
  },
  purchase: {
    name: 'Purchase',
    color: '#10B981',
    steps: [
      'Plates SS Indent & Receipt',
      'Plates CS SA516 Indent & Receipt',
      'Plate DSS Indent & Receipt',
      'Plate SDSS Indent & Receipt',
      'Plate IS2062 Indent & Receipt',
      'Forgings/Flanges Receipt',
      'Tubes Receipt',
      'Fittings Receipt',
      'CU NI Insertion Tubes Receipt',
      'Hardware (HDZ)',
      'Gasket',
      'Miscellaneous',
      'Additional Material',
      'Paint',
      'Ball Valves'
    ]
  },
  qac: {
    name: 'QAC',
    color: '#F59E0B',
    steps: [
      'ITP Submission',
      'ITP Approval',
      'Raw Material Inspection',
      'Stage Inspection — Plates',
      'Stage Inspection — Rolling',
      'Stage Inspection — Welding',
      'Dimensional Inspection',
      'NDE (RT/UT/MPT/LPT)',
      'Final Inspection',
      'Hydrotest / Pneumatic Test',
      'Stamping & Certification'
    ]
  },
  welding: {
    name: 'Welding',
    color: '#EF4444',
    steps: [
      'WPS/PQR Preparation',
      'WPS/PQR Approval',
      'Welder Qualification',
      'Long Seam Welding',
      'Circ Seam Welding',
      'Nozzle Welding',
      'TTP Welding & Expansion',
      'Weld Repair (if any)',
      'Post Weld Heat Treatment'
    ]
  },
  production: {
    name: 'Production',
    color: '#EC4899',
    steps: [
      'Plates Inspection & Clearance',
      'Plate Cutting (Laser/Plasma)',
      'Shell Plate Rolling',
      'Long Seam Setup & Welding',
      'Dish End Fabrication',
      'Tubesheet Cutting/Machining/Drilling',
      'Nozzle Fabrication',
      'Shell to Nozzle Fitup & Welding',
      'Saddle/Skirt Fabrication',
      'Tube Bundle Preparation',
      'Tube Insertion',
      'TTP Welding & Expansion',
      'Tube Side Hydrotest',
      'Shell Side Assembly',
      'Shell Side Hydrotest',
      'Pickling & Passivation',
      'Final Assembly',
      'Painting & Blasting'
    ]
  },
  logistics: {
    name: 'Logistics',
    color: '#06B6D4',
    steps: [
      'Dispatch Planning',
      'Trailer/Transport Booking',
      'Loading & Securing',
      'Documentation (Packing List, BOL)',
      'Dispatch',
      'Delivery Confirmation'
    ]
  },
  finance: {
    name: 'Finance',
    color: '#84CC16',
    steps: [
      'ABG (Advance Bank Guarantee) Issue',
      'ABG Payment Receipt',
      'PBG (Performance Bank Guarantee) Issue',
      'PBG Payment Receipt',
      'Stage-wise Invoice',
      'Final Invoice',
      'Payment Follow-up'
    ]
  }
};

const ROLES = {
  admin: { label: 'Project Admin', godMode: true },
  hod: { label: 'HOD', viewAll: true },
  project_engineer: { label: 'Project Engineer', viewAlerts: true },
  marketing: { label: 'Marketing Dept', department: 'marketing' },
  engineering: { label: 'Engineering Dept', department: 'engineering' },
  purchase: { label: 'Purchase Dept', department: 'purchase' },
  qac: { label: 'QAC Dept', department: 'qac' },
  welding: { label: 'Welding Dept', department: 'welding' },
  production: { label: 'Production Dept', department: 'production' },
  logistics: { label: 'Logistics Dept', department: 'logistics' },
  finance: { label: 'Finance Dept', department: 'finance' }
};
