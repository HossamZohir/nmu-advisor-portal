import { useState } from 'react'
import { getLang, setLang, type Lang } from '../i18n'

export default function LanguageToggle() {
  const [lang, setLangState] = useState<Lang>(getLang())
  const isAr = lang === 'ar'

  const toggle = () => {
    const newLang: Lang = isAr ? 'en' : 'ar'
    setLang(newLang)
    setLangState(newLang)
    window.location.reload()
  }

  return (
    <button onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted hover:text-primary hover:bg-red-50 transition-all text-sm font-medium border border-border">
      <span className="text-base">{isAr ? '🇬🇧' : '🇪🇬'}</span>
      <span>{isAr ? 'EN' : 'عربي'}</span>
    </button>
  )
}