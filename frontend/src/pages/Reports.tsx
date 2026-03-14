import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import api from '../api/client'

interface ReportCard {
  title: string
  description: string
  icon: string
  endpoint: string
  color: string
}

const reports: ReportCard[] = [
  {
    title: 'Full Registration Report',
    description: 'All students with their registered courses, credit hours, SIS and payment status for the active semester.',
    icon: '📋',
    endpoint: '/exports/registrations',
    color: '#8B141E',
  },
  {
    title: 'Unregistered Students',
    description: 'List of students who have not started their registration for the active semester.',
    icon: '⚠️',
    endpoint: '/exports/unregistered',
    color: '#d97706',
  },
  {
    title: 'Advisor Summary',
    description: 'Per-advisor breakdown showing total students, registered, SIS done, and payment status.',
    icon: '👥',
    endpoint: '/exports/advisor-summary',
    color: '#2563eb',
  },
]

export default function Reports() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (endpoint: string, title: string) => {
    setDownloading(endpoint)
    try {
      const response = await api.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${title.replace(/ /g, '_')}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download report. Make sure there is an active semester.')
    } finally {
      setDownloading(null)
    }
  }

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
              <p className="text-text text-sm font-bold">Reports & Exports</p>
              <p className="text-muted text-xs">Download Excel reports for the active semester</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-text text-sm font-semibold">{user?.name_en}</p>
              <p className="text-muted text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #8B141E, #C8293A)' }}>
              {user?.name_en?.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-text text-2xl font-bold">Reports & Exports</h1>
          <p className="text-muted text-sm mt-1">
            Download Excel reports for the current active semester
          </p>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.endpoint}
              className="bg-white rounded-2xl border border-border p-6 hover:shadow-md transition-all">

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ background: `${report.color}15` }}>
                {report.icon}
              </div>

              {/* Content */}
              <h3 className="text-text font-bold text-base mb-2">{report.title}</h3>
              <p className="text-muted text-sm leading-relaxed mb-6">{report.description}</p>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(report.endpoint, report.title)}
                disabled={downloading === report.endpoint}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${report.color}, ${report.color}cc)`,
                  opacity: downloading === report.endpoint ? 0.7 : 1,
                  boxShadow: `0 4px 15px ${report.color}30`
                }}
              >
                {downloading === report.endpoint ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Excel
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563eb" className="flex-shrink-0 mt-0.5">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 0112 7zm0 10a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
          <div>
            <p className="text-blue-800 text-sm font-semibold">Active Semester Required</p>
            <p className="text-blue-600 text-xs mt-0.5">
              All reports are generated for the currently active semester. Make sure a semester is active and its registration window has been opened before downloading reports.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}