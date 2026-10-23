import { DIRECTIONS, ROUTINE_PRONE, TECHNICAL } from '@/lib/discovery';

/**
 * AI risk to jobs and pay.
 *
 * Baseline numbers are US Bureau of Labor Statistics (BLS) Occupational Outlook Handbook figures:
 * projected employment change 2025-35 and median annual pay (May 2025). They are US data and BLS
 * projections, not forecasts for any other country. Each Nexora direction is matched to the closest
 * BLS occupation, so some directions share one.
 *
 * The arrows per threat are a simple rule of thumb built on those numbers and on the skill mix of
 * each direction (see `effects`). They are planning assumptions, not predictions.
 */
export type Mix = { r: number; t: number; tasky: boolean };
export type Occ = { name: string; jobs: number; growth: number; pay: number; url: string; aiNote?: string; aiSlows?: boolean; keys: string[]; mix?: Mix };
const ooh = (path: string) => `https://www.bls.gov/ooh/${path}.htm`;
const m = (r: number, t: number, tasky: boolean): Mix => ({ r, t, tasky });

const OCC: Record<string, Occ> = {
  ora: { name: 'Operations research analysts', jobs: 113100, growth: 12, pay: 88940, url: ooh('math/operations-research-analysts'), keys: ['data analyst', 'data analytics', 'data analysis', 'operations research', 'analytics'] },
  csr: { name: 'Customer service representatives', jobs: 2666000, growth: -5, pay: 44770, url: ooh('office-and-administrative-support/customer-service-representatives'), keys: ['customer service', 'customer support', 'customer success', 'call cent*'] },
  mgmt: { name: 'Management analysts', jobs: 1077100, growth: 10, pay: 101860, url: ooh('business-and-financial/management-analysts'), keys: ['management analyst', 'business analyst', 'business operations', 'operations analyst', 'consultant'] },
  train: { name: 'Training and development specialists', jobs: 472500, growth: 11, pay: 69280, url: ooh('business-and-financial/training-and-development-specialists'), keys: ['training', 'learning and development', 'l&d', 'trainer', 'instructional design*'] },
  pms: { name: 'Project management specialists', jobs: 1094300, growth: 7, pay: 102320, url: ooh('business-and-financial/project-management-specialists'), keys: ['project manager', 'project management', 'product manager', 'program manager', 'scrum master', 'product operations'] },
  web: { name: 'Web developers and digital designers', jobs: 220100, growth: 5, pay: 99520, url: ooh('computer-and-information-technology/web-developers'),
    aiNote: 'BLS: increasing use of AI for web development may soften employment growth.', aiSlows: true, keys: ['web developer', 'web design*', 'front-end', 'frontend', 'front end', 'ux', 'ui', 'ux designer', 'ui designer', 'ui/ux', 'ux/ui', 'product designer', 'user experience'] },
  sw: { name: 'Software developers, QA analysts and testers', jobs: 1905400, growth: 10, pay: 134040, url: ooh('computer-and-information-technology/software-developers'),
    aiNote: 'BLS: growth is helped by continued expansion of software development for AI.', keys: ['software developer', 'software engineer', 'programmer', 'developer', 'qa', 'tester', 'software test*', 'full stack', 'fullstack', 'backend', 'back-end', 'mobile developer', 'app developer'] },
  ds: { name: 'Data scientists', jobs: 275600, growth: 35, pay: 120230, url: ooh('math/data-scientists'),
    aiNote: 'BLS: firms are expected to keep integrating AI-based systems, which adds demand for data scientists.', keys: ['data scientist', 'machine learning', 'ml engineer', 'ai engineer', 'data science', 'ai specialist'] },
  net: { name: 'Computer network architects', jobs: 181800, growth: 8, pay: 134050, url: ooh('computer-and-information-technology/computer-network-architects'),
    aiNote: 'BLS: companies leveraging technology investments such as AI will need these workers.', keys: ['devops', 'cloud', 'network architect', 'network engineer', 'site reliability', 'sre', 'infrastructure'] },
  sec: { name: 'Information security analysts', jobs: 192900, growth: 21, pay: 129180, url: ooh('computer-and-information-technology/information-security-analysts'),
    aiNote: 'BLS: increased use of AI and e-commerce has increased the need for enhanced security.', keys: ['cybersecurity', 'cyber security', 'security analyst', 'information security', 'infosec', 'penetration test*', 'ethical hack*'] },
  mkt: { name: 'Market research analysts and marketing specialists', jobs: 952700, growth: 7, pay: 78760, url: ooh('business-and-financial/market-research-analysts'), keys: ['market research*', 'marketing', 'digital marketing', 'seo', 'social media', 'brand', 'advertis*', 'researcher'] },
  sales: { name: 'Sales managers', jobs: 650100, growth: 4, pay: 148270, url: ooh('management/sales-managers'), keys: ['sales', 'business development', 'account executive'] },
  tw: { name: 'Technical writers', jobs: 46400, growth: 1, pay: 90390, url: ooh('media-and-communication/technical-writers'),
    aiNote: 'BLS: employment growth may be slowed by AI tools.', aiSlows: true, keys: ['technical writer', 'content writer', 'copywriter', 'writer', 'content creator'] },
  fin: { name: 'Financial analysts', jobs: 443100, growth: 7, pay: 103570, url: ooh('business-and-financial/financial-analysts'), keys: ['financial analyst', 'finance', 'investment analyst', 'banker', 'banking', 'fp&a'] },
  env: { name: 'Environmental scientists and specialists', jobs: 93400, growth: 6, pay: 82220, url: ooh('life-physical-and-social-science/environmental-scientists-and-specialists'), keys: ['environmental', 'sustainability', 'clean energy', 'climate', 'esg'] },
  hsm: { name: 'Medical and health services managers', jobs: 640400, growth: 24, pay: 123860, url: ooh('management/medical-and-health-services-managers'), keys: ['health administrator', 'hospital manager', 'healthcare manager', 'health services', 'health-tech', 'healthtech'] },
  agri: { name: 'Agricultural and food scientists', jobs: 37400, growth: 6, pay: 81970, url: ooh('life-physical-and-social-science/agricultural-and-food-scientists'), keys: ['agri*', 'agronomist', 'food scientist', 'farming'] },
  // Added so people can check jobs outside the 21 directions. Mix values are my own rough estimates.
  rn: { name: 'Registered nurses', jobs: 3465400, growth: 6, pay: 97550, url: ooh('healthcare/registered-nurses'), mix: m(0, 0, false), keys: ['nurse', 'nursing'] },
  teach: { name: 'High school teachers', jobs: 1087500, growth: 0, pay: 72040, url: ooh('education-training-and-library/high-school-teachers'), mix: m(0, 0, false), keys: ['teacher', 'educator', 'secondary school'] },
  acct: { name: 'Accountants and auditors', jobs: 1595200, growth: 5, pay: 83680, url: ooh('business-and-financial/accountants-and-auditors'),
    aiNote: 'BLS: AI may automate routine tasks like data entry, leaving more time for advice and analysis.', mix: m(.2, 0, true), keys: ['accountant', 'auditor', 'accounting'] },
  graphic: { name: 'Graphic designers', jobs: 253100, growth: -2, pay: 62960, url: ooh('arts-and-design/graphic-designers'),
    aiNote: 'BLS: automated design tools, including AI, are projected to make designers more productive.', aiSlows: true, mix: m(0, 0, true), keys: ['graphic design*', 'illustrator', 'visual designer', 'designer'] },
  law: { name: 'Lawyers', jobs: 863700, growth: 5, pay: 159670, url: ooh('legal/lawyers'),
    aiNote: 'BLS: some routine legal work may be automated, freeing lawyers for other tasks.', mix: m(0, 0, true), keys: ['lawyer', 'attorney', 'solicitor', 'advocate', 'legal counsel'] },
  elec: { name: 'Electricians', jobs: 821000, growth: 9, pay: 63190, url: ooh('construction-and-extraction/electricians'),
    aiNote: 'BLS: growth is helped by AI technologies and demand for data centers.', mix: m(0, 0, false), keys: ['electrician'] },
  civil: { name: 'Civil engineers', jobs: 380600, growth: 6, pay: 100840, url: ooh('architecture-and-engineering/civil-engineers'), mix: m(0, 0, false), keys: ['civil engineer', 'structural engineer'] },
  mech: { name: 'Mechanical engineers', jobs: 298500, growth: 11, pay: 104110, url: ooh('architecture-and-engineering/mechanical-engineers'),
    aiNote: 'BLS: automation and innovation create demand for these engineers.', mix: m(0, 0, false), keys: ['mechanical engineer'] },
  hr: { name: 'Human resources specialists', jobs: 939700, growth: 6, pay: 75940, url: ooh('business-and-financial/human-resources-specialists'), mix: m(.2, 0, true), keys: ['human resources', 'hr', 'recruiter', 'recruitment', 'talent acquisition'] },
  reporter: { name: 'Reporters and journalists', jobs: 47100, growth: -6, pay: 62200, url: ooh('media-and-communication/reporters-correspondents-and-broadcast-news-analysts'), mix: m(0, 0, true), keys: ['journalist', 'reporter', 'news'] },
  interp: { name: 'Interpreters and translators', jobs: 73900, growth: 2, pay: 60170, url: ooh('media-and-communication/interpreters-and-translators'),
    aiNote: 'BLS: AI tools are changing translators’ work, but many of these jobs cannot be fully automated.', mix: m(.34, 0, true), keys: ['translator', 'interpreter', 'translation'] },
  bookkeep: { name: 'Bookkeeping and accounting clerks', jobs: 1532400, growth: -6, pay: 50670, url: ooh('office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks'),
    aiNote: 'BLS: software has automated many of these tasks, and more routine work is expected to be automated.', mix: m(1, 0, true), keys: ['bookkeep*', 'clerk', 'data entry'] },
  secretary: { name: 'Secretaries and administrative assistants', jobs: 3515600, growth: -2, pay: 48310, url: ooh('office-and-administrative-support/secretaries-and-administrative-assistants'),
    aiNote: 'BLS: technology, including AI systems and digital tools, lets staff in many organisations do this work themselves.', mix: m(1, 0, true), keys: ['secretary', 'administrative assistant', 'receptionist', 'office admin*', 'personal assistant', 'admin'] },
  retail: { name: 'Retail salespersons', jobs: 4271400, growth: 0, pay: 35560, url: ooh('sales/retail-sales-workers'),
    aiNote: 'BLS: competition from e-commerce is expected to reduce demand.', mix: m(.34, 0, false), keys: ['retail', 'cashier', 'shop assistant', 'salesperson', 'store'] },
  truck: { name: 'Heavy truck drivers', jobs: 2221200, growth: 4, pay: 58640, url: ooh('transportation-and-material-moving/heavy-and-tractor-trailer-truck-drivers'), mix: m(0, 0, false), keys: ['truck driver', 'lorry driver', 'delivery driver', 'driver'] },
  chef: { name: 'Chefs and head cooks', jobs: 220300, growth: 7, pay: 62470, url: ooh('food-preparation-and-serving/chefs-and-head-cooks'), mix: m(0, 0, false), keys: ['chef', 'cook'] },
  pharm: { name: 'Pharmacists', jobs: 325200, growth: 5, pay: 140910, url: ooh('healthcare/pharmacists'), mix: m(.2, 0, false), keys: ['pharmacist', 'pharmacy'] },
  pt: { name: 'Physical therapists', jobs: 283700, growth: 12, pay: 102760, url: ooh('healthcare/physical-therapists'), mix: m(0, 0, false), keys: ['physiotherap*', 'physical therap*'] },
  csa: { name: 'Computer systems analysts', jobs: 544400, growth: 8, pay: 105850, url: ooh('computer-and-information-technology/computer-systems-analysts'),
    aiNote: 'BLS: as firms adopt new technology including AI, systems analysts will be hired to design and install new systems.', mix: m(0, .5, true), keys: ['systems analyst', 'system analyst', 'it analyst'] },
  csup: { name: 'Computer user support specialists', jobs: 903100, growth: -3, pay: 62890, url: ooh('computer-and-information-technology/computer-support-specialists'),
    aiNote: 'BLS: automated tools such as chatbots are handling troubleshooting, though specialists may take on harder cases.', mix: m(.34, .5, true), keys: ['it support', 'help desk', 'helpdesk', 'technical support', 'tech support'] },
  para: { name: 'Paralegals and legal assistants', jobs: 404900, growth: 0, pay: 62890, url: ooh('legal/paralegals-and-legal-assistants'),
    aiNote: 'BLS: demand is expected to be limited by advances in technology, including AI.', aiSlows: true, mix: m(.34, 0, true), keys: ['paralegal', 'legal assistant', 'legal executive'] },
  phys: { name: 'Physicians and surgeons', jobs: 862800, growth: 4, pay: 275930, url: ooh('healthcare/physicians-and-surgeons'), mix: m(0, 0, false), keys: ['doctor', 'physician', 'surgeon', 'medical doctor'] },
  dba: { name: 'Database administrators and architects', jobs: 144500, growth: 4, pay: 126760, url: ooh('computer-and-information-technology/database-administrators'),
    aiNote: 'BLS: as organisations adopt AI to process their data, they need these workers.', mix: m(0, 1, false), keys: ['database', 'dba', 'data engineer'] },
  cirs: { name: 'Computer and information research scientists', jobs: 38600, growth: 22, pay: 140300, url: ooh('computer-and-information-technology/computer-and-information-research-scientists'),
    aiNote: 'BLS: computer scientists are needed to create new AI-related technologies.', mix: m(0, 1, false), keys: ['research scientist', 'computer scientist', 'ai researcher', 'ai research'] },
  social: { name: 'Social workers', jobs: 816100, growth: 6, pay: 61780, url: ooh('community-and-social-service/social-workers'), mix: m(0, 0, false), keys: ['social worker'] },
};

