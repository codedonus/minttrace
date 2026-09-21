import { useEffect, useState } from 'react';
import { detectLocale, localize } from './i18n';
import type { Locale } from './types';

export function useLanguage() {
  const [preference, setPreference] = useState<'auto' | Locale>(() => {
    const saved = localStorage.getItem('minttrace-language');
    return saved === 'zh' || saved === 'en' ? saved : 'auto';
  });
  const [browserLocale, setBrowserLocale] = useState(() => detectLocale(navigator.languages || [navigator.language]));
  const locale = preference === 'auto' ? browserLocale : preference;
  useEffect(() => {
    const changed = () => setBrowserLocale(detectLocale(navigator.languages || [navigator.language]));
    addEventListener('languagechange', changed);
    return () => removeEventListener('languagechange', changed);
  }, []);
  useEffect(() => { document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'; }, [locale]);
  function language(value: string) {
    const next = value === 'zh' || value === 'en' ? value : 'auto';
    setPreference(next);
    if (next === 'auto') localStorage.removeItem('minttrace-language');
    else localStorage.setItem('minttrace-language', next);
  }
  return { locale, preference, language, pair: (zh: string, en: string) => localize(locale, zh, en) };
}

export function LanguagePicker({ preference, language, locale }: Pick<ReturnType<typeof useLanguage>, 'preference' | 'language' | 'locale'>) {
  return <select className="language-select" aria-label={locale === 'zh' ? '语言' : 'Language'} value={preference} onChange={e => language(e.target.value)}>
    <option value="auto">{locale === 'zh' ? '跟随浏览器' : 'Browser default'}</option>
    <option value="zh">中文</option><option value="en">English</option>
  </select>;
}
