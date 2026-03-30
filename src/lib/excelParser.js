// ── Excel Import Parser for ManuTrack ────────────────────────
// Handles: SUMMERY sheet, TRACKING SHEET, individual P-XXXXXX sheets

const DEPT_SEQ = { Marketing:1, Engineering:2, Purchase:3, QAC:4, Welding:5, Production:6, Logistics:7, Finance:8 }
const DEPT_NAMES = Object.keys(DEPT_SEQ)

// ── Dept name normalization ───────────────────────────────────
const DEPT_ALIAS = {
  'ENGG':'Engineering','ENGG.':'Engineering','ENGINEERING':'Engineering',
  'PURCHASE':'Purchase','PURCHASE ':'Purchase',
  'QAC':'QAC','QC':'QAC','QAC/WELDING':'QAC','QAC/ WELDING':'QAC',
  'WELDING':'Welding','WELDING ':'Welding',
  'PRODUCTION':'Production','PROD':'Production',
  'LOGISTICS':'Logistics','LOGISTICS ':'Logistics',
  'FINANCE':'Finance','FINANCE ':'Finance',
  'MKT':'Marketing','MARKETING':'Marketing','MARKETING ':'Marketing',
  'PROJ':'Engineering','PROJECTS':'Engineering','PROJECT':'Engineering',
  'CUSTOMER/PRJ':'Marketing','CUSTOMER / PRJ':'Marketing',
  'ENGG/ QAC':'Engineering','ENGG/QAC':'Engineering',
  'ENGG./ QAC':'Engineering',
}

// Keyword-based dept guessing from step name
const DEPT_KEYWORDS = {
  Marketing:   ['PO RECEIPT','OTM','KICK-OFF','KICK OFF','COMMERCIAL','ORDER CONFIRM','CUSTOMER INQUIRY','PROPOSAL','MKT','MARKETING'],
  Engineering: ['DRG','DRAWING','DESIGN CALC','INDENT IN SAP','GA DRG','FAB DRG','WELD MAP','ITP','AI REVIEW','WELD BOOK','MDC','PART DRG','CUTTING LAYOUT','PART DRG'],
  Purchase:    ['PLATE','PIPE','FLANGE','TUBE','FORGING','FITTING','HARDWARE','GASKET','RECEIPT','PO PLACEMENT','MATERIAL RECEIPT','INDENT','PROCUREMENT','PAINT ','NAME PLATE','SPARES','VALVES','SIGHT GLASS','SPRAY NOZZLE','CONDENSATE','DEMISTER','PROFILES','STRUCTURAL MATERIAL','HYDROTEST MATERIAL','N2 PURGING'],
  QAC:         ['INSPECT','QA','QC','CLEARANCE','MOCKUP','HYDROTEST','HYDRO TEST','LPT','NDT','PNEUMAT','APPROVAL FROM CUSTOMER','APPROVAL FROM AI','AI/NOBO','NOBO','WITNESS'],
  Welding:     ['WELD','FIT UP','FITUP','SET UP AND WELD','SETUP','LONG SEAM','L/S FITUP','L/S WELDING','NOZZLE FITUP','NOZZLE WELDING','SADDLE'],
  Production:  ['ROLLING','CUTTING','FABRICAT','ASSEMB','MACHINING','DRILLING','FORMING','BLANKING','BENDING','LASER','PUNCHING','EXPANSION','INSERTION','SKELETON','BUNDLE'],
  Logistics:   ['DISPATCH','PACK','SHIPPING','PURGING','IRN','DELIVERY','DESPATCH','READINESS','BLASTING','PAINTING','PICKLING','PASSIVAT'],
  Finance:     ['INVOICE','PAYMENT','FINANC'],
}

export function normalizeDept(raw) {
  if (!raw) return 'Engineering'
  const str = String(raw).trim()
  if (DEPT_ALIAS[str.toUpperCase()]) return DEPT_ALIAS[str.toUpperCase()]
  // partial match
  const up = str.toUpperCase()
  for (const [alias, dept] of Object.entries(DEPT_ALIAS)) {
    if (up === alias.toUpperCase()) return dept
  }
  return guessDeptFromName(str)
}

export function guessDeptFromName(name) {
  if (!name) return 'Production'
  const up = String(name).toUpperCase()
  for (const [dept, kws] of Object.entries(DEPT_KEYWORDS)) {
    for (const kw of kws) {
      if (up.includes(kw)) return dept
    }
  }
  return 'Production'
}

