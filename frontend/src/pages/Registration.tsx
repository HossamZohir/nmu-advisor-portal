import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

interface Course {
  id: string
  code: string
  name_en: string
  credit_hours: number
  prerequisites: string[]
}

interface RegistrationCourse {
  course_id: string
  code: string
  name_en: string
  credit_hours: number
}

interface Registration {
  id: string
  student_id: string
  student_name_en: string
  student_name_ar: string
  semester_id: string
  status: string
  total_credit_hours: number
  sis_checked: boolean
  payment_checked: boolean
  courses: RegistrationCourse[]
}

interface Student {
  id: string
  student_id: string
  name_en: string
  name_ar: string
  program_name: string
  current_level: number
  gpa: number
  passed_courses: string[]
  failed_courses: string[]
}

export default function Registration() {
  const { studentId } = useParams()
  const navigate = useNavigate()

  const [student, setStudent] = useState<Student | null>(null)
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [activeSemester, setActiveSemester] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => { fetchAll() }, [studentId])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [studentRes, semRes] = await Promise.all([
        api.get(`/students/${studentId}`),
        api.get('/semesters/active').catch(() => ({ data: null }))
      ])
      setStudent(studentRes.data)
      setActiveSemester(semRes.data)
      if (semRes.data) {
        const [regRes, coursesRes] = await Promise.all([
          api.get(`/registrations/student/${studentId}`),
          api.get(`/courses/semester/${semRes.data.id}?program_id=${studentRes.data.program_id}`)
        ])
        setRegistration(regRes.data)
        setAvailableCourses(coursesRes.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addCourse = async (courseId: string) => {
    setAdding(courseId)
    setError('')
    try {
      const res = await api.post(`/registrations/student/${studentId}/add-course`, { course_id: courseId })
      setRegistration(res.data)
      showSuccess('Course added successfully')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add course')
    } finally {
      setAdding(null)
    }
  }

  const removeCourse = async (courseId: string) => {
    setRemoving(courseId)
    setError('')
    try {
      const res = await api.delete(`/registrations/student/${studentId}/remove-course/${courseId}`)
      setRegistration(res.data)
      showSuccess('Course removed')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove course')
    } finally {
      setRemoving(null)
    }
  }

  const submitRegistration = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post(`/registrations/student/${studentId}/submit`)
      setRegistration(res.data)
      showSuccess('Registration submitted successfully!')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const updateFlags = async (field: 'sis_checked' | 'payment_checked', value: boolean) => {
    try {
      const res = await api.patch(`/registrations/student/${studentId}/flags`, { [field]: value })
      setRegistration(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const registeredCourseIds = new Set(registration?.courses.map(c => c.course_id) || [])
  const passedCodes = new Set(student?.passed_courses || [])
  const failedCodes = new Set(student?.failed_courses || [])

  const maxCredits = student && student.gpa < 2.0 ? 14 : 18
  const currentCredits = registration?.total_credit_hours || 0
  const creditPercent = Math.min((currentCredits / maxCredits) * 100, 100)

  const filteredCourses = availableCourses.filter(c =>
    !registeredCourseIds.has(c.id) &&
    (c.name_en.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()))
  )

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    const aFailed = failedCodes.has(a.code) ? -1 : 0
    const bFailed = failedCodes.has(b.code) ? -1 : 0
    return aFailed - bFailed
  })

  const isLocked = registration?.status === 'locked'
  const isSubmitted = registration?.status === 'submitted'
  const canEdit = !isLocked && activeSemester

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F7' }}>
        <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#8B141E" strokeWidth="3" strokeOpacity="0.2"/>
          <path d="M12 2a10 10 0 0110 10" stroke="#8B141E" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F7' }}>

      {/* Print-only header */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h1 className="text-xl font-bold">New Mansoura University — Faculty of Engineering</h1>
        <h2 className="text-lg font-semibold mt-1">Course Registration Form</h2>
        <p className="text-sm mt-2">Student: <strong>{student?.name_en}</strong> ({student?.name_ar})</p>
        <p className="text-sm">ID: <strong>{student?.student_id}</strong> | Program: <strong>{student?.program_name}</strong></p>
        <p className="text-sm">Level: <strong>{student?.current_level}</strong> | GPA: <strong>{student?.gpa.toFixed(2)}</strong> | Semester: <strong>{activeSemester?.name}</strong></p>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted hover:text-primary transition-colors text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
            <div className="w-px h-5 bg-border" />
            <div>
              <p className="text-text text-sm font-bold">{student?.name_en}</p>
              <p className="text-muted text-xs">{student?.student_id} · {student?.program_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isLocked ? 'bg-gray-50 text-gray-500 border-gray-200' :
              isSubmitted ? 'bg-green-50 text-green-700 border-green-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isLocked ? '🔒 Locked' : isSubmitted ? '✅ Submitted' : '📝 Draft'}
            </span>
            {activeSemester && (
              <span className="text-xs text-muted bg-surface-2 px-3 py-1.5 rounded-full border border-border">
                {activeSemester.name}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">

        {/* LEFT — Available Courses */}
        <div className="flex-1 min-w-0 print:hidden">
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-text font-bold text-sm">Available Courses</h2>
                <p className="text-muted text-xs mt-0.5">{sortedCourses.length} courses available this semester</p>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Search courses..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-surface-2 border border-border rounded-xl pl-8 pr-3 py-2 text-text text-xs focus:outline-none focus:border-primary transition-all w-48"
                />
              </div>
            </div>

            <div className="divide-y divide-border max-h-[calc(100vh-280px)] overflow-y-auto">
              {sortedCourses.length === 0 ? (
                <div className="text-center py-12 text-muted text-sm">
                  {search ? 'No courses match your search' : 'No available courses for this semester'}
                </div>
              ) : sortedCourses.map((course) => {
                const isFailed = failedCodes.has(course.code)
                const isPassed = passedCodes.has(course.code)
                const isAdding = adding === course.id
                return (
                  <div key={course.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-primary bg-red-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                        {course.code}
                      </span>
                      <div className="min-w-0">
                        <p className="text-text text-sm font-medium truncate">{course.name_en}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-muted text-xs">{course.credit_hours} cr</span>
                          {course.prerequisites.length > 0 && (
                            <span className="text-muted text-xs">· Pre: {course.prerequisites.join(', ')}</span>
                          )}
                          {isFailed && (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              تحسين
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && !isPassed && (
                      <button onClick={() => addCourse(course.id)} disabled={!!adding}
                        className="flex-shrink-0 ml-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)' }}>
                        {isAdding ? (
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                            <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Selected Courses + Info */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 print:w-full">

          {/* Student Info */}
          <div className="bg-white rounded-2xl border border-border p-5 print:rounded-none print:border-0 print:p-0 print:hidden">
            <h3 className="text-text font-bold text-sm mb-3">Student Info</h3>
            <div className="space-y-2">
              {[
                { label: 'Level', value: `Semester ${student?.current_level}` },
                { label: 'GPA', value: student?.gpa.toFixed(2), color: student && student.gpa < 2.0 ? '#dc2626' : '#16a34a' },
                { label: 'Max Credits', value: `${maxCredits} hours`, color: student && student.gpa < 2.0 ? '#dc2626' : undefined },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-muted text-xs">{item.label}</span>
                  <span className="text-xs font-semibold" style={{ color: item.color || '#1A1A1A' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-muted text-xs">Credit Hours</span>
                <span className="text-xs font-bold text-text">{currentCredits} / {maxCredits}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${creditPercent}%`,
                    background: creditPercent >= 100 ? '#dc2626' : creditPercent >= 80 ? '#d97706' : '#8B141E'
                  }} />
              </div>
            </div>
          </div>

          {/* Selected Courses */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-text font-bold text-sm">Selected Courses</h3>
              <p className="text-muted text-xs mt-0.5">{registration?.courses.length || 0} courses · {currentCredits} credit hours</p>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto print:max-h-none">
              {!registration?.courses.length ? (
                <div className="text-center py-8 text-muted text-xs">No courses selected yet</div>
              ) : registration.courses.map((course) => (
                <div key={course.course_id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-text text-xs font-semibold">{course.code}</p>
                    <p className="text-muted text-xs truncate w-44">{course.name_en}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{course.credit_hours}cr</span>
                    {canEdit && (
                      <button onClick={() => removeCourse(course.course_id)} disabled={!!removing}
                        className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors print:hidden">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Print total */}
            {registration && registration.courses.length > 0 && (
              <div className="px-5 py-3 border-t border-border bg-surface-2 flex justify-between">
                <span className="text-text text-xs font-bold">Total Credit Hours</span>
                <span className="text-primary text-xs font-bold">{currentCredits} / {maxCredits}</span>
              </div>
            )}
          </div>

          {/* Flags */}
          {registration && (
            <div className="bg-white rounded-2xl border border-border p-5 print:hidden">
              <h3 className="text-text font-bold text-sm mb-3">Status Flags</h3>
              <div className="space-y-3">
                {[
                  { key: 'sis_checked' as const, label: 'Registered in SIS', checked: registration.sis_checked },
                  { key: 'payment_checked' as const, label: 'Invoice Paid', checked: registration.payment_checked },
                ].map(flag => (
                  <label key={flag.key} className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => updateFlags(flag.key, !flag.checked)}
                      className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                      style={{ background: flag.checked ? '#8B141E' : 'white', borderColor: flag.checked ? '#8B141E' : '#E5E5E5' }}>
                      {flag.checked && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-text text-xs font-medium">{flag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-xs print:hidden">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-xs print:hidden">
              {successMsg}
            </div>
          )}

          {/* Print Button */}
          {registration && registration.courses.length > 0 && (
            <button onClick={handlePrint}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-border bg-white hover:bg-surface-2 print:hidden">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Registration Form
            </button>
          )}

          {/* Submit Button */}
          {canEdit && !isSubmitted && (
            <button onClick={submitRegistration}
              disabled={submitting || !registration?.courses.length}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 print:hidden"
              style={{
                background: (!registration?.courses.length) ? '#ccc' : 'linear-gradient(135deg, #8B141E, #C8293A)',
                boxShadow: (!registration?.courses.length) ? 'none' : '0 4px 15px rgba(139,20,30,0.25)',
                cursor: (!registration?.courses.length) ? 'not-allowed' : 'pointer'
              }}>
              {submitting ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Submitting...
                </>
              ) : 'Submit Registration'}
            </button>
          )}

          {isSubmitted && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm text-center font-semibold print:hidden">
              ✅ Registration Submitted
            </div>
          )}

          {isLocked && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm text-center font-semibold print:hidden">
              🔒 Registration Locked
            </div>
          )}

          {/* Print signature section */}
          {registration && registration.courses.length > 0 && (
            <div className="hidden print:block mt-8 pt-6 border-t">
              <div className="flex justify-between text-sm">
                <div className="text-center">
                  <div className="h-10" />
                  <p>Student Signature</p>
                  <p className="text-xs text-gray-500 mt-1">{student?.name_en}</p>
                </div>
                <div className="text-center">
                  <div className="h-10" />
                  <p>Advisor Signature</p>
                </div>
                <div className="text-center">
                  <div className="h-10" />
                  <p>Department Approval</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}