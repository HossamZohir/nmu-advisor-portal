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
  registration: {
    status: string
    sis_checked: boolean
    payment_checked: boolean
    total_credit_hours: number
    courses: { code: string; name_en: string }[]
  } | null
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
  const { user } = useAuthStore()
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
      try {
        const regMap: Record<string, Registration> = {}
        await Promise.all(res.data.map(async (s: Student) => {
          try {
            const r = await api.get(`/registrations/student/${s.id}`)
            regMap[s.id] = r.data
          } catch { }
        }))
        setRegistrations(regMap)
      } catch { }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
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

      {/* Stats */}
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

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Search by name or student ID..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {/* Cards */}
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
              <div key={student.id}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(`/registration/${student.id}`)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)' }}>
                    {student.name_en.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                    style={{ color: status.color, background: status.bg, borderColor: status.border }}>
                    {status.label}
                  </span>
                </div>
                <h3 className="text-text font-semibold text-sm leading-tight mb-0.5 group-hover:text-primary transition-colors">
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
                {reg && (
                  <div className="flex gap-2 mt-3">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${reg.sis_checked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      SIS {reg.sis_checked ? '✓' : '✗'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${reg.payment_checked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      Paid {reg.payment_checked ? '✓' : '✗'}
                    </span>
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
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, studentsRes] = await Promise.all([
        api.get('/reports/advisor-stats'),
        api.get('/reports/students-table'),
      ])
      setAdvisorStats(statsRes.data.advisors)
      setSummary(statsRes.data.summary)
      setStudents(studentsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(s => {
    const matchAdvisor = selectedAdvisor ? s.advisor === advisorStats.find(a => a.advisor_id === selectedAdvisor)?.advisor_name : true
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

      {/* Title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-text text-2xl font-bold">Advisors Tracking Dashboard</h1>
          <p className="text-muted text-sm mt-1">Monitor registration progress across all advisors</p>
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
          <button
            onClick={() => setSelectedAdvisor(null)}
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
            <p className="text-muted text-xs mt-0.5">{filteredStudents.length} students</p>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Student</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Advisor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">GPA</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Registered Courses</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Hours</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-muted">SIS</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-muted">Paid</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((s, i) => {
                const status = getStatusBadge(s.registration?.status)
                const gpa = getGPAColor(s.gpa)
                return (
                  <tr key={s.id}
                    className="hover:bg-surface-2 transition-colors cursor-pointer"
                    onClick={() => navigate(`/registration/${s.id}`)}>
                    <td className="px-6 py-4 text-muted text-xs">{i + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-text text-sm font-semibold">{s.name_en}</p>
                      <p className="text-muted text-xs">{s.program?.split(' ')[0]} Engineering</p>
                    </td>
                    <td className="px-6 py-4 text-text-2 text-xs font-mono">{s.student_id}</td>
                    <td className="px-6 py-4 text-text-2 text-xs">{s.advisor}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg border"
                        style={{ color: gpa.color, background: gpa.bg, borderColor: gpa.border }}>
                        {s.gpa?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
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
                        {!s.registration?.courses?.length && (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-2 text-xs font-semibold">
                      {s.registration?.total_credit_hours || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.registration?.sis_checked
                        ? <span className="text-green-600 text-sm">✓</span>
                        : <span className="text-gray-300 text-sm">✗</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.registration?.payment_checked
                        ? <span className="text-green-600 text-sm">✓</span>
                        : <span className="text-gray-300 text-sm">✗</span>}
                    </td>
                    <td className="px-6 py-4">
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
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/university_logo.png" alt="NMU" className="w-9 h-9 object-contain" />
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