// ── Date parsing ─────────────────────────────────────────────
export function parseDate(v) {
  if (!v || v === 'TBC' || v === 'HOLD' || v === '-' || v === 'NaN') return null
  if (v instanceof Date) {
    if (isNaN(v)) return null
    const y = v.getFullYear(), m = String(v.getMonth()+1).padStart(2,'0'), d = String(v.getDate()).padStart(2,'0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'string') {
    const clean = v.trim()
    const m1 = clean.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`
    const m2 = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`
    const m3 = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
    if (m3) return `${m3[3]}-${m3[2]}-${m3[1]}`
    return null
  }
  if (typeof v === 'number' && v > 10000) {
    // Excel serial date → JS date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    const y = d.getUTCFullYear(), mo = String(d.getUTCMonth()+1).padStart(2,'0'), dy = String(d.getUTCDate()).padStart(2,'0')
    if (y < 1990 || y > 2060) return null
    return `${y}-${mo}-${dy}`
  }
  return null
}

// ── SUMMERY SHEET parser ──────────────────────────────────────
// Columns: WO(0) ENGG(1) CDD(2) EDD(3) CRITICAL(4) ACTION(5) AFFECTS(6) DEPT(7)
//          ACTION_BY(8) REQ_DATE(9) STATUS(10) CURRENT_COMMIT(11) C1(12) C2(13)
//          C3(14) C4(15) C5(16) C6(17) REMARKS(18)
export function parseSummerySheet(wb) {
  const ws = wb.Sheets['SUMMERY']
  if (!ws) throw new Error('SUMMERY sheet not found')

  const XLSX = window.XLSX || (typeof require !== 'undefined' ? require('xlsx') : null)
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, dateNF: 'yyyy-mm-dd' })

  const projectMap = {}

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r]
    if (!row || !row[0]) continue
    const wo = String(row[0]).trim()
    if (!wo || wo === 'WO' || wo === 'nan') continue

    if (!projectMap[wo]) {
      projectMap[wo] = {
        project_code: wo,
        name: wo,
        client: '',
        project_engg: row[1] ? String(row[1]).trim() : '',
        cdd: parseDate(row[2]),
        edd: parseDate(row[3]),
        status: 'ontrack',
        steps: {}
      }
      DEPT_NAMES.forEach(d => { projectMap[wo].steps[d] = [] })
    }

    const p = projectMap[wo]
    const action = row[5] ? String(row[5]).trim().replace(/\s+/g, ' ') : ''
    if (!action || action.length < 2) continue

    const dept = normalizeDept(row[7])
    const actionBy = row[8] ? String(row[8]).trim() : ''
    const reqDate = parseDate(row[9])
    const rawStatus = row[10] ? String(row[10]).trim().toUpperCase() : ''
    const status = rawStatus === 'CLOSED' ? 'done' : rawStatus === 'OPEN' ? 'pending' : 'pending'

    // Current commitment is col 11; C1-C6 are cols 12-17
    const currentCommit = parseDate(row[11])
    const c1 = parseDate(row[12])
    const c2 = parseDate(row[13])
    const c3 = parseDate(row[14])
    const c4 = parseDate(row[15])
    const c5 = parseDate(row[16])
    const c6 = parseDate(row[17])

    // Build ordered history (C1 is the first commitment = original planned date)
    const history = []
    const allDates = [c1, c2, c3, c4, c5, c6].filter(Boolean)
    allDates.forEach((d, i) => {
      if (d && d !== 'TBC') history.push({ date: d, label: `C${i+1}`, revision: i+1 })
    })

    // Original = C1 (first commitment), current = currentCommit or last Cx
    const originalDate = c1 || currentCommit
    const activeDate = currentCommit || c6 || c5 || c4 || c3 || c2 || c1

    p.steps[dept].push({
      name: action,
      action_by: actionBy,
      status,
      original_date: originalDate,
      current_date: activeDate,
      actual_date: status === 'done' ? activeDate : null,
      req_date: reqDate,
      note: row[18] ? String(row[18]).trim() : '',
      history, // [{date, label, revision}]
    })
  }

  // Clean up empty dept step arrays
  return Object.values(projectMap).map(p => {
    DEPT_NAMES.forEach(d => { if (!p.steps[d]) p.steps[d] = [] })
    return p
  })
}