const MAP: Record<string, keyof typeof OCC> = {
  analyst: 'ora', success: 'csr', ops: 'mgmt', learning: 'train', product: 'pms', webdev: 'web', softdev: 'sw', qa: 'sw',
  datasci: 'ds', cloud: 'net', security: 'sec', ux: 'web', pm: 'pms', marketing: 'mkt', sales: 'sales', writer: 'tw',
  finance: 'fin', research: 'mkt', green: 'env', health: 'hsm', agri: 'agri',
};

/** All-occupation projection, BLS Employment Projections 2025-35: 170.3M to 176.2M jobs. */
export const ALL_JOBS_GROWTH = 3.5;
export const BLS_AI_STATEMENT = 'BLS says the uncertainty about AI’s impact “remains very high” and that the exact effect ten years out “is impossible to predict with precision.”';
export const BLS_AI_URL = 'https://www.bls.gov/emp/factsheets/ai-impacts.htm';
export const BLS_PROJECTIONS_URL = 'https://www.bls.gov/news.release/ecopro.nr0.htm';

const TASKY = [...ROUTINE_PRONE, 'Writing', 'Data analysis', 'Customer research', 'Digital marketing'];
export const occupationFor = (directionId: string): Occ | undefined => (MAP[directionId] ? OCC[MAP[directionId]] : undefined);

