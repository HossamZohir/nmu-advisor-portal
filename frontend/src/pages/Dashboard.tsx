import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import api from '../api/client'

interface Student {
  id: string
  student_id: string
  name_en: string
  name_ar: string
  program_name: string
  current_level: number
  gpa: number
  advisor_id: string | null
}

interface Registration {
  student_id: string
  status: string
  sis_checked: boolean
  payment_checked: boolean
}

interface AdvisorStat {
  advisor_id: string
  advisor_name: string
  total: number
  registered: number
  sis: number
  paid: number
}

interface StudentRow {
  id: string
  student_id: string
  name_en: string
  name_ar: string
  gpa: number
  current_level: number
  program: string
  advisor: string
  advisor_id: string | null
  registration: {
    id: string
    status: string
    sis_checked: boolean
    payment_checked: boolean
    total_credit_hours: number
    courses: { code: string; name_en: string }[]
  } | null
}

interface UserOption {
  id: string
  name_en: string
}

function getGPAColor(gpa: number) {
  if (gpa >= 3.5) return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
  if (gpa >= 2.0) return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
}

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case 'submitted': return { label: 'Submitted', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
    case 'locked': return { label: 'Locked', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' }
    case 'draft': return { label: 'In Progress', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
    default: return { label: 'Not Started', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
  }
}

// ─── ADVISOR DASHBOARD ───────────────────────────────────────────────
function AdvisorDashboard() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [registrations, setRegistrations] = useState<Record<string, Registration>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/students')
      setStudents(res.data)
      const regMap: Record<string, Registration> = {}
      await Promise.all(res.data.map(async (s: Student) => {
        try {
          const r = await api.get(`/registrations/student/${s.id}`)
          regMap[s.id] = r.data
        } catch { }
      }))
      setRegistrations(regMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateFlag = async (studentId: string, field: 'sis_checked' | 'payment_checked', value: boolean) => {
    try {
      await api.patch(`/registrations/student/${studentId}/flags`, { [field]: value })
      setRegistrations(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], [field]: value }
      }))
    } catch (err) { console.error(err) }
  }

  const filtered = students.filter(s =>
    s.name_en.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: students.length,
    submitted: Object.values(registrations).filter(r => r.status === 'submitted' || r.status === 'locked').length,
    inProgress: Object.values(registrations).filter(r => r.status === 'draft').length,
    notStarted: students.length - Object.values(registrations).length,
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-text text-2xl font-bold">My Students</h1>
        <p className="text-muted text-sm mt-1">Manage course registrations for your assigned students</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Students', value: stats.total, icon: '👥', color: '#8B141E' },
          { label: 'Submitted', value: stats.submitted, icon: '✅', color: '#16a34a' },
          { label: 'In Progress', value: stats.inProgress, icon: '📝', color: '#d97706' },
          { label: 'Not Started', value: stats.notStarted, icon: '⏳', color: '#6b7280' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
            </div>
            <p className="text-text-2 text-sm font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Search by name or student ID..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#8B141E" strokeWidth="3" strokeOpacity="0.2"/>
            <path d="M12 2a10 10 0 0110 10" stroke="#8B141E" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((student) => {
            const reg = registrations[student.id]
            const status = getStatusBadge(reg?.status)
            const gpa = getGPAColor(student.gpa)
            return (
              <div key={student.id} className="bg-white rounded-2xl p-5 border border-border hover:border-primary hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-4 cursor-pointer"
                  onClick={() => navigate(`/registration/${student.id}`)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)' }}>
                    {student.name_en.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                    style={{ color: status.color, background: status.bg, borderColor: status.border }}>
                    {status.label}
                  </span>
                </div>
                <div className="cursor-pointer" onClick={() => navigate(`/registration/${student.id}`)}>
                  <h3 className="text-text font-semibold text-sm leading-tight mb-0.5 hover:text-primary transition-colors">
                    {student.name_en}
                  </h3>
                  <p className="text-muted text-xs mb-4">{student.student_id}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-muted text-xs">GPA</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg border"
                      style={{ color: gpa.color, background: gpa.bg, borderColor: gpa.border }}>
                      {student.gpa.toFixed(2)}
                    </span>
                  </div>
                </div>
                {reg && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateFlag(student.id, 'sis_checked', !reg.sis_checked)}
                      className={`flex-1 text-xs px-2 py-1.5 rounded-lg font-medium transition-all border ${reg.sis_checked ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-green-300'}`}>
                      SIS {reg.sis_checked ? '✓' : '✗'}
                    </button>
                    <button
                      onClick={() => updateFlag(student.id, 'payment_checked', !reg.payment_checked)}
                      className={`flex-1 text-xs px-2 py-1.5 rounded-lg font-medium transition-all border ${reg.payment_checked ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-green-300'}`}>
                      Paid {reg.payment_checked ? '✓' : '✗'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate()
  const [advisorStats, setAdvisorStats] = useState<AdvisorStat[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [advisors, setAdvisors] = useState<UserOption[]>([])
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [assignAdvisorId, setAssignAdvisorId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, studentsRes, usersRes] = await Promise.all([
        api.get('/reports/advisor-stats'),
        api.get('/reports/students-table'),
        api.get('/users'),
      ])
      setAdvisorStats(statsRes.data.advisors)
      setSummary(statsRes.data.summary)
      setStudents(studentsRes.data)
      setAdvisors(usersRes.data.filter((u: any) => u.role === 'advisor' && u.is_active))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleStudentSelect = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleAssign = async () => {
    if (!assignAdvisorId || selectedStudents.length === 0) return
    setAssigning(true)
    try {
      await api.post('/students/assign', {
        advisor_id: assignAdvisorId,
        student_ids: selectedStudents,
      })
      setShowAssignModal(false)
      setSelectedStudents([])
      setAssignAdvisorId('')
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setAssigning(false)
    }
  }

  const updateTableFlag = async (studentId: string, field: 'sis_checked' | 'payment_checked', value: boolean) => {
    try {
      await api.patch(`/registrations/student/${studentId}/flags`, { [field]: value })
      setStudents(prev => prev.map(s =>
        s.id === studentId && s.registration
          ? { ...s, registration: { ...s.registration, [field]: value } }
          : s
      ))
    } catch (err) { console.error(err) }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/students/import', formData)
      alert(`✅ Import complete!\nInserted: ${res.data.inserted}\nUpdated: ${res.data.updated}\nSkipped: ${res.data.skipped}${res.data.errors.length ? '\n\nErrors:\n' + res.data.errors.join('\n') : ''}`)
      fetchData()
    } catch (err: any) {
      alert('Import failed: ' + (err.response?.data?.detail || err.message))
    }
    e.target.value = ''
  }

  const filteredStudents = students.filter(s => {
    const matchAdvisor = selectedAdvisor ? s.advisor_id === selectedAdvisor : true
    const matchSearch = s.name_en.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search)
    return matchAdvisor && matchSearch
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#8B141E" strokeWidth="3" strokeOpacity="0.2"/>
        <path d="M12 2a10 10 0 0110 10" stroke="#8B141E" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  )

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-text text-2xl font-bold">Advisors Tracking Dashboard</h1>
          <p className="text-muted text-sm mt-1">Monitor registration progress across all advisors</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Import Button */}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border bg-white hover:bg-surface-2 transition-all cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import Students
            <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          </label>

          {/* Assign Button */}
          {selectedStudents.length > 0 && (
            <button onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)', boxShadow: '0 4px 15px rgba(139,20,30,0.25)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Assign {selectedStudents.length} Students
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Students', value: summary.total_students, icon: '👥', color: '#8B141E' },
            { label: 'Registered', value: `${summary.total_registered} (${summary.total_students ? Math.round(summary.total_registered / summary.total_students * 100) : 0}%)`, icon: '✅', color: '#16a34a' },
            { label: 'SIS Done', value: `${summary.total_sis} (${summary.total_students ? Math.round(summary.total_sis / summary.total_students * 100) : 0}%)`, icon: '🖥️', color: '#2563eb' },
            { label: 'Paid', value: `${summary.total_paid} (${summary.total_students ? Math.round(summary.total_paid / summary.total_students * 100) : 0}%)`, icon: '💳', color: '#7c3aed' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
              <p className="text-text-2 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Advisor Filter Pills */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSelectedAdvisor(null)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: !selectedAdvisor ? 'linear-gradient(135deg, #8B141E, #C8293A)' : '#F5F5F7',
              color: !selectedAdvisor ? 'white' : '#555'
            }}>
            All Advisors
          </button>
          {advisorStats.map(a => (
            <button key={a.advisor_id}
              onClick={() => setSelectedAdvisor(a.advisor_id === selectedAdvisor ? null : a.advisor_id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all border"
              style={{
                background: selectedAdvisor === a.advisor_id ? '#fdf2f3' : 'white',
                color: selectedAdvisor === a.advisor_id ? '#8B141E' : '#555',
                borderColor: selectedAdvisor === a.advisor_id ? '#8B141E' : '#E5E5E5'
              }}>
              {a.advisor_name}
              <span className="ml-2 text-xs opacity-60">{a.total}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-text font-bold">
              {selectedAdvisor
                ? `Students — ${advisorStats.find(a => a.advisor_id === selectedAdvisor)?.advisor_name}`
                : 'All Students'}
            </h2>
            <p className="text-muted text-xs mt-0.5">
              {filteredStudents.length} students
              {selectedStudents.length > 0 && (
                <span className="ml-2 text-primary font-semibold">{selectedStudents.length} selected</span>
              )}
            </p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search student..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-2 border border-border rounded-xl pl-8 pr-3 py-2 text-text text-xs focus:outline-none focus:border-primary w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    onChange={(e) => setSelectedStudents(e.target.checked ? filteredStudents.map(s => s.id) : [])}
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Advisor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">GPA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Registered Courses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Hours</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">SIS</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Paid</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((s, i) => {
                const status = getStatusBadge(s.registration?.status)
                const gpa = getGPAColor(s.gpa)
                const isSelected = selectedStudents.includes(s.id)
                return (
                  <tr key={s.id}
                    className={`transition-colors ${isSelected ? 'bg-red-50' : 'hover:bg-surface-2'}`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleStudentSelect(s.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-4 text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-4 cursor-pointer" onClick={() => navigate(`/registration/${s.id}`)}>
                      <p className="text-text text-sm font-semibold hover:text-primary transition-colors">{s.name_en}</p>
                      <p className="text-muted text-xs">{s.program?.split(' ')[0]} Engineering</p>
                    </td>
                    <td className="px-4 py-4 text-text-2 text-xs font-mono">{s.student_id}</td>
                    <td className="px-4 py-4 text-text-2 text-xs">{s.advisor}</td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg border"
                        style={{ color: gpa.color, background: gpa.bg, borderColor: gpa.border }}>
                        {s.gpa?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {s.registration?.courses?.slice(0, 4).map(c => (
                          <span key={c.code} className="text-xs bg-red-50 text-primary px-2 py-0.5 rounded-lg font-medium">
                            {c.code}
                          </span>
                        ))}
                        {(s.registration?.courses?.length || 0) > 4 && (
                          <span className="text-xs bg-gray-100 text-muted px-2 py-0.5 rounded-lg">
                            +{(s.registration?.courses?.length || 0) - 4}
                          </span>
                        )}
                        {!s.registration?.courses?.length && <span className="text-muted text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-2 text-xs font-semibold">
                      {s.registration?.total_credit_hours || '—'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {s.registration ? (
                        <button
                          onClick={() => updateTableFlag(s.id, 'sis_checked', !s.registration!.sis_checked)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${s.registration.sis_checked ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                          {s.registration.sis_checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {s.registration ? (
                        <button
                          onClick={() => updateTableFlag(s.id, 'payment_checked', !s.registration!.payment_checked)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${s.registration.payment_checked ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                          {s.registration.payment_checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                        style={{ color: status.color, background: status.bg, borderColor: status.border }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-fade-in">
            <h2 className="text-text text-lg font-bold mb-2">Assign Students</h2>
            <p className="text-muted text-sm mb-6">Assign {selectedStudents.length} selected students to an advisor</p>
            <label className="text-text text-sm font-semibold block mb-2">Select Advisor</label>
            <select value={assignAdvisorId} onChange={(e) => setAssignAdvisorId(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-primary bg-white mb-6">
              <option value="">Choose an advisor...</option>
              {advisors.map(a => (
                <option key={a.id} value={a.id}>{a.name_en}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowAssignModal(false)}
                className="flex-1 py-3 rounded-xl border border-border text-text-2 text-sm font-semibold hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button onClick={handleAssign} disabled={!assignAdvisorId || assigning}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)', opacity: (!assignAdvisorId || assigning) ? 0.6 : 1 }}>
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'dept_admin' || user?.role === 'dean'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F7' }}>
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/faculty_logo.png" alt="NMU" className="w-9 h-9 object-contain" />
            <div className="w-px h-6 bg-border" />
            <div>
              <p className="text-text text-sm font-bold leading-tight">NMU Advisor Portal</p>
              <p className="text-muted text-xs leading-tight">Faculty of Engineering</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-text text-sm font-semibold">{user?.name_en}</p>
              <p className="text-muted text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)' }}>
              {user?.name_en?.charAt(0)}
            </div>
            {isAdmin && (
              <button onClick={() => navigate('/users')}
                className="flex items-center gap-2 text-muted hover:text-primary text-sm transition-colors px-3 py-2 rounded-lg hover:bg-red-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                Users
              </button>
            )}
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-muted hover:text-primary text-sm transition-colors px-3 py-2 rounded-lg hover:bg-red-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {isAdmin ? <AdminDashboard /> : <AdvisorDashboard />}
    </div>
  )
}