// ── TRACKING SHEET parser ─────────────────────────────────────
// Row 0: CDD per project
// Row 1: EDD per project
// Row 4: Project IDs (every 2 cols from col 2)
// Row 5: PLANNED/ACT headers
// Row 6+: Activity names in col 1, dates in alternating PLANNED/ACT cols
export function parseTrackingSheet(wb) {
  const ws = wb.Sheets['TRACKING SHEET']
  if (!ws) throw new Error('TRACKING SHEET not found')

  const XLSX = window.XLSX || (typeof require !== 'undefined' ? require('xlsx') : null)
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })

  const projRow = raw[4] || []
  const projects = []

  // Find all project columns
  const projCols = []
  for (let c = 2; c < projRow.length; c += 2) {
    const pid = projRow[c]
    if (pid && String(pid).trim()) {
      projCols.push({ col: c, id: String(pid).trim() })
    }
  }

  // Activity → dept mapping from section headers
  const SECTION_MAP = {
    'PROJECT INITIATION & COMMERCIAL ACTIVITIES': 'Marketing',
    'DRAWING/ DOCUMENT SUBMISSION': 'Engineering',
    'MATERIAL INDENTING': 'Purchase',
    'PURCHASE': 'Purchase',
    'QAC': 'QAC',
    'WELDING': 'Welding',
    'PRODUCTION': 'Production',
    'TESTING AND DESPATCH': 'Logistics',
    'TESTING & DESPATCH': 'Logistics',
    'LOGISTICS': 'Logistics',
    'FINANCE': 'Finance',
  }

  for (const { col, id } of projCols) {
    const p = {
      project_code: id,
      name: id,
      client: '',
      project_engg: '',
      cdd: parseDate(raw[0]?.[col]),
      edd: parseDate(raw[1]?.[col]),
      status: 'ontrack',
      steps: {}
    }
    DEPT_NAMES.forEach(d => { p.steps[d] = [] })

    let currentDept = 'Engineering'

    for (let r = 6; r < raw.length; r++) {
      const actRaw = raw[r]?.[1]
      if (!actRaw) continue
      const act = String(actRaw).trim().replace(/\s+/g, ' ')
      if (!act) continue

      // Section header detection
      const upperAct = act.toUpperCase()
      if (SECTION_MAP[upperAct]) {
        currentDept = SECTION_MAP[upperAct]
        continue
      }

      const planned = parseDate(raw[r]?.[col])
      const actual  = parseDate(raw[r]?.[col + 1])

      if (!planned && !actual) continue // skip rows with no dates for this project

      const dept = guessDeptFromName(act) || currentDept
      if (!p.steps[dept]) p.steps[dept] = []

      const history = []
      if (planned) history.push({ date: planned, label: 'Baseline', revision: 1 })
      if (actual && actual !== planned) history.push({ date: actual, label: 'Actual', revision: 2 })

      p.steps[dept].push({
        name: act,
        action_by: '',
        status: actual ? 'done' : 'pending',
        original_date: planned,
        current_date: actual || planned,
        actual_date: actual || null,
        req_date: null,
        note: '',
        history,
      })
    }

    projects.push(p)
  }
  return projects
}

// ── Individual P-XXXXXX sheet parser ─────────────────────────
// Cols: Task Name(0) Duration(1) Baseline Start(2) Baseline Finish(3) Start(4) Finish(5)
export function parseProjectSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet ${sheetName} not found`)

  const XLSX = window.XLSX || (typeof require !== 'undefined' ? require('xlsx') : null)
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })

  const pid = sheetName.split('_')[0].trim()
  const p = {
    project_code: pid,
    name: sheetName.replace(/_/g, ' '),
    client: '',
    project_engg: '',
    cdd: null,
    edd: null,
    status: 'ontrack',
    steps: {}
  }
  DEPT_NAMES.forEach(d => { p.steps[d] = [] })

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r]
    if (!row || !row[0]) continue
    const name = String(row[0]).trim()
    if (!name || name === 'MANUFACTURING') continue

    const bStart  = parseDate(row[2])
    const bFinish = parseDate(row[3])
    const aStart  = parseDate(row[4])
    const aFinish = parseDate(row[5])

    const dept = guessDeptFromName(name)
    const history = []
    if (bFinish) history.push({ date: bFinish, label: 'Baseline Finish', revision: 1 })
    if (aFinish && aFinish !== bFinish) history.push({ date: aFinish, label: 'Actual Finish', revision: 2 })

    const isDelayed = aFinish && bFinish && aFinish > bFinish

    p.steps[dept].push({
      name,
      action_by: '',
      status: aFinish ? 'done' : 'pending',
      original_date: bFinish || bStart,
      current_date: aFinish || bFinish || bStart,
      actual_date: aFinish || null,
      req_date: null,
      note: isDelayed ? `Delayed from baseline by ${Math.ceil((new Date(aFinish) - new Date(bFinish)) / 86400000)} days` : '',
      history,
    })
  }

  // Set EDD from last step's date
  const allDates = DEPT_NAMES.flatMap(d => p.steps[d]).map(s => s.current_date).filter(Boolean)
  if (allDates.length) p.edd = allDates.sort().at(-1)

  return [p]
}

// ── Master import function ────────────────────────────────────
export function detectSheets(wb) {
  const sheets = wb.SheetNames
  const result = []

  if (sheets.some(s => s.trim() === 'SUMMERY')) {
    result.push({ key: 'summery', label: 'SUMMERY Sheet', desc: 'Dept-wise actions · C1–C6 deadline history · OPEN/CLOSED status', type: 'summery' })
  }
  if (sheets.some(s => s.trim() === 'TRACKING SHEET')) {
    result.push({ key: 'tracking', label: 'TRACKING SHEET', desc: 'All activities · PLANNED vs ACTUAL dates per project', type: 'tracking' })
  }
  const projSheets = sheets.filter(s => /^P-\d/.test(s.trim()))
  projSheets.forEach(s => {
    result.push({ key: s, label: s, desc: 'Baseline vs Actual manufacturing tasks', type: 'project', sheetName: s })
  })

  return result
}

export function parseWorkbook(wb, sheetInfo) {
  if (sheetInfo.type === 'summery') return parseSummerySheet(wb)
  if (sheetInfo.type === 'tracking') return parseTrackingSheet(wb)
  if (sheetInfo.type === 'project') return parseProjectSheet(wb, sheetInfo.sheetName)
  throw new Error('Unknown sheet type')
}
