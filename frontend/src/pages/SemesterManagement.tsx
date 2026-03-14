import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

interface Semester {
  id: string
  name: string
  is_active: boolean
  window_open_at: string | null
  window_close_at: string | null
}

interface Course {
  id: string
  code: string
  name_en: string
  credit_hours: number
  prerequisites: string[]
}

export default function SemesterManagement() {
  const navigate = useNavigate()
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [activatedCourses, setActivatedCourses] = useState<Course[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [windowLoading, setWindowLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSemesterName, setNewSemesterName] = useState('')
  const [creating, setCreating] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [selectedTab, setSelectedTab] = useState<'semesters' | 'courses'>('semesters')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [semRes, coursesRes] = await Promise.all([
        api.get('/semesters'),
        api.get('/courses'),
      ])
      setSemesters(semRes.data)
      setAllCourses(coursesRes.data)

      const active = semRes.data.find((s: Semester) => s.is_active)
      if (active) {
        setActiveSemester(active)
        const activatedRes = await api.get(`/courses/semester/${active.id}`)
        setActivatedCourses(activatedRes.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createSemester = async () => {
    if (!newSemesterName.trim()) return
    setCreating(true)
    try {
      await api.post('/semesters', { name: newSemesterName })
      setShowCreateModal(false)
      setNewSemesterName('')
      showSuccess('Semester created successfully')
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create semester')
    } finally {
      setCreating(false)
    }
  }

  const activateSemester = async (semesterId: string) => {
    if (!confirm('This will deactivate the current active semester. Continue?')) return
    setActivating(true)
    try {
      await api.patch(`/semesters/${semesterId}/activate`)
      showSuccess('Semester activated')
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to activate')
    } finally {
      setActivating(false)
    }
  }

  const toggleWindow = async (action: 'open' | 'close') => {
    if (!activeSemester) return
    setWindowLoading(true)
    try {
      await api.patch(`/semesters/${activeSemester.id}/window?action=${action}`)
      showSuccess(`Registration window ${action}ed`)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed')
    } finally {
      setWindowLoading(false)
    }
  }

  const toggleCourse = async (course: Course) => {
    if (!activeSemester) return
    const isActivated = activatedCourses.some(c => c.id === course.id)
    try {
      if (isActivated) {
        await api.delete(`/semesters/${activeSemester.id}/courses/${course.id}`)
        setActivatedCourses(prev => prev.filter(c => c.id !== course.id))
      } else {
        await api.post(`/semesters/${activeSemester.id}/courses`, { course_ids: [course.id] })
        setActivatedCourses(prev => [...prev, course])
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle course')
    }
  }

  const activateAllFiltered = async () => {
    if (!activeSemester) return
    const notActivated = filteredCourses.filter(c => !activatedCourses.some(ac => ac.id === c.id))
    if (notActivated.length === 0) {
      alert('All filtered courses are already activated')
      return
    }
    try {
      await api.post(`/semesters/${activeSemester.id}/courses`, {
        course_ids: notActivated.map(c => c.id)
      })
      setActivatedCourses(prev => [...prev, ...notActivated])
      showSuccess(`${notActivated.length} courses activated`)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed')
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const isWindowOpen = () => {
    if (!activeSemester?.window_open_at) return false
    const now = new Date()
    const openAt = new Date(activeSemester.window_open_at)
    if (now < openAt) return false
    if (activeSemester.window_close_at) {
      const closeAt = new Date(activeSemester.window_close_at)
      if (now > closeAt) return false
    }
    return true
  }

  const filteredCourses = allCourses.filter(c =>
    c.name_en.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F7' }}>
      <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#8B141E" strokeWidth="3" strokeOpacity="0.2"/>
        <path d="M12 2a10 10 0 0110 10" stroke="#8B141E" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F7' }}>

      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted hover:text-primary transition-colors text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Dashboard
            </button>
            <div className="w-px h-5 bg-border" />
            <div>
              <p className="text-text text-sm font-bold">Semester Management</p>
              <p className="text-muted text-xs">Create semesters and manage activated courses</p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)', boxShadow: '0 4px 15px rgba(139,20,30,0.25)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Semester
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-6">
            ✅ {successMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['semesters', 'courses'] as const).map(tab => (
            <button key={tab} onClick={() => setSelectedTab(tab)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize"
              style={{
                background: selectedTab === tab ? 'linear-gradient(135deg, #8B141E, #C8293A)' : 'white',
                color: selectedTab === tab ? 'white' : '#555',
                border: selectedTab === tab ? 'none' : '1px solid #E5E5E5'
              }}>
              {tab === 'semesters' ? '📅 Semesters' : '📚 Course Activation'}
            </button>
          ))}
        </div>

        {/* ── SEMESTERS TAB ── */}
        {selectedTab === 'semesters' && (
          <div className="space-y-4">
            {activeSemester && (
              <div className="bg-white rounded-2xl border-2 border-primary p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-text font-bold text-lg">{activeSemester.name}</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                      Active
                    </span>
                    {isWindowOpen() && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        🟢 Window Open
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isWindowOpen() ? (
                      <button onClick={() => toggleWindow('close')} disabled={windowLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                        🔒 Close Registration Window
                      </button>
                    ) : (
                      <button onClick={() => toggleWindow('open')} disabled={windowLoading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                        🟢 Open Registration Window
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Window Opened', value: formatDate(activeSemester.window_open_at) },
                    { label: 'Window Closed', value: formatDate(activeSemester.window_close_at) },
                    { label: 'Activated Courses', value: `${activatedCourses.length} courses` },
                  ].map(item => (
                    <div key={item.label} className="bg-surface-2 rounded-xl p-3">
                      <p className="text-muted text-xs mb-1">{item.label}</p>
                      <p className="text-text text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-text font-bold">All Semesters</h2>
                <p className="text-muted text-xs mt-0.5">{semesters.length} semesters total</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-2 border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Semester</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Window Opened</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Window Closed</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {semesters.map(sem => (
                    <tr key={sem.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-text text-sm font-semibold">{sem.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sem.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {sem.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-2 text-xs">{formatDate(sem.window_open_at)}</td>
                      <td className="px-6 py-4 text-text-2 text-xs">{formatDate(sem.window_close_at)}</td>
                      <td className="px-6 py-4 text-right">
                        {!sem.is_active && (
                          <button onClick={() => activateSemester(sem.id)} disabled={activating}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-all">
                            Set Active
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── COURSES TAB ── */}
        {selectedTab === 'courses' && (
          <div>
            {!activeSemester ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <p className="text-amber-700 font-semibold">No active semester</p>
                <p className="text-amber-600 text-sm mt-1">Create and activate a semester first to manage courses</p>
              </div>
            ) : (
              <div className="flex gap-6">
                <div className="flex-1 bg-white rounded-2xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-text font-bold text-sm">All Courses</h2>
                        <p className="text-muted text-xs mt-0.5">{filteredCourses.length} courses</p>
                      </div>
                      <button onClick={activateAllFiltered}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)' }}>
                        Activate All Filtered
                      </button>
                    </div>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input type="text" placeholder="Search by code or name..."
                        value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)}
                        className="w-full bg-surface-2 border border-border rounded-xl pl-8 pr-3 py-2 text-text text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                    {filteredCourses.map(course => {
                      const isActivated = activatedCourses.some(c => c.id === course.id)
                      return (
                        <div key={course.id}
                          className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-primary bg-red-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                              {course.code}
                            </span>
                            <div>
                              <p className="text-text text-xs font-medium">{course.name_en}</p>
                              <p className="text-muted text-xs">{course.credit_hours} cr hrs
                                {course.prerequisites.length > 0 && ` · Pre: ${course.prerequisites.join(', ')}`}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => toggleCourse(course)}
                            className={`flex-shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              isActivated
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                : 'bg-surface-2 text-muted border-border hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                            }`}>
                            {isActivated ? '✓ Active' : '+ Activate'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="w-72 flex-shrink-0">
                  <div className="bg-white rounded-2xl border border-border overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="text-text font-bold text-sm">Activated for {activeSemester.name}</h3>
                        <p className="text-muted text-xs mt-0.5">{activatedCourses.length} courses</p>
                      </div>
                      {activatedCourses.length > 0 && (
                        <span className="text-xs font-bold text-primary">
                          {activatedCourses.reduce((sum, c) => sum + c.credit_hours, 0)} cr
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                      {activatedCourses.length === 0 ? (
                        <div className="text-center py-8 text-muted text-xs">No courses activated yet</div>
                      ) : activatedCourses.map(course => (
                        <div key={course.id} className="flex items-center justify-between px-4 py-2.5">
                          <div>
                            <p className="text-xs font-bold text-primary">{course.code}</p>
                            <p className="text-muted text-xs truncate w-40">{course.name_en}</p>
                          </div>
                          <button onClick={() => toggleCourse(course)}
                            className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3">
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Semester Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-fade-in">
            <h2 className="text-text text-lg font-bold mb-2">Create New Semester</h2>
            <p className="text-muted text-sm mb-6">Enter a name for the new semester</p>
            <label className="text-text text-sm font-semibold block mb-2">Semester Name</label>
            <input type="text" value={newSemesterName}
              onChange={(e) => setNewSemesterName(e.target.value)}
              placeholder="e.g. Fall 2026, Spring 2027"
              className="w-full border border-border rounded-xl px-4 py-3 text-text text-sm focus:outline-none focus:border-primary mb-6"
              onKeyDown={(e) => e.key === 'Enter' && createSemester()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl border border-border text-text-2 text-sm font-semibold hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button onClick={createSemester} disabled={!newSemesterName.trim() || creating}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)', opacity: (!newSemesterName.trim() || creating) ? 0.6 : 1 }}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}