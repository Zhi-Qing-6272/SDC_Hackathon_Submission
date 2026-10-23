// Skill/interest extraction, direction suggestion and vacancy matching. Runs fully in the browser.
export type Vacancy = { id: string; position: string; company: string; location: string; url: string; tags: string[]; summary?: string };
export type Direction = { id: string; title: string; summary: string; skills: string[]; interests: string[]; pathwayId?: string };

// canonical skill -> keywords found in CVs, job titles and job tags
export const SKILLS: Record<string, string[]> = {
  'Customer support': ['customer support', 'customer service', 'helpdesk', 'help desk', 'support agent'],
  'Communication': ['communication', 'presentation', 'public speaking', 'stakeholder'],
  'Problem solving': ['problem solving', 'problem-solving', 'troubleshoot', 'analytical'],
  'Excel': ['excel', 'spreadsheet', 'google sheets'],
  'Data analysis': ['data analysis', 'data analyst', 'analytics', 'data science', 'power bi', 'tableau', 'statistics'],
  'SQL': ['sql', 'mysql', 'postgres', 'database'],
  'CRM': ['crm', 'salesforce', 'hubspot'],
  'Process improvement': ['process improvement', 'lean', 'six sigma', 'workflow'],
  'Project coordination': ['project management', 'project coordination', 'scrum', 'agile', 'coordinator', 'jira'],
  'Learning design': ['learning design', 'instructional design', 'curriculum', 'e-learning'],
  'Facilitation': ['facilitation', 'workshop', 'training', 'teaching', 'mentoring'],
  'Digital marketing': ['digital marketing', 'seo', 'social media', 'content marketing', 'marketing'],
  'Python': ['python', 'pandas'],
  'Cybersecurity': ['cybersecurity', 'security', 'infosec', 'penetration'],
  'UX design': ['ux', 'ui design', 'figma', 'user research', 'wireframe'],
  'Product operations': ['product operations', 'product management', 'product manager'],
  'AI literacy': ['machine learning', 'artificial intelligence', 'generative ai', 'llm', 'prompt'],
  'Cloud computing': ['cloud', 'aws', 'azure', 'gcp', 'devops', 'docker', 'kubernetes'],
  'Customer research': ['customer research', 'market research', 'survey', 'interview'],
  'Sales': ['sales', 'business development', 'account executive'],
  'JavaScript': ['javascript', 'typescript', 'node', 'react', 'vue', 'html', 'css', 'frontend', 'front-end'],
  'Java / C++': ['java', 'c++', 'c#', 'object-oriented', 'oop', 'backend', 'back-end'],
  'Software testing': ['software testing', 'qa', 'quality assurance', 'test automation', 'unit test'],
  'Writing': ['copywriting', 'technical writing', 'content writing', 'editing', 'writer'],
  'Finance & accounting': ['accounting', 'finance', 'bookkeeping', 'audit', 'budget'],
};
export const INTERESTS: Record<string, string[]> = {
  'Data': ['data', 'analytics', 'statistics'], 'People development': ['training', 'mentoring', 'hr', 'talent'],
  'Digital products': ['app', 'software', 'web', 'product'], 'Education & learning': ['education', 'teaching', 'school', 'tutor'],
  'Sustainability': ['sustainab', 'environment', 'esg', 'recycl'], 'Clean energy': ['solar', 'renewable', 'clean energy', 'ev '],
  'Healthcare': ['health', 'pharmac', 'clinic', 'hospital', 'medical'], 'Smart agriculture': ['agricultur', 'farming', 'agritech'],
  'Responsible AI': ['responsible ai', 'ai ethics', 'machine learning'], 'Cybersecurity': ['cybersecurity', 'security'],
  'Customer experience': ['customer', 'service'], 'Product design': ['design', 'ux', 'figma'],
  'Business operations': ['operations', 'logistics', 'supply chain'], 'Entrepreneurship': ['startup', 'entrepreneur', 'founder'],
};
const has = (text: string, kw: string) => new RegExp(`(^|[^a-z0-9+#])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text);
export const extract = (raw: string) => {
  const text = raw.toLowerCase();
  const pick = (vocab: Record<string, string[]>) => Object.keys(vocab).filter(k => vocab[k].some(kw => has(text, kw)));
  return { skills: pick(SKILLS), interests: pick(INTERESTS) };
};

// Minimal .docx reader (zip + DecompressionStream), no dependencies.
export async function readFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) throw new Error('PDF files can’t be read in the browser yet. Save the CV as .docx or .txt, or paste its text.');
  if (!name.endsWith('.docx')) return file.text();
  const buf = new Uint8Array(await file.arrayBuffer()); const dv = new DataView(buf.buffer);
  let i = buf.length - 22; while (i > 0 && dv.getUint32(i, true) !== 0x06054b50) i--;
  let p = dv.getUint32(i + 16, true); const n = dv.getUint16(i + 10, true);
  for (let k = 0; k < n; k++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const fname = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nlen)); p += 46 + nlen + elen + clen;
    if (fname !== 'word/document.xml') continue;
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true); const data = buf.slice(start, start + csize);
    const xml = method === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    return xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
  throw new Error('Could not find text in this .docx file.');
}

export const QUESTIONS: { q: string; options: { label: string; skills?: string[]; interests?: string[] }[] }[] = [
  { q: 'Which activities do you enjoy most?', options: [
    { label: 'Working with numbers and data', skills: ['Data analysis', 'Excel'], interests: ['Data'] },
    { label: 'Helping and talking with people', skills: ['Communication', 'Customer support'], interests: ['Customer experience'] },
    { label: 'Organising projects and processes', skills: ['Project coordination', 'Process improvement'], interests: ['Business operations'] },
    { label: 'Teaching or training others', skills: ['Facilitation', 'Learning design'], interests: ['People development', 'Education & learning'] },
    { label: 'Building or coding things', skills: ['Python', 'JavaScript', 'Problem solving'], interests: ['Digital products'] },
    { label: 'Designing and creating', skills: ['UX design', 'Writing'], interests: ['Product design'] },
    { label: 'Persuading and selling', skills: ['Sales', 'Digital marketing'], interests: ['Entrepreneurship'] } ] },
  { q: 'Which tools or methods have you used?', options: [
    { label: 'Spreadsheets', skills: ['Excel'] }, { label: 'Databases / SQL', skills: ['SQL'] }, { label: 'CRM software', skills: ['CRM'] },
    { label: 'Programming (Python, Java, JavaScript…)', skills: ['Python', 'JavaScript', 'Java / C++'] }, { label: 'Cloud platforms', skills: ['Cloud computing'] },
    { label: 'Design tools (Figma etc.)', skills: ['UX design'] }, { label: 'Testing / QA', skills: ['Software testing'] }, { label: 'AI tools', skills: ['AI literacy'] } ] },
  { q: 'Which strengths do others notice in you?', options: [
    { label: 'Clear explaining', skills: ['Communication', 'Facilitation'] }, { label: 'Fixing things when they break', skills: ['Problem solving'] },
    { label: 'Keeping everyone on track', skills: ['Project coordination'] }, { label: 'Spotting patterns', skills: ['Data analysis'] },
    { label: 'Understanding customers', skills: ['Customer research', 'Customer support'] } ] },
  { q: 'Which topics matter most to you?', options: [
    { label: 'Environment & clean energy', interests: ['Sustainability', 'Clean energy'] }, { label: 'Health & care', interests: ['Healthcare'] },
    { label: 'Food & agriculture', interests: ['Smart agriculture'] }, { label: 'Safe, responsible technology', interests: ['Responsible AI', 'Cybersecurity'] },
    { label: 'Learning & education', interests: ['Education & learning', 'People development'] }, { label: 'Starting something of my own', interests: ['Entrepreneurship'] } ] },
];

const D = (id: string, title: string, summary: string, skills: string[], interests: string[], pathwayId?: string): Direction => ({ id, title, summary, skills, interests, pathwayId });
export const DIRECTIONS: Direction[] = [
  D('analyst', 'Data Analyst', 'Turn operational and customer data into decisions.', ['SQL', 'Data analysis', 'Excel', 'Communication'], ['Data', 'Business operations'], 'analyst'),
  D('success', 'Customer Success Manager', 'Help customers adopt products and reach outcomes.', ['Customer support', 'Communication', 'CRM', 'Problem solving'], ['Customer experience'], 'success'),
  D('ops', 'Business Operations Analyst', 'Improve how a team works with clearer processes.', ['Excel', 'Process improvement', 'Data analysis', 'Communication'], ['Business operations', 'Data'], 'ops'),
  D('learning', 'Learning & Development Coordinator', 'Coordinate practical learning at work.', ['Communication', 'Learning design', 'Project coordination', 'Facilitation'], ['People development', 'Education & learning'], 'learning'),
  D('product', 'Product Operations Associate', 'Connect customer feedback, product teams and delivery.', ['Communication', 'Data analysis', 'Project coordination', 'Problem solving'], ['Digital products', 'Customer experience'], 'product'),
  D('webdev', 'Web / Front-end Developer', 'Build and maintain websites and web apps.', ['JavaScript', 'Problem solving', 'UX design'], ['Digital products']),
  D('softdev', 'Software Developer', 'Design and build software systems.', ['Java / C++', 'Python', 'Problem solving', 'SQL'], ['Digital products']),
  D('qa', 'Software Tester / QA Analyst', 'Plan and run tests that keep software reliable.', ['Software testing', 'Problem solving', 'Communication'], ['Digital products']),
  D('datasci', 'Data Scientist / ML Engineer', 'Build models and analyses from data.', ['Python', 'Data analysis', 'SQL', 'AI literacy'], ['Data', 'Responsible AI']),
  D('cloud', 'Cloud / DevOps Engineer', 'Run and automate cloud infrastructure.', ['Cloud computing', 'Python', 'Cybersecurity'], ['Digital products']),
  D('security', 'Cybersecurity Analyst', 'Protect systems and data from threats.', ['Cybersecurity', 'Problem solving', 'Cloud computing'], ['Cybersecurity', 'Responsible AI']),
  D('ux', 'UX / Product Designer', 'Design usable products from user research.', ['UX design', 'Customer research', 'Communication'], ['Product design', 'Digital products']),
  D('pm', 'Project / Product Manager', 'Lead delivery of projects and products.', ['Project coordination', 'Communication', 'Product operations'], ['Digital products', 'Business operations']),
  D('marketing', 'Digital Marketing Specialist', 'Grow audiences through content and campaigns.', ['Digital marketing', 'Writing', 'Data analysis'], ['Entrepreneurship', 'Customer experience']),
  D('sales', 'Sales / Business Development', 'Win and grow customer relationships.', ['Sales', 'Communication', 'CRM'], ['Entrepreneurship', 'Customer experience']),
  D('writer', 'Content / Technical Writer', 'Explain products and ideas clearly in writing.', ['Writing', 'Communication', 'Customer research'], ['Education & learning', 'Digital products']),
  D('finance', 'Finance / Accounting Analyst', 'Analyse budgets and financial performance.', ['Finance & accounting', 'Excel', 'Data analysis'], ['Business operations']),
  D('research', 'Customer / Market Researcher', 'Find out what customers need and why.', ['Customer research', 'Data analysis', 'Communication'], ['Customer experience', 'Data']),
  D('green', 'Sustainability / Clean-energy Analyst', 'Measure and improve environmental impact.', ['Data analysis', 'Excel', 'Project coordination'], ['Sustainability', 'Clean energy']),
  D('health', 'Health-tech Operations Specialist', 'Support digital tools and processes in healthcare.', ['Process improvement', 'Communication', 'Data analysis'], ['Healthcare', 'Digital products']),
  D('agri', 'Agri-tech Data Specialist', 'Use data and sensors to improve farming.', ['Data analysis', 'Python', 'Cloud computing'], ['Smart agriculture', 'Sustainability']),
];
const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export function suggestDirections(skills: string[], interests: string[]) {
  const mine = (list: string[], x: string) => list.some(s => eq(s, x));
  return DIRECTIONS.map(d => {
    const skillHits = d.skills.filter(s => mine(skills, s)), interestHits = d.interests.filter(i => mine(interests, i));
    const score = Math.round(100 * (0.7 * skillHits.length / d.skills.length + 0.3 * interestHits.length / d.interests.length));
    return { ...d, skillHits, interestHits, gaps: d.skills.filter(s => !skillHits.includes(s)), score };
  }).filter(d => (d.skillHits.length > 0 || d.interestHits.length > 0) && d.score >= 20).sort((a, b) => b.score - a.score);
}
export function matchVacancies(vs: Vacancy[], skills: string[]) {
  return vs.map(v => {
    const text = `${v.position} ${v.tags.join(' ')} ${v.summary ?? ''}`.toLowerCase();
    const required = Object.keys(SKILLS).filter(k => SKILLS[k].some(kw => has(text, kw)));
    const matched = required.filter(k => skills.some(s => eq(s, k)));
    const score = required.length ? Math.round(100 * (0.6 * matched.length / required.length + 0.4 * Math.min(matched.length, 3) / 3)) : 0;
    return { ...v, required, matched, missing: required.filter(k => !matched.includes(k)), score };
  }).filter(v => v.matched.length > 0).sort((a, b) => b.score - a.score);
}

// Learning resources per skill (catalogue links; availability and pricing vary by provider).
export type Course = { provider: string; url: string; cost: string; hours: number };
const FREE = 'Free learning resource', VARIES = 'Provider pricing varies';
const SPECIFIC: Record<string, Course> = {
  'SQL': { provider: 'Khan Academy', url: 'https://www.khanacademy.org/computing/computer-programming/sql', cost: FREE, hours: 8 },
  'Excel': { provider: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/training/browse/?terms=excel', cost: FREE, hours: 7 },
  'Python': { provider: 'Kaggle Learn', url: 'https://www.kaggle.com/learn/python', cost: FREE, hours: 8 },
  'JavaScript': { provider: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development', cost: FREE, hours: 12 },
  'CRM': { provider: 'Salesforce Trailhead', url: 'https://trailhead.salesforce.com/', cost: FREE, hours: 8 },
  'Customer support': { provider: 'HubSpot Academy', url: 'https://academy.hubspot.com/', cost: FREE, hours: 6 },
  'Digital marketing': { provider: 'HubSpot Academy', url: 'https://academy.hubspot.com/', cost: FREE, hours: 8 },
  'Learning design': { provider: 'OpenLearn', url: 'https://www.open.edu/openlearn/education-development', cost: FREE, hours: 7 },
  'Project coordination': { provider: 'Atlassian University', url: 'https://university.atlassian.com/', cost: FREE, hours: 5 },
  'Cloud computing': { provider: 'AWS Skill Builder', url: 'https://skillbuilder.aws/', cost: FREE, hours: 10 },
};
export const courseFor = (skill: string): Course => SPECIFIC[skill] ?? { provider: 'Coursera · course catalogue', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`, cost: VARIES, hours: 6 };
export const stepKeyFor = (dirId: string, skill: string) => `${dirId}:${skill.replace(/[^A-Za-z0-9 +#.-]/g, '').trim()}`;

