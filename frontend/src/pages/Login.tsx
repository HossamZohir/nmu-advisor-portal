import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuthStore } from '../store/auth'
import i18n from '../i18n'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [lang, setLang] = useState(i18n.language || 'en')
  const isAr = lang === 'ar'
  const t = (key: string) => i18n.t(key)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleLanguage = () => {
    const newLang = isAr ? 'en' : 'ar'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang
    setLang(newLang)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await login(email, password)
      setAuth({
        user_id: data.user_id,
        name_ar: data.name_ar,
        name_en: data.name_en,
        role: data.role,
        department_id: data.department_id,
      }, data.access_token)
      navigate('/dashboard')
    } catch {
      setError(t('invalid_credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" dir={isAr ? 'rtl' : 'ltr'}>

      {/* LEFT — Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-12 py-16 bg-white">
        <div className="max-w-sm w-full mx-auto animate-fade-in">

          {/* Language Toggle */}
          <div className={`flex mb-8 ${isAr ? 'justify-start' : 'justify-end'}`}>
            <button onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted hover:text-primary hover:bg-red-50 transition-all text-sm font-medium border border-border">
              <span className="text-base">{isAr ? '🇬🇧' : '🇪🇬'}</span>
              <span>{isAr ? 'English' : 'عربي'}</span>
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-text text-4xl font-bold mb-2">{t('academic_advisor_portal')}</h1>
          <p className="text-text-2 text-lg font-normal mb-8">{t('welcome_back')}</p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-text text-sm font-semibold block mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@nmu.edu.eg"
                required
                className="w-full border border-border rounded-xl px-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-all bg-white"
              />
            </div>

            <div>
              <label className="text-text text-sm font-semibold block mb-2">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-border rounded-xl px-4 py-3 pr-12 text-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-all bg-white"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors">
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
              style={{
                background: 'linear-gradient(135deg, #8B141E 0%, #C8293A 100%)',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(139,20,30,0.25)',
                opacity: loading ? 0.8 : 1
              }}>
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  {t('signing_in')}
                </>
              ) : t('sign_in')}
            </button>
          </form>

          <p className="text-muted text-xs text-center mt-8">
            Academic Course Registration System © 2026
          </p>
        </div>
      </div>

      {/* RIGHT — Pattern Panel */}
      <div className="hidden lg:block w-5/12 relative overflow-hidden"
        style={{ background: '#8B141E' }}>
        <div className="absolute inset-0 grid"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden"
              style={{ borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="absolute"
                style={{
                  width: '140%', height: '140%',
                  borderRadius: '0 0 0 100%',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
                  bottom: '-20%', right: '-20%',
                }} />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
          <div className="flex items-center justify-center gap-5 mb-8">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center p-2"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <img src="/university_logo.png" alt="NMU" className="w-full h-full object-contain" />
            </div>
            <div className="w-px h-16 bg-white/20" />
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center p-2"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <img src="/faculty_logo.png" alt="Engineering" className="w-full h-full object-contain" />
            </div>
          </div>

          <h2 className="text-white text-2xl font-bold mb-2">New Mansoura University</h2>
          <p className="text-white/70 text-base font-medium mb-1">Faculty of Engineering</p>
          <p className="text-white/50 text-sm font-arabic mt-2">كلية الهندسة</p>
          <p className="text-white/40 text-xs font-arabic mt-1">جامعة المنصورة الجديدة</p>

          <div className="mt-10 pt-8 border-t border-white/10 w-full">
            <p className="text-white/30 text-xs">
              {isAr ? 'بوابة المرشد الأكاديمي · Academic Advisor Portal' : 'Academic Advisor Portal · بوابة المرشد الأكاديمي'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}