const mixOf = (key: string): Mix => {
  const o = OCC[key]; if (o.mix) return o.mix;
  const d = DIRECTIONS.find(x => MAP[x.id] === key);
  const n = Math.max(1, d?.skills.length ?? 1);
  const cnt = (list: string[]) => d?.skills.filter(s => list.includes(s)).length ?? 0;
  return { r: cnt(ROUTINE_PRONE) / n, t: cnt(TECHNICAL) / n, tasky: cnt(TASKY) > 0 };
};

export type Arrow = 'up' | 'flat' | 'down';
export const ARROW: Record<Arrow, { sym: string; word: string }> = { up: { sym: '▲', word: 'rises' }, flat: { sym: '▬', word: 'little change' }, down: { sym: '▼', word: 'falls' } };

export type Item = { id: string; kind: 'Threat' | 'Uncertain'; name: string; how: string; hits: string; when: string; range?: [string, string] };
/** The threats and uncertainties shown on Overview. `when` is a rough planning horizon, not a forecast. */
export const ITEMS: Item[] = [
  { id: 'displace', kind: 'Threat', name: 'Job displacement', how: 'AI takes over routine tasks, so fewer people are needed for the same work.', hits: 'Support, admin, testing, bookkeeping.', when: 'Builds over the next 5–10 years.' },
  { id: 'entry', kind: 'Threat', name: 'Fewer entry-level jobs', how: 'AI does the simple tasks juniors used to learn on, so there are fewer starter roles.', hits: 'Fresh graduates in analysis, writing and support.', when: 'Next 3–5 years.' },
  { id: 'wage', kind: 'Threat', name: 'Wage inequality', how: 'People with AI and data skills earn more; easily automated work pays less.', hits: 'Widens the gap between technical and routine roles.', when: 'Gradual, over 5–10 years.' },
  { id: 'speed', kind: 'Uncertain', name: 'Speed of automation', how: 'Slow change gives time to adapt. Fast change shifts jobs suddenly.', hits: 'Roles with many routine tasks, most.', when: 'Unknown. BLS calls the uncertainty “very high”.', range: ['If slow', 'If fast'] },
  { id: 'salary', kind: 'Uncertain', name: 'Long-term salary trends', how: 'AI may lift pay for some jobs and cut it for others. It is not yet clear which.', hits: 'Everyone, but unevenly.', when: '5–10 years out.', range: ['If AI helps', 'If AI hurts'] },
];