// ---- Possible futures: how the same profile ranks directions under different assumptions ----
// These trait lists are illustrative planning assumptions, not measured automation risk. They are shown to the user.
export const ROUTINE_PRONE = ['Excel', 'Customer support', 'CRM', 'Finance & accounting', 'Software testing'];
export const TECHNICAL = ['Python', 'SQL', 'Cloud computing', 'Cybersecurity', 'AI literacy', 'Data analysis', 'JavaScript', 'Java / C++'];
export type FutureId = 'gradual' | 'faster' | 'automation' | 'aibuild' | 'cautious';
export type Future = { id: FutureId; name: string; blurb: string; w: { skill: number; interest: number; signal: number; tilt: number }; tilt?: 'nonRoutine' | 'technical'; tiltLabel?: string };
export const FUTURES: Future[] = [
  { id: 'gradual', name: 'Gradual change', blurb: 'Work changes slowly; you can build adjacent skills alongside your job.', w: { skill: .65, interest: .20, signal: .15, tilt: 0 } },
  { id: 'faster', name: 'Faster change', blurb: 'Skills in demand shift quickly, so live postings matter more.', w: { skill: .50, interest: .15, signal: .35, tilt: 0 } },
  { id: 'automation', name: 'Routine tasks automated', blurb: 'AI absorbs repetitive, rule-based work; judgement and people-facing skills gain value.', w: { skill: .45, interest: .15, signal: .20, tilt: .20 }, tilt: 'nonRoutine', tiltLabel: 'share of skills that are not routine-prone' },
  { id: 'aibuild', name: 'AI-driven build-out', blurb: 'Firms invest heavily in AI and data systems, raising demand for technical skills.', w: { skill: .45, interest: .15, signal: .20, tilt: .20 }, tilt: 'technical', tiltLabel: 'share of skills that are technical or data skills' },
  { id: 'cautious', name: 'Cautious hiring', blurb: 'Hiring slows; roles closest to what you already do are the safer moves.', w: { skill: .75, interest: .25, signal: 0, tilt: 0 } },
];
export type FutureRow = { id: string; title: string; summary: string; skillHits: string[]; gaps: string[]; scores: Record<FutureId, number>; ranks: Record<FutureId, number> };
export function compareFutures(skills: string[], interests: string[], signalShare: (skill: string) => number): { rows: FutureRow[]; hasSignal: boolean } {
  const mine = (list: string[], x: string) => list.some(s => eq(s, x));
  const base = DIRECTIONS.map(d => {
    const skillHits = d.skills.filter(s => mine(skills, s)), interestHits = d.interests.filter(i => mine(interests, i));
    const n = d.skills.length;
    return { d, skillHits, hasHit: skillHits.length > 0 || interestHits.length > 0, skillPart: skillHits.length / n, interestPart: d.interests.length ? interestHits.length / d.interests.length : 0,
      demand: d.skills.reduce((sum, s) => sum + signalShare(s), 0), nonRoutine: 1 - d.skills.filter(s => ROUTINE_PRONE.includes(s)).length / n, technical: d.skills.filter(s => TECHNICAL.includes(s)).length / n };
  }).filter(x => x.hasHit);
  const maxDemand = Math.max(...base.map(x => x.demand), 0);
  const rows: FutureRow[] = base.map(x => {
    const scores = {} as Record<FutureId, number>;
    for (const f of FUTURES) {
      const tilt = f.tilt === 'nonRoutine' ? x.nonRoutine : f.tilt === 'technical' ? x.technical : 0;
      scores[f.id] = Math.round(100 * (f.w.skill * x.skillPart + f.w.interest * x.interestPart + f.w.signal * (maxDemand > 0 ? x.demand / maxDemand : 0) + f.w.tilt * tilt));
    }
    return { id: x.d.id, title: x.d.title, summary: x.d.summary, skillHits: x.skillHits, gaps: x.d.skills.filter(s => !x.skillHits.includes(s)), scores, ranks: {} as Record<FutureId, number> };
  });
  for (const f of FUTURES) [...rows].sort((a, b) => b.scores[f.id] - a.scores[f.id] || a.title.localeCompare(b.title)).forEach((r, i) => { r.ranks[f.id] = i + 1; });
  return { rows, hasSignal: maxDemand > 0 };
}

// ---- Learning steps for a chosen direction ----
export type Step = { key: string; title: string; provider: string; url: string; cost: string; hours: number; skill?: string };
export const buildSteps = (d: { id: string; gaps: string[] }, curated: Step[] | null): Step[] =>
  curated ?? d.gaps.map(skill => ({ key: stepKeyFor(d.id, skill), title: skill, skill, ...courseFor(skill) }));
