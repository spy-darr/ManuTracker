import { useState, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { UploadCloud, FileSpreadsheet, CheckCircle } from 'lucide-react'
import { detectSheets, parseWorkbook } from '../lib/excelParser'
import { DEPTS, fmtDate } from '../lib/utils'

export default function ImportProject({ nav, projects, saveProjects }) {
  const [dragging, setDragging] = useState(false)
  const [wb, setWb] = useState(null)
  const [sheets, setSheets] = useState([])
  const [selected, setSelected] = useState(null)
  const [parsed, setParsed] = useState([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  const processFile = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const XLSX = window.XLSX
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type:'array', cellDates:true, dateNF:'yyyy-mm-dd' })
        window._wb = workbook // expose globally for parser
        const detected = detectSheets(workbook)
        setWb(workbook)
        setSheets(detected)
        setSelected(null)
        setParsed([])
        if (detected.length === 0) toast.error('No recognized sheets found')
        else toast.success(`${detected.length} data source${detected.length > 1 ? 's' : ''} detected`)
      } catch (err) {
        toast.error('Failed to parse file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processFile(file)
    } else {
      toast.error('Please upload an .xlsx, .xls, or .csv file')
    }
  }

  function selectSheet(sheetInfo) {
    setSelected(sheetInfo)
    try {
      const result = parseWorkbook(wb, sheetInfo)
      setParsed(result)
      toast.success(`${result.length} project${result.length !== 1 ? 's' : ''} found`)
    } catch (err) {
      toast.error('Parse error: ' + err.message)
      setParsed([])
    }
  }

  function doImport() {
    if (!parsed.length) { toast.error('Nothing to import'); return }
    setImporting(true)
    let added = 0, updated = 0
    const newProjects = [...projects]
    for (const p of parsed) {
      const idx = newProjects.findIndex(x => x.project_code === p.project_code || x.id === p.project_code)
      if (idx >= 0) { newProjects[idx] = { ...newProjects[idx], ...p }; updated++ }
      else { newProjects.push({ ...p, id: p.project_code + '_' + Date.now() }); added++ }
    }
    saveProjects(newProjects)
    toast.success(`Imported: ${added} new · ${updated} updated`)
    setImporting(false)
    nav('all_projects')
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-title">IMPORT FROM EXCEL</div>
        <div className="page-sub">Upload your Master Project Tracking Sheet · .xlsx or .csv</div>
      </div>

      {/* Drop zone */}
      {!wb && (
        <div className="card">
          <div
            className={`drop-zone${dragging ? ' dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div className="drop-zone-icon">
              <UploadCloud size={48} color="var(--a)" strokeWidth={1.5} />
            </div>
            <div className="drop-zone-title">DROP EXCEL FILE HERE</div>
            <div className="drop-zone-sub">or click to browse &nbsp;·&nbsp; .xlsx .xls .csv supported</div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display:'none' }}
              onChange={e => processFile(e.target.files[0])}
            />
          </div>
        </div>
      )}

      {/* File loaded, choose sheet */}
      {wb && (
        <>
          <div className="card">
            <div className="card-header">
              <FileSpreadsheet size={16} color="var(--green)" />
              <div className="card-title">FILE LOADED SUCCESSFULLY</div>
              <button className="btn-ghost btn-ghost-sm" style={{ marginLeft:'auto' }}
                onClick={() => { setWb(null); setSheets([]); setSelected(null); setParsed([]) }}>
                × Clear
              </button>
            </div>

            <div style={{ marginBottom:12, fontSize:12, color:'var(--t2)' }}>
              Select a data source to preview and import:
            </div>

            <div className="sheet-tabs">
              {sheets.map(s => (
                <div
                  key={s.key}
                  className={`sheet-tab${selected?.key === s.key ? ' active' : ''}`}
                  onClick={() => selectSheet(s)}
                >
                  <div style={{ fontWeight:500 }}>{s.label}</div>
                  <div style={{ fontSize:9, color: selected?.key === s.key ? 'rgba(0,212,255,0.7)' : 'var(--t3)', marginTop:2 }}>
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>

            {sheets.length === 0 && (
              <div style={{ color:'var(--t3)', fontSize:13, padding:'10px 0' }}>
                No recognized data sheets found. Expected: SUMMERY, TRACKING SHEET, or P-XXXXXX sheets.
              </div>
            )}
          </div>

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="card">
              <div className="card-header">
                <CheckCircle size={16} color="var(--green)" />
                <div className="card-title">
                  PREVIEW — {parsed.length} PROJECT{parsed.length !== 1 ? 'S' : ''} FOUND
                </div>
                <button
                  className="btn"
                  style={{ marginLeft:'auto' }}
                  onClick={doImport}
                  disabled={importing}
                >
                  {importing ? 'Importing…' : `Import ${parsed.length} Project${parsed.length !== 1 ? 's' : ''} →`}
                </button>
              </div>

              <div style={{ fontSize:11, color:'var(--t3)', marginBottom:14, fontFamily:'var(--f-mono)' }}>
                Existing projects with matching ID will be overwritten · New projects will be added
              </div>

              {/* Summary cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10, marginBottom:20 }}>
                {parsed.map((p, i) => {
                  const totalSteps = DEPTS.reduce((a, d) => a + (p.steps?.[d]?.length || 0), 0)
                  const doneSteps  = DEPTS.reduce((a, d) => a + (p.steps?.[d]?.filter(s => s.status === 'done').length || 0), 0)
                  const deptCounts = DEPTS.filter(d => (p.steps?.[d]?.length || 0) > 0)
                    .map(d => `${d}: ${p.steps[d].length}`)

                  return (
                    <div key={i} style={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:'var(--r-md)', padding:'14px 16px' }}>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:12, color:'var(--a)', marginBottom:4 }}>{p.project_code}</div>
                      <div style={{ fontWeight:500, fontSize:13, marginBottom:8 }}>{p.name || p.project_code}</div>
                      <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--t2)', marginBottom:8 }}>
                        {p.cdd && <span>CDD: {fmtDate(p.cdd)}</span>}
                        {p.edd && <span>EDD: {fmtDate(p.edd)}</span>}
                        {p.project_engg && <span>Engg: {p.project_engg}</span>}
                      </div>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--t3)', lineHeight:1.7 }}>
                        {totalSteps} steps total · {doneSteps} done
                        <br />
                        {deptCounts.join(' · ')}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detailed preview table for first project */}
              {parsed.length > 0 && (
                <details>
                  <summary style={{ cursor:'pointer', fontSize:12, color:'var(--t2)', padding:'8px 0', userSelect:'none' }}>
                    ▸ Preview step detail for {parsed[0].project_code}
                  </summary>
                  <div style={{ maxHeight:300, overflowY:'auto', marginTop:10, border:'1px solid var(--b1)', borderRadius:'var(--r-md)' }}>
                    <table style={{ fontSize:11 }}>
                      <thead>
                        <tr>
                          <th>Dept</th>
                          <th>Step Name</th>
                          <th>Action By</th>
                          <th>Original Date</th>
                          <th>Current Date</th>
                          <th>Status</th>
                          <th>History</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DEPTS.flatMap(d =>
                          (parsed[0].steps?.[d] || []).map((s, i) => (
                            <tr key={`${d}-${i}`}>
                              <td style={{ fontFamily:'var(--f-mono)', fontSize:10 }}>
                                <span className="badge b-muted" style={{ fontSize:9 }}>{d}</span>
                              </td>
                              <td style={{ maxWidth:280 }}>{s.name}</td>
                              <td className="mono">{s.action_by || '—'}</td>
                              <td className="mono">{fmtDate(s.original_date)}</td>
                              <td className="mono" style={{ color: s.original_date !== s.current_date && s.current_date ? 'var(--orange)' : '' }}>
                                {fmtDate(s.current_date)}
                              </td>
                              <td>
                                <span className={`badge ${s.status === 'done' ? 'b-green' : s.status === 'inprogress' ? 'b-blue' : 'b-muted'}`} style={{ fontSize:9 }}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="mono">{(s.history || []).length} rev{(s.history || []).length !== 1 ? 's' : ''}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
