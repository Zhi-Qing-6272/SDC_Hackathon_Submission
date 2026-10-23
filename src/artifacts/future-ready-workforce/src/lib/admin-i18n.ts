import { createContext, useContext, useMemo } from 'react';

// Languages for the company administrator workspace: English, Bahasa Malaysia and Chinese (Simplified).
// English text is the key: t('Skill gaps'). A missing translation falls back to English, so a gap never breaks a page.
// Values the administrator typed (company name, team names, employee names) are never translated.
export type Lang = 'EN' | 'BM' | '中文';
export const LANGS: { id: Lang; label: string }[] = [{ id: 'EN', label: 'EN · English' }, { id: 'BM', label: 'BM · Bahasa Malaysia' }, { id: '中文', label: '中文 · Chinese' }];
export const AdminLang = createContext<Lang>('EN');

type Dict = Record<string, string>;
import { BM, ZH } from './admin-dict';

const fill = (s: string, vars?: Record<string, string | number>) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s);
export const translate = (lang: Lang, en: string, vars?: Record<string, string | number>) => fill((lang === 'BM' ? BM[en] : lang === '中文' ? ZH[en] : undefined) ?? en, vars);

export function useT() {
  const lang = useContext(AdminLang);
  return useMemo(() => {
    const t = (en: string, vars?: Record<string, string | number>) => translate(lang, en, vars);
    // Plural: pass both English forms; each language has its own entry for each form.
    const tp = (n: number, one: string, many: string) => translate(lang, n === 1 ? one : many, { n });
    return { t, tp, lang };
  }, [lang]);
}

// Names of things that come from Nexora itself (skills, roles, industries, the made-up test teams and job titles).
const lookup = (lang: Lang, group: Record<string, [string, string]>, en: string) => { const e = group[en]; return !e || lang === 'EN' ? en : lang === 'BM' ? e[0] : e[1]; };
import { SKILL_NAMES, ROLE_NAMES, INDUSTRY_NAMES, TEAM_NAMES, POSITION_NAMES } from './admin-dict';
export function useNames() {
  const lang = useContext(AdminLang);
  return useMemo(() => ({
    skill: (s: string) => lookup(lang, SKILL_NAMES, s),
    role: (title: string) => lookup(lang, ROLE_NAMES, title),
    industry: (s: string) => lookup(lang, INDUSTRY_NAMES, s),
    team: (s: string) => lookup(lang, TEAM_NAMES, s),
    position: (s: string) => lookup(lang, POSITION_NAMES, s),
  }), [lang]);
}
export type { Dict };
