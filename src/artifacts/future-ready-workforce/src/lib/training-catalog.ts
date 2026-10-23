import { DIRECTIONS, SKILLS } from './discovery';

// Online training finder for administrators.
// Two kinds of results, both labelled honestly in the UI:
//  1. "Featured": hand-picked starting points from well-known providers. Pages, prices and availability change, so check the
//     provider before committing.
//  2. "Search on <provider>": links that open that provider's own search results for the skill or role. Nexora does not
//     fetch, copy or rank the results; the provider does.
export type Featured = { title: string; provider: string; url: string; cost: 'Free' | 'Free to audit' | 'Paid or subscription' | 'Varies'; hours: number };
export type Provider = { id: string; name: string; search: (q: string) => string };

const enc = encodeURIComponent;
export const PROVIDERS: Provider[] = [
  { id: 'coursera', name: 'Coursera', search: q => `https://www.coursera.org/search?query=${enc(q)}` },
  { id: 'edx', name: 'edX', search: q => `https://www.edx.org/search?q=${enc(q)}` },
  { id: 'udemy', name: 'Udemy', search: q => `https://www.udemy.com/courses/search/?q=${enc(q)}` },
  { id: 'linkedin', name: 'LinkedIn Learning', search: q => `https://www.linkedin.com/learning/search?keywords=${enc(q)}` },
  { id: 'futurelearn', name: 'FutureLearn', search: q => `https://www.futurelearn.com/search?q=${enc(q)}` },
  { id: 'classcentral', name: 'Class Central', search: q => `https://www.classcentral.com/search?q=${enc(q)}` },
  { id: 'youtube', name: 'YouTube', search: q => `https://www.youtube.com/results?search_query=${enc(q)}` },
];

const F = (title: string, provider: string, url: string, cost: Featured['cost'], hours: number): Featured => ({ title, provider, url, cost, hours });
const GC = (slug: string) => `https://www.coursera.org/professional-certificates/${slug}`;
export const FEATURED: Record<string, Featured[]> = {
  'Data analysis': [F('Google Data Analytics Professional Certificate', 'Coursera', GC('google-data-analytics'), 'Free to audit', 180), F('Kaggle Learn: data visualisation and pandas micro-courses', 'Kaggle', 'https://www.kaggle.com/learn', 'Free', 12)],
  'SQL': [F('Intro to SQL', 'Kaggle Learn', 'https://www.kaggle.com/learn/intro-to-sql', 'Free', 3), F('CS50’s Introduction to Databases with SQL', 'Harvard CS50', 'https://cs50.harvard.edu/sql/', 'Free', 20)],
  'Python': [F('Python', 'Kaggle Learn', 'https://www.kaggle.com/learn/python', 'Free', 5), F('CS50’s Introduction to Programming with Python', 'Harvard CS50', 'https://cs50.harvard.edu/python/', 'Free', 30)],
  'JavaScript': [F('freeCodeCamp curriculum (JavaScript)', 'freeCodeCamp', 'https://www.freecodecamp.org/learn', 'Free', 60), F('Learn web development', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Learn_web_development', 'Free', 40)],
  'Java / C++': [F('Java Programming MOOC', 'University of Helsinki', 'https://java-programming.mooc.fi/', 'Free', 100), F('Learn C++', 'learncpp.com', 'https://www.learncpp.com/', 'Free', 60)],
  'AI literacy': [F('Elements of AI', 'University of Helsinki', 'https://www.elementsofai.com/', 'Free', 30), F('Generative AI for Beginners', 'Microsoft', 'https://github.com/microsoft/generative-ai-for-beginners', 'Free', 15)],
  'Cloud computing': [F('AWS Skill Builder (free digital courses)', 'AWS', 'https://skillbuilder.aws/', 'Free', 10), F('Google Cloud Skills Boost', 'Google Cloud', 'https://www.cloudskillsboost.google/', 'Varies', 10), F('Microsoft Learn: training paths', 'Microsoft', 'https://learn.microsoft.com/en-us/training/', 'Free', 10)],
  'Cybersecurity': [F('Google Cybersecurity Professional Certificate', 'Coursera', GC('google-cybersecurity'), 'Free to audit', 150)],
  'UX design': [F('Google UX Design Professional Certificate', 'Coursera', GC('google-ux-design'), 'Free to audit', 160)],
  'Project coordination': [F('Google Project Management Professional Certificate', 'Coursera', GC('google-project-management'), 'Free to audit', 150)],
  'Digital marketing': [F('Google Digital Marketing & E-commerce Certificate', 'Coursera', GC('google-digital-marketing-ecommerce'), 'Free to audit', 150), F('HubSpot Academy free courses', 'HubSpot Academy', 'https://academy.hubspot.com/courses', 'Free', 8)],
  'Sales': [F('HubSpot Academy sales courses', 'HubSpot Academy', 'https://academy.hubspot.com/courses', 'Free', 8)],
  'CRM': [F('HubSpot Academy CRM courses', 'HubSpot Academy', 'https://academy.hubspot.com/courses', 'Free', 6)],
  'Customer support': [F('HubSpot Academy customer service courses', 'HubSpot Academy', 'https://academy.hubspot.com/courses', 'Free', 6)],
  'Writing': [F('Technical Writing courses', 'Google for Developers', 'https://developers.google.com/tech-writing', 'Free', 6)],
  'Software testing': [F('Test Automation University', 'Applitools', 'https://testautomationu.applitools.com/', 'Free', 20)],
  'Excel': [F('Microsoft Learn: Excel training', 'Microsoft', 'https://learn.microsoft.com/en-us/training/browse/?terms=excel', 'Free', 6)],
};

export type Finding = { kind: 'role' | 'skill' | 'search'; name: string; label: string; query: string; featured: Featured[]; searches: { provider: string; url: string }[] };
const searches = (q: string) => PROVIDERS.map(p => ({ provider: p.name, url: p.search(q) }));
export const searchTerm = (skill: string, roleTitle?: string) => (roleTitle ? `${skill} for ${roleTitle}` : skill);

// Everything the administrator asked for: each chosen skill, plus one result for the chosen role (if any).
export function findTraining({ skills, roleId, extra }: { skills: string[]; roleId?: string; extra?: string }): Finding[] {
  const role = DIRECTIONS.find(d => d.id === roleId);
  const out: Finding[] = [];
  if (role) out.push({ kind: 'role', name: role.title, label: `Role: ${role.title}`, query: `${role.title} training`, featured: [], searches: searches(`${role.title} training`) });
  for (const skill of skills) out.push({ kind: 'skill', name: skill, label: skill, query: searchTerm(skill, role?.title), featured: FEATURED[skill] ?? [], searches: searches(searchTerm(skill, role?.title)) });
  const x = (extra ?? '').trim();
  if (x) out.push({ kind: 'search', name: x, label: `Search: ${x}`, query: x, featured: [], searches: searches(x) });
  return out;
}
export const skillVocab = Object.keys(SKILLS);