export type Effect = { jobs: Arrow[]; pay: Arrow[] };
const step = (n: number): Arrow => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');

export type Result = { key: string; occ: Occ; byItem: Record<string, Effect>; why: Record<string, string>; outlook: 'Lower risk' | 'Mixed' | 'High risk'; tip: string };

/** Effect of each item on employment ("jobs") and salary ("pay"). One arrow = a clear direction; two arrows = a range across the uncertainty. */
export function analyse(key: string): Result {
  const o = OCC[key], { r, t, tasky } = mixOf(key), slows = !!o.aiSlows;
  const E = o.growth < 0 || r >= 1 / 3 ? 2 : r > 0 || slows ? 1 : 0;
  const base = o.growth >= 10 ? 1 : o.growth < 0 ? -1 : 0;
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  const fast = clamp(base - (E === 2 ? 2 : E === 1 ? 1 : 0) + (t >= .5 ? 1 : 0));
  const byItem: Record<string, Effect> = {
    displace: { jobs: [E === 2 || slows ? 'down' : 'flat'], pay: [E === 2 ? 'down' : 'flat'] },
    entry: { jobs: [tasky ? 'down' : 'flat'], pay: ['flat'] },
    wage: { jobs: ['flat'], pay: [t >= .5 ? 'up' : E === 2 ? 'down' : 'flat'] },
    speed: { jobs: [step(base), step(fast)], pay: [o.growth < 0 ? 'down' : 'flat', E === 2 ? 'down' : t >= .5 ? 'up' : 'flat'] },
    salary: { jobs: [], pay: [t >= .5 || (E === 0 && o.growth >= 10) ? 'up' : 'flat', E >= 1 && t < .5 ? 'down' : 'flat'] },
  };
  const why: Record<string, string> = {
    displace: o.growth < 0 ? 'BLS already projects fewer of these jobs.' : E === 2 ? 'Many tasks are routine, so AI can take them over.' : slows ? 'BLS says AI may slow hiring.' : 'Judgement or hands-on work is hard to automate.',
    entry: tasky ? 'Junior tasks like drafts, reports and basic checks are easy for AI.' : 'Entry roles rely on hands-on or licensed training.',
    wage: t >= .5 ? 'AI and data skills earn a premium.' : E === 2 ? 'Easily automated work tends to pay less.' : 'No big AI-driven pay gap expected.',
    speed: fast < base ? (E === 2 ? 'Fast adoption would cut roles quickly.' : 'Fast adoption would slow hiring.') : fast > base ? 'Fast adoption would add demand.' : base > 0 ? 'Demand holds up either way.' : 'Little change either way.',
    salary: t >= .5 ? 'Pay could rise with AI skills; tools change fast.' : E >= 1 ? 'Pay may stall if more tasks are automated.' : E === 0 && o.growth >= 10 ? 'Strong demand supports pay.' : 'Pay likely steady; depends on demand.',
  };
  const downs = Object.values(byItem).reduce((n, e) => n + (e.jobs.includes('down') ? 1 : 0) + (e.pay.includes('down') ? 1 : 0), 0);
  const outlook = downs >= 5 ? 'High risk' : downs >= 2 ? 'Mixed' : 'Lower risk';
  const tip = E === 2 ? 'Move toward the judgement, people-facing or oversight side of the work, and learn to use AI tools.'
    : tasky ? 'Build real project work early, since junior tasks are the easiest for AI to absorb.'
    : t >= .5 ? 'Keep technical skills current; the tools change fast.' : 'Learn the AI tools used in this job so you stay ahead of the change.';
  return { key, occ: o, byItem, why, outlook, tip };
}

export const effects = (directionId: string): Result | null => (MAP[directionId] ? analyse(MAP[directionId]) : null);

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\/&]/g, '\\$&');
const MATCHERS = Object.entries(OCC).map(([key, o]) => ({ key, res: o.keys.map(k => { const pre = k.endsWith('*'), w = pre ? k.slice(0, -1) : k; return { len: w.length, re: new RegExp(`(^|[^a-z])${esc(w)}${pre ? '' : '(s|es)?($|[^a-z])'}`) }; }) }));
/** Best-matching occupations for free text (most specific wording first). Empty when nothing matches. */
export function findJobs(text: string): string[] {
  const q = text.toLowerCase().trim(); if (q.length < 2) return [];
  return MATCHERS.map(mt => ({ key: mt.key, score: Math.max(0, ...mt.res.filter(x => x.re.test(q)).map(x => x.len)) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4).map(x => x.key);
}
export const occName = (key: string) => OCC[key].name;
export const JOB_EXAMPLES = ['Nurse', 'Software developer', 'Accountant', 'Graphic designer', 'Teacher', 'Data scientist'];
export const COVERED = Object.keys(OCC).length;

export const fmtJobs = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
export const fmtPay = (n: number) => `$${n.toLocaleString('en-US')}`;
