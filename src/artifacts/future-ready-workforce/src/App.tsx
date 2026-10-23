import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ClerkProvider, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { SupportChat } from '@/components/support-chat';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  getGetTrendSignalsQueryKey, useGetTrendSignals, getTrendSignals,
  useGetWorkspace, getGetWorkspaceQueryKey, useSaveLearnerProfile,
  useSaveLearningProgress, useSaveCareerGoal, useDeleteWorkspace,
  getWorkspace, listTeamMembers, getListTeamMembersQueryKey,
} from '@workspace/api-client-react';
import type { TrendSignalSnapshot, Workspace, CareerGoalInput } from '@workspace/api-client-react';
import { PublicLanding, AccountPage } from '@/components/public-landing';
import { Discover } from '@/components/discover';
import { Pathway } from '@/components/pathway';
import { Org } from '@/components/org';
import { AdminShell } from '@/components/admin-shell';
import { CompanyWorkspace } from '@/components/company-workspace';
import { LearningCard } from '@/components/learning-card';
import { useOrgMe } from '@/lib/org-api';
import { initialWorkspaceView, workspaceModeFromSearch, shouldShowAdminWorkspace, viewAfterWorkspaceModeChange } from '@/lib/workspace-routing';
import { MarketSignals } from '@/components/market-signals';
import { Futures } from '@/components/futures';
import { TeamManager } from '@/components/team-manager';
import { InvitePage } from '@/components/invite';
import { sdgLabel } from '@/lib/sdg';
import {
  Activity, ArrowRight, Award, BookOpen, BriefcaseBusiness, Check, CheckCircle2,
  ChevronRight, Compass, GraduationCap, Leaf, RefreshCw,
  Building2, ShieldCheck, Sparkles, Target, Users, UserRound, Waypoints,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Route,
  Switch,
  useLocation,
  useSearch,
  Router as WouterRouter,
  Redirect,
} from 'wouter';

const queryClient = new QueryClient();

type View = 'overview' | 'discover' | 'signals' | 'pathway' | 'profile' | 'team' | 'org';
type Language = 'EN' | 'BM' | '中文';
type Profile = { name: string; currentRole: string; experience: string; skills: string[]; interests: string[] };
type Step = { title: string; provider: string; estimatedHours: number; costLabel: string; url: string; completed: boolean };

const skillOptions = [
  'Customer support','Communication','Problem solving','Excel','Data analysis','SQL','CRM',
  'Process improvement','Project coordination','Learning design','Facilitation',
  'Digital marketing','Python','Cybersecurity','UX design','Product operations',
  'AI literacy','Cloud computing','Customer research','Sales',
];
const interestOptions = [
  'Data','People development','Digital products','Education & learning','Sustainability',
  'Clean energy','Healthcare','Smart agriculture','Responsible AI','Cybersecurity',
  'Customer experience','Product design','Business operations','Entrepreneurship',
];

const emptyProfile: Profile = { name:'', currentRole:'', experience:'', skills:[], interests:[] };
const roleInterests: Record<string,string[]> = {
  analyst:['Data','Digital products','Business operations'],
  success:['Customer experience','People development','Digital products'],
  ops:['Business operations','Data','Sustainability'],
  learning:['People development','Education & learning'],
  product:['Digital products','Product design','Customer experience'],
};
const roleCatalog = [
  { id:'analyst', title:'Data Analyst', summary:'Turn operational and customer data into useful decisions.', skills:['SQL','Data analysis','Excel','Communication'], sdgs:['SDG 4 · Quality education','SDG 8 · Decent work'], steps:['SQL foundations','Data visualisation','Portfolio project'] },
  { id:'success', title:'Customer Success Manager', summary:'Help customers adopt products and reach measurable outcomes.', skills:['Customer support','Communication','CRM','Problem solving'], sdgs:['SDG 8 · Decent work','SDG 9 · Innovation'], steps:['Customer success practice','CRM workflows','Strategic account planning'] },
  { id:'ops', title:'Business Operations Analyst', summary:'Improve how a team works through clearer processes and evidence.', skills:['Excel','Process improvement','Data analysis','Communication'], sdgs:['SDG 8 · Decent work','SDG 12 · Responsible consumption'], steps:['Excel for analysis','Process mapping','Operations metrics'] },
  { id:'learning', title:'Learning & Development Coordinator', summary:'Coordinate practical learning that helps people grow at work.', skills:['Communication','Learning design','Project coordination','Facilitation'], sdgs:['SDG 4 · Quality education','SDG 10 · Reduced inequalities'], steps:['Learning design','Facilitation essentials','Learning evaluation'] },
  { id:'product', title:'Product Operations Associate', summary:'Connect customer feedback, product teams and reliable delivery.', skills:['Communication','Data analysis','Project coordination','Problem solving'], sdgs:['SDG 8 · Decent work','SDG 9 · Innovation'], steps:['Product operations','Customer research','Workflow management'] },
];
const sdgNum=(label:string)=>label.match(/SDG\s*(\d+)/)?.[1]??'';
const skillSdgMap: Record<string,string[]> = {
  'SQL':['SDG 4','SDG 8','SDG 9'],
  'Data analysis':['SDG 4','SDG 8','SDG 9'],
  'Excel':['SDG 4','SDG 8'],
  'Communication':['SDG 4','SDG 8','SDG 10'],
  'Customer support':['SDG 8','SDG 9'],
  'CRM':['SDG 8','SDG 9'],
  'Problem solving':['SDG 4','SDG 8','SDG 9'],
  'Process improvement':['SDG 8','SDG 9','SDG 12'],
  'Learning design':['SDG 4','SDG 10'],
  'Project coordination':['SDG 4','SDG 8'],
  'Facilitation':['SDG 4','SDG 10'],
};
const stepSkills: Record<string,string> = {
  'SQL foundations':'SQL','Data visualisation':'Data analysis','Portfolio project':'Excel',
  'Customer success practice':'Customer support','CRM workflows':'CRM','Strategic account planning':'Communication',
  'Excel for analysis':'Excel','Process mapping':'Process improvement','Operations metrics':'Data analysis',
  'Learning design':'Learning design','Facilitation essentials':'Facilitation','Learning evaluation':'Project coordination',
  'Product operations':'Data analysis','Customer research':'Communication','Workflow management':'Project coordination',
};
const courseLinks: Record<string,{provider:string;url:string;cost:string;hours:number}> = {
  'SQL foundations':{provider:'Khan Academy',url:'https://www.khanacademy.org/computing/computer-programming/sql',cost:'Free learning resource',hours:8},
  'Data visualisation':{provider:'Coursera · course catalogue',url:'https://www.coursera.org/search?query=data%20visualization',cost:'Provider pricing varies',hours:10},
  'Portfolio project':{provider:'Kaggle Learn',url:'https://www.kaggle.com/learn',cost:'Free learning resource',hours:8},
  'Customer success practice':{provider:'HubSpot Academy',url:'https://academy.hubspot.com/',cost:'Free learning resource',hours:6},
  'CRM workflows':{provider:'Salesforce Trailhead',url:'https://trailhead.salesforce.com/',cost:'Free learning resource',hours:8},
  'Strategic account planning':{provider:'LinkedIn Learning catalogue',url:'https://www.linkedin.com/learning/search?keywords=account%20management',cost:'Provider pricing varies',hours:6},
  'Excel for analysis':{provider:'Microsoft Learn',url:'https://learn.microsoft.com/en-us/training/browse/?terms=excel',cost:'Free learning resource',hours:7},
  'Process mapping':{provider:'Coursera · course catalogue',url:'https://www.coursera.org/search?query=process%20mapping',cost:'Provider pricing varies',hours:5},
  'Operations metrics':{provider:'Khan Academy',url:'https://www.khanacademy.org/math/statistics-probability',cost:'Free learning resource',hours:8},
  'Learning design':{provider:'OpenLearn',url:'https://www.open.edu/openlearn/education-development',cost:'Free learning resource',hours:7},
  'Facilitation essentials':{provider:'Coursera · course catalogue',url:'https://www.coursera.org/search?query=facilitation%20skills',cost:'Provider pricing varies',hours:5},
  'Learning evaluation':{provider:'OpenLearn',url:'https://www.open.edu/openlearn/education-development',cost:'Free learning resource',hours:5},
  'Product operations':{provider:'Coursera · course catalogue',url:'https://www.coursera.org/search?query=product%20operations',cost:'Provider pricing varies',hours:8},
  'Customer research':{provider:'Coursera · course catalogue',url:'https://www.coursera.org/search?query=user%20research',cost:'Provider pricing varies',hours:7},
  'Workflow management':{provider:'Atlassian University',url:'https://university.atlassian.com/',cost:'Free learning resource',hours:5},
};
const translations: Record<Language, Record<string,string>> = {
  EN:{
    saving:'Saving…',profileSaved:'Profile saved to your account.',profileInvalid:'Enter a name and choose at least one skill.',signOut:'Sign out',dataControls:'Your data',exportData:'Download my data',eraseData:'Erase workspace data',eraseConfirm:'Permanently delete your profile, learning progress and all team records? This cannot be undone. Your sign-in account will remain.',erased:'Workspace data deleted.',accountStorage:'Your profile and learning progress are stored privately against your account. Do not include identity documents, financial details or other sensitive information.',startProfile:'Create your skills profile to see personalised role matches.',allCoreSkills:'You already list the core skills for this pathway. Use the provider resources to practise and validate them.',
    overview:'Overview',discover:'Discover',org:'Company',signals:'Market signals',pathway:'Learning pathway',profile:'My profile',team:'Team view',workspace:'Your workspace',
    greeting:'A clearer next step starts with what you already know.',sub:'Explore adjacent roles using public job-posting evidence. Your path stays yours.',
    refresh:'Refresh public signals',live:'Live public-source snapshot',matches:'Possible next steps',profileLabel:'Your profile',skill:'Skills',gap:'To explore',pathwayTitle:'A learning plan, not a promise',source:'Evidence, with its limits',
    privacy:'Your private workspace',privacyNote:'Your profile and progress belong to your account. Only you can access the team records you create.',agency:'Built for informed choices, not hiring decisions.',careerCompass:'Career compass',chooseLanguage:'Choose language',editProfile:'Edit profile',nextChapter:'Nexora · your next chapter',
    heroLabel:'A small, practical first step',heroTitle:'Build your next step around your strengths.',heroBody:'You are not starting over. See which strengths travel with you, what could be learned next, and what public market data can—and cannot—say.',
    profileLed:'Profile-led exploration',noHiring:'No hiring decisions',skillsInProfile:'Skills in your profile',rolesScored:'Roles scored with live evidence',stepsCompleted:'Learning steps completed',
    adjacent:'Adjacent roles worth a look',rankedAgainst:'Ranked against your editable skills, interests and current source signals.',evidence:'Evidence',planningLens:'Planning lens',moderate:'Moderate',faster:'Faster change',
    moderateFormula:'Moderate: 65% skill overlap, 20% interest, 15% relative live signal.',fastFormula:'Faster change: 50% skill overlap, 15% interest, 35% relative live signal.',scenarioCaveat:'These are illustrative weighting scenarios, not AI forecasts or probabilities.',
    option:'Option',fit:'fit',skillsBreakdown:'Skills',interestAlignment:'Interest alignment',relativeSignal:'Relative live signal support',explore:'Explore',seePathway:'See learning pathway',
    roleFitTitle:'How role fit works:',roleFitText:'Each scenario weights profile skill overlap, interest alignment and relative live source skill signals differently. Both estimates appear on every role card. Scores update with the live snapshot and your edits. Background, age, gender and ethnicity are never used. This supports your judgment; it does not decide for you.',
    sourceUnavailable:'Public signal snapshot unavailable.',sourceError:'The source could not be reached. Match scores are not shown without live evidence.',tryAgain:'Try again',noSignal:'No signal data in this snapshot.',noSignalDetail:'The role catalogue remains illustrative; no live demand score is being calculated.',refreshSource:'Refresh source',
    remoteInView:'Remote work, in view.',noLiveSnapshot:'No live signal snapshot is available. Role scores stay unranked until public evidence loads.',publicPostings:'public postings in source snapshot · refreshed',sourceAttribution:'is the public source. This global remote-job sample does not represent all Malaysian employment. Counts are posting tags, not a forecast.',
    profileBrief:'Your profile, in brief',editSkills:'Edit skills & interests',disruptionDisclosure:'Moderate vs fast disruption',disruptionText:'These are planning scenarios—not predictions or probabilities. Compare paths; no role is labelled safe or certain.',
    signalsEyebrow:'Evidence, with its limits',signalsHeading:'What the market is signalling',signalsIntro:'A dated snapshot of skills mentioned in Himalayas job postings—not a map of every Malaysian opportunity.',
    publicTags:'Public posting tags',skillsSnapshot:'Skills appearing in this snapshot',liveData:'Live data',taggedPostings:'tagged postings',shareDefinition:'Share is the portion of source postings carrying this tag. A posting may carry multiple tags.',
    sourceApiTitle:'Himalayas job API',globalLimit:'Global remote listings are a useful, limited lens. They are not representative of all Malaysian employment, local hiring practices or every occupation.',
    fetched:'Fetched',sourceUpdate:'Source update',sample:'Sample',notAvailable:'Not yet available',notProvided:'Not provided',postings:'postings',remoteWebsite:'Himalayas website',apiSource:'Public API source',
    forecastCaveat:'Forecasts are estimates, not promises.',forecastText:'Moderate and fast disruption scenarios help you compare learning priorities. They do not predict individual outcomes.',
    scenarioLens:'Scenario lens',moderateText:'Gradual task shifts leave more room to build adjacent skills alongside current work.',fastText:'A faster pace suggests prioritising transferable strengths and shorter learning loops.',
    illustrativeLens:'Both are illustrative planning lenses, not evidence-based forecasts.',
    profileEyebrow:'Your learner profile',profileHeading:'Start with what is true for you.',profileIntro:'Your saved skills and interests shape role exploration. Edit them whenever your goals change.',
    localStorage:'Saved privately to your account',aboutNextStep:'About your next step',name:'Name or preferred name',currentRole:'Current role or study',experience:'Experience',skillsToUse:'Skills you want to use',interestsToExplore:'Interests to explore',
    commaSkills:'Choose all that apply. Your selections shape role matches.',interestHint:'Choose all that interest you. Interests personalise exploration, not eligibility.',otherSkill:'Other:',otherInterest:'Other:',otherPlaceholder:'Enter an option not listed',addOption:'Add',selectedOptions:'selected',localEdits:'Save changes to sync your profile across devices.',saveProfile:'Save profile',
    fairness:'Skills-only fairness disclosure',fairnessText:'Role fit uses only your editable skills and interests plus public-source skill-tag share. It excludes age, gender, ethnicity and background. Suggestions support human judgment; they are not hiring decisions.',
    dataNotice:'Share only the details needed for career planning. A preferred name is enough. Your name, current role and experience do not affect matching.',skillsTravel:'Skills that travel',strengthStart:'A strength is a starting point.',transferableText:'Communication, problem solving and coordination transfer across many occupations. You decide which strengths are accurate and worth carrying forward.',
    exploreMatches:'Explore role matches',privacyTitle:'You control your details',dataControlNote:'Download your workspace data or erase it below. Team data is private to your account; this app does not send invitations or share records with employers.',
    pathwayIntro:'Pick a role to shape a small, practical sequence. Providers and catalogues are linked; availability and pricing may change.',roleMatches:'Role matches',chooseDirection:'Choose a direction',chooseRole:'Choose a role to explore',
    pathwayNotice:'Learning priorities reflect the skills you have not yet listed. Time estimates are planning guidance, not provider-certified durations. Verify current course details and pricing with each provider.',learningSteps:'Learning steps',buildToward:'Build toward',estimatedHours:'estimated hours',openProvider:'Open provider',
    markIncomplete:'Mark incomplete',markComplete:'Mark complete',stepCompletion:'Completion is self-reported and saved to your account, not an accredited certification. Links open provider catalogues or resources.',
    pathwayProgress:'Pathway progress',stepsMarked:'steps marked complete',firstStep:'First step taken',pathwayExplorer:'Pathway explorer',potentialContribution:'Potential contribution',directionMatters:'Your direction can matter',
    skillSdg:'Skill-to-SDG associations',sdgDisclosure:'SDG tags are associations for the role and skills, not measured impact or a performance score.',
    autoReplanning:'Auto re-planning',replanningText:'When public signals refresh, fit scores and role ordering recalculate. Your completed learning steps stay saved; the next step is yours to choose.',
    mobileNav:'Workspace navigation',brandCaption:'Future workforce',aboutHours:'about',hourUnit:'hours',roleReference:'Role reference',referenceSearch:'O*NET search',liveSkillSignal:'Live skill signal',freeResource:'Free learning resource',pricingVaries:'Provider pricing varies',
    roleAnalyst:'Data Analyst',roleSuccess:'Customer Success Manager',roleOps:'Business Operations Analyst',roleLearning:'Learning & Development Coordinator',roleProduct:'Product Operations Associate',
    summaryAnalyst:'Turn operational and customer data into useful decisions.',summarySuccess:'Help customers adopt products and reach measurable outcomes.',summaryOps:'Improve how a team works through clearer processes and evidence.',summaryLearning:'Coordinate practical learning that helps people grow at work.',summaryProduct:'Connect customer feedback, product teams and reliable delivery.',
  },
  BM:{
    saving:'Menyimpan…',profileSaved:'Profil disimpan dalam akaun anda.',profileInvalid:'Masukkan nama dan pilih sekurang-kurangnya satu kemahiran.',signOut:'Log keluar',dataControls:'Data anda',exportData:'Muat turun data saya',eraseData:'Padam data ruang kerja',eraseConfirm:'Padam profil, kemajuan pembelajaran dan semua rekod pasukan secara kekal? Tindakan ini tidak boleh dibuat asal. Akaun log masuk anda dikekalkan.',erased:'Data ruang kerja dipadam.',accountStorage:'Profil dan kemajuan pembelajaran disimpan secara peribadi dalam akaun anda. Jangan masukkan dokumen pengenalan, maklumat kewangan atau maklumat sensitif.',startProfile:'Cipta profil kemahiran untuk melihat padanan peranan peribadi.',allCoreSkills:'Anda sudah menyenaraikan kemahiran teras laluan ini. Gunakan sumber penyedia untuk berlatih dan mengesahkannya.',
    overview:'Ringkasan',discover:'Teroka',org:'Syarikat',signals:'Isyarat pasaran',pathway:'Laluan pembelajaran',profile:'Profil saya',team:'Paparan pasukan',workspace:'Ruang kerja anda',
    greeting:'Langkah seterusnya yang lebih jelas bermula dengan apa yang anda sudah tahu.',sub:'Terokai peranan berdekatan berdasarkan bukti iklan kerja awam. Laluan kerjaya tetap pilihan anda.',
    refresh:'Segar semula isyarat awam',live:'Snapshot sumber awam langsung',matches:'Langkah seterusnya yang mungkin',profileLabel:'Profil anda',skill:'Kemahiran',gap:'Untuk diterokai',pathwayTitle:'Pelan pembelajaran, bukan janji',source:'Bukti dan batasannya',
    privacy:'Ruang kerja peribadi anda',privacyNote:'Profil dan kemajuan milik akaun anda. Hanya anda boleh mengakses rekod pasukan yang anda cipta.',agency:'Untuk pilihan termaklum, bukan keputusan pengambilan pekerja.',careerCompass:'Kompas kerjaya',chooseLanguage:'Pilih bahasa',editProfile:'Edit profil',nextChapter:'Nexora · langkah anda seterusnya',
    heroLabel:'Langkah pertama yang kecil dan praktikal',heroTitle:'Bina langkah seterusnya berdasarkan kekuatan anda.',heroBody:'Anda tidak bermula semula. Lihat kekuatan yang boleh dibawa ke hadapan, perkara yang boleh dipelajari seterusnya, serta perkara yang boleh dan tidak boleh ditunjukkan oleh data pasaran awam.',
    profileLed:'Penerokaan berdasarkan profil',noHiring:'Bukan untuk keputusan pengambilan',skillsInProfile:'Kemahiran dalam profil anda',rolesScored:'Peranan dinilai dengan bukti langsung',stepsCompleted:'Langkah pembelajaran selesai',
    adjacent:'Peranan berdekatan untuk diterokai',rankedAgainst:'Disusun berdasarkan kemahiran, minat dan isyarat sumber semasa yang boleh anda edit.',evidence:'Bukti',planningLens:'Sudut perancangan',moderate:'Sederhana',faster:'Perubahan lebih pantas',
    moderateFormula:'Sederhana: 65% padanan kemahiran, 20% minat, 15% isyarat langsung relatif.',fastFormula:'Perubahan lebih pantas: 50% padanan kemahiran, 15% minat, 35% isyarat langsung relatif.',scenarioCaveat:'Ini senario pemberat ilustratif, bukan ramalan atau kebarangkalian AI.',
    option:'Pilihan',fit:'padanan',skillsBreakdown:'Kemahiran',interestAlignment:'Keselarasan minat',relativeSignal:'Sokongan isyarat langsung relatif',explore:'Terokai',seePathway:'Lihat laluan pembelajaran',
    roleFitTitle:'Cara padanan peranan dikira:',roleFitText:'Setiap senario memberi pemberat berbeza kepada padanan kemahiran profil, keselarasan minat dan isyarat kemahiran sumber langsung relatif. Kedua-dua anggaran dipaparkan pada setiap kad peranan. Skor berubah apabila snapshot langsung atau profil anda berubah. Umur, jantina, etnik dan latar belakang tidak digunakan. Cadangan ini menyokong pertimbangan anda, bukan membuat keputusan bagi pihak anda.',
    sourceUnavailable:'Snapshot isyarat awam tidak tersedia.',sourceError:'Sumber tidak dapat dicapai. Skor padanan tidak dipaparkan tanpa bukti langsung.',tryAgain:'Cuba lagi',noSignal:'Tiada data isyarat dalam snapshot ini.',noSignalDetail:'Katalog peranan hanya untuk ilustrasi; skor permintaan langsung tidak dikira.',refreshSource:'Segar semula sumber',
    remoteInView:'Kerja jarak jauh, dalam tinjauan.',noLiveSnapshot:'Snapshot isyarat langsung tidak tersedia. Skor peranan tidak disusun sehingga bukti awam dimuatkan.',publicPostings:'iklan awam dalam snapshot sumber · dikemas kini',
    sourceAttribution:'ialah sumber awam. Sampel kerja jarak jauh global ini tidak mewakili keseluruhan pekerjaan di Malaysia. Kiraan ialah tag iklan, bukan ramalan.',
    profileBrief:'Ringkasan profil anda',editSkills:'Edit kemahiran & minat',disruptionDisclosure:'Gangguan sederhana berbanding pantas',disruptionText:'Ini senario perancangan, bukan ramalan atau kebarangkalian. Bandingkan laluan; tiada peranan dilabel selamat atau pasti.',
    signalsEyebrow:'Bukti dan batasannya',signalsHeading:'Isyarat daripada pasaran',signalsIntro:'Snapshot bertarikh bagi kemahiran dalam iklan kerja awam Himalayas—bukan gambaran semua peluang pekerjaan di Malaysia.',
    publicTags:'Tag iklan awam',skillsSnapshot:'Kemahiran dalam snapshot ini',liveData:'Data langsung',taggedPostings:'iklan bertag',shareDefinition:'Bahagian ialah peratus iklan sumber yang mempunyai tag ini. Satu iklan boleh mempunyai beberapa tag.',
    sourceApiTitle:'API kerja awam Himalayas',globalLimit:'Senarai kerja jarak jauh global memberi gambaran terhad. Ia tidak mewakili semua pekerjaan di Malaysia, amalan pengambilan tempatan atau setiap pekerjaan.',
    fetched:'Diambil pada',sourceUpdate:'Kemas kini sumber',sample:'Sampel',notAvailable:'Belum tersedia',notProvided:'Tidak diberikan',postings:'iklan',remoteWebsite:'Laman Himalayas',apiSource:'Sumber API awam',
    forecastCaveat:'Ramalan ialah anggaran, bukan janji.',forecastText:'Senario gangguan sederhana dan pantas membantu anda membandingkan keutamaan pembelajaran. Ia tidak meramalkan hasil individu.',
    scenarioLens:'Sudut senario',moderateText:'Perubahan tugas beransur-ansur memberi lebih ruang untuk membina kemahiran berdekatan sambil bekerja.',fastText:'Perubahan lebih pantas mengutamakan kekuatan boleh pindah dan kitaran pembelajaran yang lebih singkat.',
    illustrativeLens:'Kedua-duanya ialah sudut perancangan ilustratif, bukan ramalan berasaskan bukti.',
    profileEyebrow:'Profil pembelajaran anda',profileHeading:'Mulakan dengan perkara yang benar bagi anda.',profileIntro:'Kemahiran dan minat yang disimpan membentuk penerokaan peranan. Edit apabila matlamat berubah.',
    localStorage:'Disimpan secara peribadi dalam akaun',aboutNextStep:'Tentang langkah anda seterusnya',name:'Nama atau nama pilihan',currentRole:'Peranan atau pengajian semasa',experience:'Pengalaman',skillsToUse:'Kemahiran yang ingin digunakan',interestsToExplore:'Minat untuk diterokai',
    commaSkills:'Pilih semua yang berkaitan. Pilihan anda membentuk padanan peranan.',interestHint:'Pilih semua minat anda. Minat memperibadikan penerokaan, bukan kelayakan.',otherSkill:'Lain-lain:',otherInterest:'Lain-lain:',otherPlaceholder:'Masukkan pilihan yang tiada dalam senarai',addOption:'Tambah',selectedOptions:'dipilih',localEdits:'Simpan perubahan untuk menyegerakkan profil merentas peranti.',saveProfile:'Simpan profil',
    fairness:'Pendedahan keadilan berasaskan kemahiran sahaja',fairnessText:'Padanan peranan hanya menggunakan kemahiran dan minat yang anda edit serta bahagian tag kemahiran daripada sumber awam. Umur, jantina, etnik dan latar belakang dikecualikan. Cadangan menyokong pertimbangan manusia, bukan keputusan pengambilan.',
    dataNotice:'Kongsi hanya maklumat yang diperlukan untuk perancangan kerjaya. Nama pilihan sudah memadai. Nama, peranan semasa dan pengalaman tidak mempengaruhi padanan.',skillsTravel:'Kemahiran yang boleh dibawa',strengthStart:'Kekuatan ialah titik permulaan.',transferableText:'Komunikasi, penyelesaian masalah dan penyelarasan berguna merentas pelbagai pekerjaan. Anda tentukan kekuatan yang tepat dan ingin dibawa ke hadapan.',
    exploreMatches:'Terokai padanan peranan',privacyTitle:'Anda mengawal butiran anda',dataControlNote:'Muat turun atau padam data ruang kerja di bawah. Data pasukan peribadi dalam akaun anda; tiada jemputan atau perkongsian dengan majikan.',
    pathwayIntro:'Pilih peranan untuk membentuk urutan kecil yang praktikal. Pautan penyedia dan katalog disertakan; ketersediaan dan harga mungkin berubah.',roleMatches:'Padanan peranan',chooseDirection:'Pilih hala tuju',chooseRole:'Pilih peranan untuk diterokai',
    pathwayNotice:'Keutamaan berdasarkan kemahiran yang belum disenaraikan. Anggaran masa ialah panduan perancangan, bukan tempoh diperakui penyedia. Semak butiran dan harga semasa.',learningSteps:'Langkah pembelajaran',buildToward:'Bina kemahiran ke arah',estimatedHours:'anggaran jam',openProvider:'Buka penyedia',
    markIncomplete:'Tandakan belum selesai',markComplete:'Tandakan selesai',stepCompletion:'Penyelesaian dilaporkan sendiri dan disimpan dalam akaun, bukan pensijilan bertauliah. Pautan membuka katalog atau sumber penyedia.',
    pathwayProgress:'Kemajuan laluan',stepsMarked:'langkah ditandakan selesai',firstStep:'Langkah pertama diambil',pathwayExplorer:'Peneroka laluan',potentialContribution:'Sumbangan berpotensi',directionMatters:'Hala tuju anda boleh memberi makna',
    skillSdg:'Hubungan kemahiran dengan SDG',sdgDisclosure:'Tag SDG ialah perkaitan peranan dan kemahiran, bukan impak terukur atau skor prestasi.',
    autoReplanning:'Perancangan semula automatik',replanningText:'Apabila isyarat awam disegarkan, skor padanan dan susunan peranan dikira semula. Langkah pembelajaran yang selesai kekal disimpan; anda memilih langkah seterusnya.',
    mobileNav:'Navigasi ruang kerja',brandCaption:'Tenaga kerja masa depan',aboutHours:'kira-kira',hourUnit:'jam',roleReference:'Rujukan peranan',referenceSearch:'Carian O*NET',liveSkillSignal:'Isyarat kemahiran langsung',freeResource:'Sumber pembelajaran percuma',pricingVaries:'Harga bergantung pada penyedia',
    roleAnalyst:'Penganalisis Data',roleSuccess:'Pengurus Kejayaan Pelanggan',roleOps:'Penganalisis Operasi Perniagaan',roleLearning:'Penyelaras Pembelajaran & Pembangunan',roleProduct:'Eksekutif Operasi Produk',
    summaryAnalyst:'Gunakan data operasi dan pelanggan untuk menyokong keputusan yang berguna.',summarySuccess:'Bantu pelanggan menggunakan produk dan mencapai hasil yang bermakna.',summaryOps:'Tambah baik cara pasukan bekerja melalui proses dan bukti yang lebih jelas.',summaryLearning:'Selaras pembelajaran praktikal untuk membantu perkembangan di tempat kerja.',summaryProduct:'Hubungkan maklum balas pelanggan, pasukan produk dan penyampaian yang boleh dipercayai.',
  },
  '中文':{
    saving:'正在保存…',profileSaved:'资料已保存到你的账户。',profileInvalid:'请输入姓名并至少选择一项技能。',signOut:'退出登录',dataControls:'你的数据',exportData:'下载我的数据',eraseData:'清除工作空间数据',eraseConfirm:'永久删除你的资料、学习进度和所有团队记录？此操作无法撤销。你的登录账户会保留。',erased:'工作空间数据已删除。',accountStorage:'资料与学习进度保存在你的私人账户中。请勿填写身份证件、财务资料或其他敏感信息。',startProfile:'创建技能资料，查看个性化岗位匹配。',allCoreSkills:'你已列出此路径的核心技能。可使用学习资源练习和验证。',
    overview:'概览',discover:'发现',org:'公司',signals:'市场信号',pathway:'学习路径',profile:'我的资料',team:'团队视图',workspace:'你的工作空间',
    greeting:'更清晰的下一步，从你已有的能力开始。',sub:'依据公开职位信息探索相邻岗位。职业路径由你决定。',
    refresh:'刷新公开信号',live:'实时公开来源快照',matches:'可能的下一步',profileLabel:'你的资料',skill:'技能',gap:'待探索',pathwayTitle:'学习计划，而非承诺',source:'证据及其局限',
    privacy:'你的私人工作空间',privacyNote:'资料和进度属于你的账户。只有你能访问自己创建的团队记录。',agency:'帮助你做出知情选择，不用于招聘决策。',careerCompass:'职业罗盘',chooseLanguage:'选择语言',editProfile:'编辑资料',nextChapter:'Nexora · 你的下一步',
    heroLabel:'一个小而实际的第一步',heroTitle:'以你的优势为基础，规划下一步。',heroBody:'你不是从零开始。看看哪些优势可以延续、下一步可以学习什么，以及公开市场数据能说明和不能说明什么。',
    profileLed:'基于个人资料探索',noHiring:'不用于招聘决策',skillsInProfile:'资料中的技能',rolesScored:'依据实时证据评估的岗位',stepsCompleted:'已完成的学习步骤',
    adjacent:'值得了解的相邻岗位',rankedAgainst:'依据可编辑的技能、兴趣和当前来源信号排序。',evidence:'证据',planningLens:'规划视角',moderate:'适度变化',faster:'变化更快',
    moderateFormula:'适度变化：技能重合 65%、兴趣 20%、相对实时信号 15%。',fastFormula:'变化更快：技能重合 50%、兴趣 15%、相对实时信号 35%。',scenarioCaveat:'这是用于说明权重的情景，不是 AI 预测或概率。',
    option:'选项',fit:'匹配度',skillsBreakdown:'技能',interestAlignment:'兴趣契合',relativeSignal:'相对实时信号支持度',explore:'探索',seePathway:'查看学习路径',
    roleFitTitle:'岗位匹配度如何计算：',roleFitText:'不同情景会以不同权重综合个人资料中的技能重合度、兴趣契合度和公开来源技能信号相对值。每张岗位卡都会显示两种估算。实时快照或个人资料改变时，分数也会更新。评分不使用年龄、性别、族裔或背景。这些建议用于辅助判断，不替你做决定。',
    sourceUnavailable:'公开信号快照暂不可用。',sourceError:'无法访问数据源。没有实时证据时不显示匹配分数。',tryAgain:'重试',noSignal:'此快照中没有信号数据。',noSignalDetail:'岗位目录仅用于示例；当前未计算实时需求分数。',refreshSource:'刷新来源',
    remoteInView:'观察远程工作市场。',noLiveSnapshot:'暂无实时信号快照。加载公开证据前，岗位不会按分数排序。',publicPostings:'来源快照中的公开职位 · 刷新时间',
    sourceAttribution:'是公开数据来源。这个全球远程职位样本不能代表马来西亚整体就业情况。数量是职位标签统计，不是预测。',
    profileBrief:'个人资料摘要',editSkills:'编辑技能与兴趣',disruptionDisclosure:'适度变化与快速变化',disruptionText:'这些是规划情景，不是预测或概率。请比较不同路径；没有岗位被标记为安全或确定。',
    signalsEyebrow:'了解证据及其局限',signalsHeading:'市场正在发出什么信号',signalsIntro:'这是带日期的 Himalayas 公开职位技能快照，并不涵盖马来西亚所有就业机会。',
    publicTags:'公开职位标签',skillsSnapshot:'快照中出现的技能',liveData:'实时数据',taggedPostings:'条带标签的职位',shareDefinition:'占比表示来源职位中带有该标签的比例。一个职位可能包含多个标签。',
    sourceApiTitle:'Himalayas 公开职位 API',globalLimit:'全球远程职位是一个有限的观察视角，并不代表马来西亚所有就业、本地招聘实践或所有职业。',
    fetched:'获取时间',sourceUpdate:'来源更新时间',sample:'样本',notAvailable:'暂不可用',notProvided:'未提供',postings:'个职位',remoteWebsite:'Himalayas 网站',apiSource:'公开 API 来源',
    forecastCaveat:'预测只是估算，并非承诺。',forecastText:'适度和快速变化情景可帮助比较学习重点，但不会预测个人结果。',
    scenarioLens:'情景视角',moderateText:'任务逐步变化，能让你在当前工作中同步培养相邻技能。',fastText:'变化加快时，可优先发展可迁移优势并缩短学习周期。',
    illustrativeLens:'两者都是用于规划的示意情景，并非基于证据的预测。',
    profileEyebrow:'你的学习者资料',profileHeading:'从符合你实际情况的内容开始。',profileIntro:'已保存的技能与兴趣用于岗位探索。目标改变时可以随时编辑。',
    localStorage:'私密保存到你的账户',aboutNextStep:'关于你的下一步',name:'姓名或常用名',currentRole:'当前岗位或学习阶段',experience:'经验',skillsToUse:'希望运用的技能',interestsToExplore:'希望探索的兴趣',
    commaSkills:'请选择所有适用项。你的选择会影响岗位匹配。',interestHint:'请选择你感兴趣的所有内容。兴趣用于个性化探索，不用于资格判断。',otherSkill:'其他：',otherInterest:'其他：',otherPlaceholder:'输入列表中没有的选项',addOption:'添加',selectedOptions:'已选',localEdits:'保存更改，可在不同设备同步资料。',saveProfile:'保存资料',
    fairness:'仅依据技能的公平性说明',fairnessText:'岗位匹配仅使用你可编辑的技能、兴趣和公开来源技能标签占比。不使用年龄、性别、族裔或背景。建议用于辅助人工判断，不用于招聘决策。',
    dataNotice:'只填写职业规划所需的信息，常用名即可。姓名、当前岗位与经验不会影响匹配。',skillsTravel:'可迁移的技能',strengthStart:'优势是一个起点。',transferableText:'沟通、解决问题和协调可应用于不同职业。哪些优势符合你的情况、值得延续，由你决定。',
    exploreMatches:'探索岗位匹配',privacyTitle:'你掌控自己的资料',dataControlNote:'可在下方下载或删除工作空间数据。团队数据仅供你的账户使用；应用不会向雇主发送邀请或共享记录。',
    pathwayIntro:'选择一个岗位，建立小而实用的学习步骤。页面链接到学习平台与目录；课程和价格可能变化。',roleMatches:'岗位匹配',chooseDirection:'选择一个方向',chooseRole:'选择想探索的岗位',
    pathwayNotice:'学习重点依据你尚未列出的技能。时间仅为规划估算，并非平台认证时长。请向课程平台核实详情与价格。',learningSteps:'学习步骤',buildToward:'为此岗位逐步积累',estimatedHours:'预计小时',openProvider:'打开学习平台',
    markIncomplete:'标记为未完成',markComplete:'标记为已完成',stepCompletion:'完成状态由你自行记录并保存到账户，并非认证资格。链接会打开学习平台目录或资源。',
    pathwayProgress:'路径进度',stepsMarked:'个步骤已标记完成',firstStep:'迈出第一步',pathwayExplorer:'路径探索者',potentialContribution:'潜在贡献',directionMatters:'你的方向可以带来意义',
    skillSdg:'技能与可持续发展目标的关联',sdgDisclosure:'目标标签表示岗位与技能的关联，并非实际影响测量或绩效评分。',
    autoReplanning:'自动重新规划',replanningText:'刷新公开信号后，匹配分数和岗位顺序会重新计算。已完成的学习步骤会保留；下一步由你决定。',
    mobileNav:'工作空间导航',brandCaption:'未来职场',aboutHours:'约',hourUnit:'小时',roleReference:'岗位参考',referenceSearch:'搜索 O*NET',liveSkillSignal:'实时技能信号',freeResource:'免费学习资源',pricingVaries:'价格以平台为准',
    roleAnalyst:'数据分析师',roleSuccess:'客户成功经理',roleOps:'业务运营分析师',roleLearning:'学习与发展协调员',roleProduct:'产品运营专员',
    summaryAnalyst:'将运营和客户数据转化为有用的决策依据。',summarySuccess:'帮助客户采用产品并实现可衡量的成果。',summaryOps:'通过更清晰的流程和证据改善团队工作方式。',summaryLearning:'协调实用学习，支持员工在工作中成长。',summaryProduct:'连接客户反馈、产品团队与可靠交付。',
  },
};
const choiceTranslations: Record<Language,Record<string,string>> = {
  EN:{},
  BM:{
    'Customer support':'Sokongan pelanggan','Communication':'Komunikasi','Problem solving':'Penyelesaian masalah','Data analysis':'Analisis data',
    'Process improvement':'Penambahbaikan proses','Project coordination':'Penyelarasan projek','Learning design':'Reka bentuk pembelajaran',
    'Facilitation':'Fasilitasi','Digital marketing':'Pemasaran digital','Cybersecurity':'Keselamatan siber','UX design':'Reka bentuk UX',
    'Product operations':'Operasi produk','AI literacy':'Literasi AI','Cloud computing':'Pengkomputeran awan','Customer research':'Kajian pelanggan','Sales':'Jualan',
    'People development':'Pembangunan insan','Digital products':'Produk digital','Education & learning':'Pendidikan & pembelajaran',
    'Sustainability':'Kelestarian','Clean energy':'Tenaga bersih','Healthcare':'Penjagaan kesihatan',
    'Smart agriculture':'Pertanian pintar','Responsible AI':'AI bertanggungjawab','Customer experience':'Pengalaman pelanggan',
    'Product design':'Reka bentuk produk','Business operations':'Operasi perniagaan','Entrepreneurship':'Keusahawanan',
  },
  '中文':{
    'Customer support':'客户支持','Communication':'沟通','Problem solving':'解决问题','Data analysis':'数据分析',
    'Process improvement':'流程改进','Project coordination':'项目协调','Learning design':'学习设计',
    'Facilitation':'引导','Digital marketing':'数字营销','Cybersecurity':'网络安全','UX design':'用户体验设计',
    'Product operations':'产品运营','AI literacy':'AI 素养','Cloud computing':'云计算','Customer research':'客户研究','Sales':'销售',
    'People development':'人才发展','Digital products':'数字产品','Education & learning':'教育与学习',
    'Sustainability':'可持续发展','Clean energy':'清洁能源','Healthcare':'医疗健康',
    'Smart agriculture':'智慧农业','Responsible AI':'负责任的 AI','Customer experience':'客户体验',
    'Product design':'产品设计','Business operations':'业务运营','Entrepreneurship':'创业',
  },
};
const choiceLabel = (language:Language,value:string) => choiceTranslations[language][value]??value;

const navItems: {id:View;labelKey:string;icon:typeof Compass}[] = [
  {id:'overview',labelKey:'overview',icon:Compass},{id:'discover',labelKey:'discover',icon:Sparkles},{id:'signals',labelKey:'signals',icon:Activity},
  {id:'pathway',labelKey:'pathway',icon:Waypoints},{id:'profile',labelKey:'profile',icon:UserRound},{id:'team',labelKey:'team',icon:Users},{id:'org',labelKey:'org',icon:Building2},
];
const stored = <T,>(key:string,fallback:T):T => { try { const value=localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };

function Home({workspace}:{workspace:Workspace}) {
  const profile=workspace.profile??emptyProfile;
  const completion=useMemo(()=>Object.fromEntries(workspace.completedKeys.map(key=>[key,true])),[workspace.completedKeys]);
  const routerSearch=useSearch();
  const search=routerSearch||window.location.search;
  const searchParams=new URLSearchParams(search);
  const accountMode=workspaceModeFromSearch(search);
  const companyMode=accountMode==='company';
  const [view,setView]=useState<View>(()=>initialWorkspaceView(accountMode,searchParams.get('view'),!!workspace.profile));
  const [language,setLanguage]=useState<Language>(()=>stored('aiversecity-language','EN'));
  const [draft,setDraft]=useState<Profile>(profile);
  const [refresh,setRefresh]=useState(false);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [disruption,setDisruption]=useState<'moderate'|'fast'>('moderate');
  const [customSkill,setCustomSkill]=useState('');
  const [customInterest,setCustomInterest]=useState('');
  const [feedback,setFeedback]=useState('');
  const queryClient=useQueryClient();
  const {signOut,openUserProfile}=useClerk();const {user}=useUser();
  const profileMutation=useSaveLearnerProfile();
  const progressMutation=useSaveLearningProgress();
  const goalMutation=useSaveCareerGoal();
  const deleteMutation=useDeleteWorkspace();
  const {data,isLoading,isError,error}=useGetTrendSignals(undefined,{query:{queryKey:getGetTrendSignalsQueryKey(),retry:1,staleTime:300_000,refetchInterval:300_000}});
  const t=translations[language];
  const roleTitle=(roleId:string,fallback:string)=>t[`role${roleId[0].toUpperCase()}${roleId.slice(1)}`]??fallback;
  const roleSummary=(roleId:string,fallback:string)=>t[`summary${roleId[0].toUpperCase()}${roleId.slice(1)}`]??fallback;
  useEffect(()=>{localStorage.setItem('aiversecity-language',JSON.stringify(language));},[language]);
  const signals=isError?[]:(data as TrendSignalSnapshot|undefined)?.signals ?? [];
  const normalizedSignals=useMemo(()=>new Map(signals.map(s=>[s.skill.toLowerCase(),s])),[signals]);
  const signalMax=Math.max(...signals.map(s=>s.count),1);
  const roleEvidence=useMemo(()=>roleCatalog.map(role=>{
    const skillHits=role.skills.filter(skill=>profile.skills.some(own=>own.toLowerCase()===skill.toLowerCase()));
    const relevantInterests=roleInterests[role.id]??[];
    const interestHits=relevantInterests.filter(interest=>profile.interests.some(item=>item.toLowerCase()===interest.toLowerCase())).length;
    const roleSignal=role.skills.reduce((sum,skill)=>sum+(normalizedSignals.get(skill.toLowerCase())?.share??0),0);
    const skillPart=skillHits.length/role.skills.length;
    const interestPart=relevantInterests.length?interestHits/relevantInterests.length:0;
    return {...role,skillHits,gaps:role.skills.filter(s=>!skillHits.includes(s)),skillPart,interestPart,interestHits,relevantInterests,demand:roleSignal};
  }),[profile,normalizedSignals]);
  const maxRoleSignal=Math.max(...roleEvidence.map(role=>role.demand),0);
  const matchingRoles=useMemo(()=>roleEvidence.map(role=>{
    const signalPart=maxRoleSignal>0?role.demand/maxRoleSignal:0;
    const moderateScore=signals.length&&profile.skills.length?Math.round((role.skillPart*.65+role.interestPart*.2+signalPart*.15)*100):null;
    const fastScore=signals.length&&profile.skills.length?Math.round((role.skillPart*.5+role.interestPart*.15+signalPart*.35)*100):null;
    const score=disruption==='fast'?fastScore:moderateScore;
    return {...role,score,moderateScore,fastScore,signalPart};
  }).filter(r=>!profile.skills.length||r.skillHits.length>0||r.interestHits>0).sort((a,b)=>(b.score??-1)-(a.score??-1)),[roleEvidence,maxRoleSignal,signals.length,disruption,profile.skills.length]);
  const selectedRole=matchingRoles.find(r=>r.id===(expanded??workspace.goalRoleId))??matchingRoles[0];
  const steps:Step[]=selectedRole?.steps.filter(title=>completion[`${selectedRole.id}:${title}`]||!profile.skills.some(skill=>skill.toLowerCase()===stepSkills[title]?.toLowerCase())).map(title=>{const course=courseLinks[title]!;return {title,provider:course.provider,estimatedHours:course.hours,costLabel:course.cost,url:course.url,completed:!!completion[`${selectedRole.id}:${title}`]};})??[];
  const completedCount=steps.filter(s=>s.completed).length;
  const totalSteps=steps.length;
  const refreshSignals=async()=>{
    if(refresh)return;
    setRefresh(true);
    try {const snapshot=await getTrendSignals({refresh:true});queryClient.setQueryData(getGetTrendSignalsQueryKey(),snapshot);}
    catch {await queryClient.invalidateQueries({queryKey:getGetTrendSignalsQueryKey()});}
    finally {setRefresh(false);}
  };
  const toggleProfileChoice=(field:'skills'|'interests',value:string)=>{
    setDraft(current=>{
      const selected=current[field];
      return {...current,[field]:selected.some(item=>item.toLocaleLowerCase()===value.toLocaleLowerCase())?selected.filter(item=>item.toLocaleLowerCase()!==value.toLocaleLowerCase()):[...selected,value]};
    });
  };
  const addCustomChoice=(field:'skills'|'interests',value:string,clear:()=>void)=>{
    const clean=value.trim();
    if(!clean)return;
    setDraft(current=>{
      const selected=current[field];
      return selected.some(item=>item.toLocaleLowerCase()===clean.toLocaleLowerCase())?current:{...current,[field]:[...selected,clean]};
    });
    clear();
  };
  const availableSkills=[...skillOptions,...draft.skills.filter(value=>!skillOptions.some(option=>option.toLocaleLowerCase()===value.toLocaleLowerCase()))];
  const availableInterests=[...interestOptions,...draft.interests.filter(value=>!interestOptions.some(option=>option.toLocaleLowerCase()===value.toLocaleLowerCase()))];
  const saveProfile=async()=>{
    const unique=(items:string[])=>[...new Map(items.map(value=>[value.trim().toLowerCase(),value.trim()])).values()].filter(Boolean);
    const input={...draft,name:draft.name.trim(),currentRole:draft.currentRole.trim(),experience:draft.experience.trim(),skills:unique([...draft.skills,customSkill]),interests:unique([...draft.interests,customInterest])};
    if(!input.name||!input.skills.length){setFeedback(t.profileInvalid);return;}
    try {
      const saved=await profileMutation.mutateAsync({data:input});
      queryClient.setQueryData<Workspace>(getGetWorkspaceQueryKey(),current=>current?{...current,profile:saved}:current);
      setDraft(saved);setCustomSkill('');setCustomInterest('');setFeedback(t.profileSaved);
      if(!workspace.profile)setView('overview');
    }catch(error){setFeedback(error instanceof Error?error.message:'Unable to save profile');}
  };
  const orgMe=useOrgMe();
  const assignedKeys=(orgMe.data?.assignments??[]).map(x=>`org:${x.id}`);
  // The Company sign-in tab selects the administrator workspace; Personal sign-in keeps the personal workspace
  // available to the same Clerk identity. The server still determines whether this user is actually an administrator.
  const autoViewed=useRef(false);
  const previousAccountMode=useRef(accountMode);
  useEffect(()=>{
    if(!orgMe.data)return;
    if(previousAccountMode.current!==accountMode){
      previousAccountMode.current=accountMode;
      const nextView=viewAfterWorkspaceModeChange(accountMode,!!workspace.profile);
      if(nextView)setView(nextView);
    }
    if(!autoViewed.current){
      autoViewed.current=true;
      if(!accountMode&&orgMe.data.role==='admin'&&!searchParams.get('view'))setView('org');
    }
  },[orgMe.data,accountMode,companyMode,search,workspace.profile]);
  const [chosenDir,setChosenDir]=useState<string|null>(()=>stored<string|null>('nexora-direction',workspace.goalRoleId));
  const selectDir=(id:string)=>{setChosenDir(id);try{localStorage.setItem('nexora-direction',JSON.stringify(id));}catch{}};
  const curatedSteps=(id:string)=>{const r=roleCatalog.find(x=>x.id===id);return r?r.steps.map(title=>({key:`${id}:${title}`,title,provider:courseLinks[title].provider,url:courseLinks[title].url,cost:courseLinks[title].cost,hours:courseLinks[title].hours})):null;};
  const saveDiscovered=async(input:Profile)=>{const saved=await profileMutation.mutateAsync({data:input});queryClient.setQueryData<Workspace>(getGetWorkspaceQueryKey(),c=>c?{...c,profile:saved}:c);setDraft(saved);};
  const openProfile=()=>{setDraft(profile);setCustomSkill('');setCustomInterest('');setView('profile');};
  const toggleStep=async(key:string)=>{
    try {
      const result=await progressMutation.mutateAsync({stepKey:key,data:{completed:!completion[key]}});
      queryClient.setQueryData<Workspace>(getGetWorkspaceQueryKey(),current=>current?{...current,goalRoleId:key.startsWith('org:')?current.goalRoleId:key.split(':')[0],completedKeys:result.completed?[...new Set([...current.completedKeys,key])]:current.completedKeys.filter(item=>item!==key)}:current);
      setExpanded(null);
    }catch(error){setFeedback(error instanceof Error?error.message:'Unable to save progress');}
  };
  const chooseRole=async(roleId:string)=>{
    if(!workspace.profile){openProfile();setFeedback(t.startProfile);return;}
    setExpanded(roleId);setView('pathway');
    try {
      await goalMutation.mutateAsync({data:{roleId:roleId as CareerGoalInput['roleId']}});
      queryClient.setQueryData<Workspace>(getGetWorkspaceQueryKey(),current=>current?{...current,goalRoleId:roleId}:current);
      setExpanded(null);
    }catch(error){setExpanded(null);setFeedback(error instanceof Error?error.message:'Unable to save career direction');}
  };
  const exportData=async()=>{
    try {
      const [saved,team]=await Promise.all([getWorkspace(),listTeamMembers()]);
      const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),...saved,teamMembers:team},null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='nexora-workspace.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){setFeedback(error instanceof Error?error.message:'Unable to download data');}
  };
  const eraseData=async()=>{
    if(!window.confirm(t.eraseConfirm))return;
    try{
      await deleteMutation.mutateAsync();
      queryClient.setQueryData<Workspace>(getGetWorkspaceQueryKey(),{profile:null,completedKeys:[],goalRoleId:null});
      await queryClient.invalidateQueries({queryKey:getListTeamMembersQueryKey()});
      setDraft(emptyProfile);setCustomSkill('');setCustomInterest('');setExpanded(null);setView('profile');setFeedback(t.erased);
    }catch(error){setFeedback(error instanceof Error?error.message:'Unable to delete data');}
  };
  const freshness=data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString(language==='中文'?'zh-CN':language==='BM'?'ms-MY':'en-MY',{dateStyle:'medium',timeStyle:'short'}) : null;
  const signalState=isLoading?<div className="panel"><div className="loading-skeleton" style={{width:'32%',marginBottom:14}}/><div className="loading-skeleton" style={{width:'80%',marginBottom:10}}/><div className="loading-skeleton" style={{width:'62%'}}/></div>:isError?<div className="error-state" data-testid="status-signals-error"><b>{t.sourceUnavailable}</b><br/>{(error as Error)?.message||t.sourceError}<br/><button className="outline-button" onClick={refreshSignals} data-testid="button-retry-signals"><RefreshCw size={13}/> {t.tryAgain}</button></div>:!signals.length?<div className="empty-state" data-testid="status-signals-empty"><b>{t.noSignal}</b><br/>{t.noSignalDetail}<br/><button className="outline-button" onClick={refreshSignals} data-testid="button-refresh-empty"><RefreshCw size={13}/> {t.refreshSource}</button></div>:null;
  const sourceLink=data?.sourceUrl||'https://himalayas.app';
  const sourceApi=data?.sourceApiUrl||'https://himalayas.app/docs/remote-jobs-api';
  const roleCards=(limit?:number)=><div className="role-list">{matchingRoles.slice(0,limit).map((role,index)=><article className="role-card" key={role.id} data-testid={`card-role-${role.id}`}>
    <div className="role-title-row"><div><div className="section-kicker">{t.option} {String(index+1).padStart(2,'0')}</div><h3 style={{marginTop:5}}>{roleTitle(role.id,role.title)}</h3></div><div className="role-score">{role.score===null?'—':`${role.score}%`}<small> {t.fit}</small></div></div>
    <p>{roleSummary(role.id,role.summary)}</p><div className="match-bar"><span style={{width:`${role.score??0}%`}}/></div>
    <div className="breakdown"><span>{t.skillsBreakdown} {role.skillHits.length}/{role.skills.length}</span><span title={role.relevantInterests.join(', ')}>{t.interestAlignment} {role.interestHits}/{role.relevantInterests.length}</span><span>{t.relativeSignal} {Math.round(role.signalPart*100)}%</span></div>
    <div className="skill-chips" style={{marginTop:11}}>{role.skillHits.map(s=><span className="skill-chip" key={s}>{s}</span>)}{role.gaps.slice(0,3).map(s=><span className="skill-chip gap" key={s}>{t.explore} · {s}</span>)}</div>
    <div className="sdg-row">{role.sdgs.map(s=><span className="sdg-tag" data-sdg={sdgNum(s)} key={s}>{sdgLabel(s)}</span>)}</div>
    <div className="role-scenarios"><span>{t.moderate} <b>{role.moderateScore===null?'—':`${role.moderateScore}%`}</b></span><span>{t.faster} <b>{role.fastScore===null?'—':`${role.fastScore}%`}</b></span></div>
    <div className="role-citations"><span>{t.roleReference}: <a href={`https://www.onetonline.org/find/quick?s=${encodeURIComponent(role.title)}`} target="_blank" rel="noreferrer">{t.referenceSearch}</a></span><span>{t.liveSkillSignal}: <a href={sourceLink} target="_blank" rel="noreferrer">Himalayas</a></span></div>
    <button className="quiet-button" style={{marginTop:8,paddingLeft:0}} onClick={()=>chooseRole(role.id)} data-testid={`button-pathway-${role.id}`}>{t.seePathway} <ArrowRight size={13}/></button>
  </article>)}</div>;

  const account={name:user?.fullName??user?.firstName??'',email:user?.primaryEmailAddress?.emailAddress??'',onSignOut:()=>signOut({redirectUrl:import.meta.env.BASE_URL}),onManage:()=>openUserProfile()};
  // Only a server-confirmed administrator gets the admin shell, and the selected tab chooses which workspace opens.
  if(orgMe.isLoading)return <div className="app-shell"><main className="main-area"><div className="content"><p className="dc-note" data-testid="text-loading-workspace">Loading your workspace…</p></div></main></div>;
  if(shouldShowAdminWorkspace(orgMe.data?.role,accountMode))return <AdminShell account={account}/>;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">N</div><div><div className="brand-name">Nexora</div><div className="brand-caption">{t.brandCaption}</div></div></div>
      <div className="nav-label">{t.workspace}</div>
      {navItems.map(item=><button key={item.id} className={`nav-item ${view===item.id?'active':''}`} onClick={()=>item.id==='profile'&&view!=='profile'?openProfile():setView(item.id)} data-testid={`nav-${item.id}`}><item.icon size={17}/>{t[item.labelKey]}</button>)}
      <div className="sidebar-bottom"><div className="privacy-note"><b><ShieldCheck size={12} style={{verticalAlign:'-2px',marginRight:5}}/>{t.privacy}</b>{t.privacyNote}</div><div style={{padding:'14px 12px 0',fontSize:10,color:'#CBD5E1'}}>{t.agency}</div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><span className="live-dot"/><span>{t.careerCompass} <span style={{color:'#94A3B8'}}> / </span>{t[view]}</span></div>
        <div className="top-actions"><select className="lang-select" aria-label={t.chooseLanguage} value={language} onChange={e=>setLanguage(e.target.value as Language)} data-testid="select-language"><option value="EN">EN · English</option><option value="BM">BM · Bahasa Malaysia</option><option value="中文">中文 · Chinese</option></select>
        {view!=='profile'&&<button className="icon-button" aria-label={t.editProfile} title={t.editProfile} onClick={openProfile} data-testid="button-edit-profile"><UserRound size={15}/></button>}<button className="quiet-button" onClick={()=>signOut({redirectUrl:import.meta.env.BASE_URL})} data-testid="button-sign-out">{t.signOut}</button></div>
      </header>
      <div className="content">
        {feedback&&<div className="workspace-feedback" role="status" data-testid="workspace-feedback"><span>{feedback}</span><button onClick={()=>setFeedback('')} aria-label="Dismiss">×</button></div>}
        {!workspace.profile&&view!=='profile'&&<div className="callout section-gap"><button className="quiet-button" onClick={openProfile}>{t.startProfile} <ArrowRight size={14}/></button></div>}
        {view==='overview'&&<><div className="page-head"><div><div className="eyebrow">{t.nextChapter}</div><h1>{t.greeting}</h1><p className="page-subtitle">{t.sub}</p></div><button className="outline-button" onClick={refreshSignals} data-testid="button-refresh-signals"><RefreshCw size={14}/>{t.refresh}</button></div>
          <div className="grid overview-grid">
            <div><section className="hero-panel"><div className="section-kicker">{t.heroLabel}</div><h2>{t.heroTitle}</h2><p>{t.heroBody}</p><div className="hero-meta"><span className="pill"><Sparkles size={12}/> {t.profileLed}</span><span className="pill"><ShieldCheck size={12}/> {t.noHiring}</span></div></section>
              <div className="stat-row"><div className="stat-card"><div className="stat-value">{profile.skills.length}</div><div className="stat-label">{t.skillsInProfile}</div></div><div className="stat-card"><div className="stat-value">{matchingRoles.filter(r=>r.score!==null).length}</div><div className="stat-label">{t.rolesScored}</div></div><div className="stat-card"><div className="stat-value">{Object.values(completion).filter(Boolean).length}</div><div className="stat-label">{t.stepsCompleted}</div></div></div>
                <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">{t.matches}</div><h2>{t.adjacent}</h2><p className="page-subtitle">{t.rankedAgainst}</p></div><button className="quiet-button" onClick={()=>setView('signals')} data-testid="button-view-signals">{t.evidence} <ChevronRight size={14}/></button></div>
                  <div className="scenario-switch" aria-label={t.planningLens}><span>{t.planningLens}</span><button className={disruption==='moderate'?'selected':''} onClick={()=>setDisruption('moderate')} data-testid="button-scenario-moderate">{t.moderate}</button><button className={disruption==='fast'?'selected':''} onClick={()=>setDisruption('fast')} data-testid="button-scenario-fast">{t.faster}</button></div>
                  {signalState||roleCards()}</section>
                <Futures profile={profile}/>
            </div>
            <div><section className="signal-card"><div className="panel-head"><div><div className="section-kicker" style={{color:'#64748B'}}>{t.live}</div><h2 style={{marginTop:7}}>{t.remoteInView}</h2></div><Activity size={19} color="#4F46E5"/></div>{isLoading?<><div className="loading-skeleton" style={{width:'42%',height:38,backgroundColor:'#ECFEFF'}}/><div className="loading-skeleton" style={{width:'80%',marginTop:10,backgroundColor:'#ECFEFF'}}/></>:isError||!data?.signals?.length?<div style={{fontSize:12,color:'#64748B',lineHeight:1.6}}>{t.noLiveSnapshot}</div>:<><div className="signal-big">{data.postingCount.toLocaleString()}</div><div className="signal-caption">{t.publicPostings} <time className="data-num" data-font="mono" dateTime={data.fetchedAt}>{freshness}</time></div><div className="signal-lines">{[...signals].sort((a,b)=>b.count-a.count).slice(0,5).map(signal=><div className="signal-line" key={signal.skill}><span style={{textTransform:'capitalize'}}>{signal.skill}</span><div className="signal-track"><span style={{width:`${signal.count/signalMax*100}%`}}/></div><strong>{signal.count}</strong></div>)}</div></>}
              <div className="source-foot"><a href="https://himalayas.app" target="_blank" rel="noreferrer">Himalayas</a> {t.sourceAttribution}</div></section>
              <LearningCard profile={profile} completedKeys={workspace.completedKeys} assignedKeys={assignedKeys} chosenDir={chosenDir} curated={curatedSteps} onContinue={()=>setView('pathway')} onCompany={()=>setView('org')}/>
              <section className="panel section-gap"><div className="eyebrow">{t.profileBrief}</div><h2 style={{fontSize:20}}>{profile.name}</h2><p style={{fontSize:11,color:'#64748B',marginBottom:12}}>{profile.currentRole} · {profile.experience}</p><div className="skill-chips">{profile.skills.map(s=><span className="skill-chip" key={s}>{s}</span>)}</div><button className="quiet-button" onClick={openProfile} style={{paddingLeft:0,marginTop:10}} data-testid="button-edit-profile-card">{t.editSkills} <ArrowRight size={13}/></button></section>
            </div>
          </div>
           <div className="callout section-gap"><strong>{t.roleFitTitle}</strong> {t.roleFitText}</div>
        </>}

        {view==='signals'&&<MarketSignals/>}

        {view==='profile'&&<><div className="page-head"><div><div className="eyebrow">{t.profileEyebrow}</div><h1>{t.profileHeading}</h1><p className="page-subtitle">{t.profileIntro}</p></div><span className="pill"><ShieldCheck size={13}/> {t.localStorage}</span></div>
          <div className="grid two-col"><section className="panel"><div className="panel-head"><div><div className="eyebrow">{t.aboutNextStep}</div><h2>{profile.name||t.profileLabel}</h2></div><UserRound color="#4F46E5"/></div><div className="privacy-notice" role="note"><ShieldCheck size={17}/><span>{t.dataNotice}</span></div><fieldset className="form-grid profile-fields" disabled={profileMutation.isPending||deleteMutation.isPending}>
            <div className="field"><label htmlFor="profile-name">{t.name}</label><input id="profile-name" maxLength={100} required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} data-testid="input-profile-name"/></div>
            <div className="field"><label htmlFor="profile-role">{t.currentRole}</label><input id="profile-role" maxLength={150} value={draft.currentRole} onChange={e=>setDraft({...draft,currentRole:e.target.value})} data-testid="input-current-role"/></div>
            <div className="field"><label htmlFor="profile-experience">{t.experience}</label><input id="profile-experience" maxLength={100} value={draft.experience} onChange={e=>setDraft({...draft,experience:e.target.value})} data-testid="input-experience"/></div>
            <div className="field full">
              <label id="profile-skills-label">{t.skillsToUse}</label><span className="field-hint">{t.commaSkills}</span>
              <div className="choice-grid" id="profile-skills" role="group" aria-labelledby="profile-skills-label" data-testid="input-profile-skills">
                {availableSkills.map(option=>{const selected=draft.skills.some(value=>value.toLocaleLowerCase()===option.toLocaleLowerCase());return <button type="button" key={option} className={`choice-option ${selected?'selected':''}`} aria-pressed={selected} onClick={()=>toggleProfileChoice('skills',option)} data-testid={`choice-skill-${option.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}><span className="choice-check" aria-hidden="true">{selected?'✓':''}</span>{choiceLabel(language,option)}</button>;})}
              </div>
              <div className="other-input-row"><label htmlFor="profile-skill-other">{t.otherSkill}</label><div className="other-input-control"><input id="profile-skill-other" value={customSkill} placeholder={t.otherPlaceholder} onChange={e=>setCustomSkill(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustomChoice('skills',customSkill,()=>setCustomSkill(''));}}} data-testid="input-profile-skill-other"/><button type="button" className="outline-button" disabled={!customSkill.trim()} onClick={()=>addCustomChoice('skills',customSkill,()=>setCustomSkill(''))} data-testid="button-add-profile-skill">{t.addOption}</button></div></div>
              <span className="field-hint">{draft.skills.length} {t.selectedOptions}</span>
            </div>
            <div className="field full">
              <label id="profile-interests-label">{t.interestsToExplore}</label><span className="field-hint">{t.interestHint}</span>
              <div className="choice-grid" id="profile-interests" role="group" aria-labelledby="profile-interests-label" data-testid="input-profile-interests">
                {availableInterests.map(option=>{const selected=draft.interests.some(value=>value.toLocaleLowerCase()===option.toLocaleLowerCase());return <button type="button" key={option} className={`choice-option ${selected?'selected':''}`} aria-pressed={selected} onClick={()=>toggleProfileChoice('interests',option)} data-testid={`choice-interest-${option.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}><span className="choice-check" aria-hidden="true">{selected?'✓':''}</span>{choiceLabel(language,option)}</button>;})}
              </div>
              <div className="other-input-row"><label htmlFor="profile-interest-other">{t.otherInterest}</label><div className="other-input-control"><input id="profile-interest-other" value={customInterest} placeholder={t.otherPlaceholder} onChange={e=>setCustomInterest(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustomChoice('interests',customInterest,()=>setCustomInterest(''));}}} data-testid="input-profile-interest-other"/><button type="button" className="outline-button" disabled={!customInterest.trim()} onClick={()=>addCustomChoice('interests',customInterest,()=>setCustomInterest(''))} data-testid="button-add-profile-interest">{t.addOption}</button></div></div>
              <span className="field-hint">{draft.interests.length} {t.selectedOptions}</span>
            </div>
          </fieldset><div className="form-actions"><span className="field-hint">{t.localEdits}</span><button className="primary-button" disabled={profileMutation.isPending||deleteMutation.isPending} onClick={saveProfile} data-testid="button-save-profile"><Check size={14}/> {profileMutation.isPending?t.saving:t.saveProfile}</button></div></section>
          <aside><section className="callout"><strong>{t.fairness}</strong><br/>{t.fairnessText}</section><section className="panel section-gap"><div className="eyebrow">{t.skillsTravel}</div><h2 style={{fontSize:19}}>{t.strengthStart}</h2><p className="team-note">{t.transferableText}</p><button className="quiet-button" style={{paddingLeft:0}} onClick={()=>setView('overview')} data-testid="button-see-matches"><Target size={14}/> {t.exploreMatches}</button></section><section className="source-box section-gap"><b>{t.privacyTitle}</b><p>{t.accountStorage}</p><p>{t.dataControlNote}</p><div className="data-actions"><button className="outline-button" onClick={exportData} data-testid="button-export-data">{t.exportData}</button><button className="outline-button danger-button" disabled={deleteMutation.isPending} onClick={eraseData} data-testid="button-erase-data">{t.eraseData}</button></div></section></aside></div></>}

        {view==='pathway'&&<Pathway profile={profile} completedKeys={workspace.completedKeys} assignedKeys={assignedKeys} selectedId={chosenDir} onSelect={selectDir} curated={curatedSteps} onToggle={toggleStep} onDiscover={()=>setView('discover')}/>}
        {false&&view==='pathway'&&<><div className="page-head"><div><div className="eyebrow">{t.pathway}</div><h1>{t.pathwayTitle}</h1><p className="page-subtitle">{t.pathwayIntro}</p></div><button className="outline-button" onClick={()=>setView('overview')} data-testid="button-back-to-matches"><Compass size={14}/> {t.roleMatches}</button></div>
          <div className="grid two-col"><section><div className="panel" style={{marginBottom:14}}><div className="panel-head"><div><div className="eyebrow">{t.chooseDirection}</div><h2>{selectedRole?roleTitle(selectedRole.id,selectedRole.title):t.chooseRole}</h2></div><GraduationCap color="#4F46E5"/></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{matchingRoles.map(r=><button key={r.id} disabled={goalMutation.isPending} className={selectedRole?.id===r.id?'primary-button':'outline-button'} onClick={()=>chooseRole(r.id)} data-testid={`button-select-path-${r.id}`}>{roleTitle(r.id,r.title)}</button>)}</div><p className="notice">{t.pathwayNotice}</p>{!steps.length&&<div className="callout">{t.allCoreSkills}</div>}</div>
              {selectedRole&&<div className="panel"><div className="panel-head"><div><div className="eyebrow">{t.learningSteps}</div><h2>{t.buildToward} {roleTitle(selectedRole.id,selectedRole.title)}</h2></div><span className="pill"><BookOpen size={12}/> {steps.reduce((s,x)=>s+x.estimatedHours,0)} {t.estimatedHours}</span></div><div className="learning-list">{steps.map((step,index)=><div className={`learning-step ${step.completed?'done':''}`} key={step.title} data-testid={`step-${selectedRole.id}-${index}`}><div className="step-num">{step.completed?<Check size={15}/>:String(index+1).padStart(2,'0')}</div><div><h3>{step.title}</h3><p>{step.provider} · {t.aboutHours} {step.estimatedHours} {t.hourUnit} · {step.costLabel==='Free learning resource'?t.freeResource:t.pricingVaries}</p></div><div className="step-actions"><a className="step-link" href={step.url} target="_blank" rel="noreferrer" data-testid={`link-provider-${index}`}>{t.openProvider} <ArrowRight size={12}/></a><button disabled={progressMutation.isPending||!workspace.profile} className={`check-button ${step.completed?'checked':''}`} aria-label={step.completed?t.markIncomplete:t.markComplete} title={step.completed?t.markIncomplete:t.markComplete} onClick={()=>toggleStep(`${selectedRole.id}:${step.title}`)} data-testid={`button-complete-${index}`}>{step.completed?<Check size={14}/>:<CheckCircle2 size={14}/>}</button></div></div>)}</div><div className="notice">{t.stepCompletion}</div></div>}</section>
            <aside><div className="progress-summary"><div className="progress-top"><span>{t.pathwayProgress}</span><strong>{totalSteps?Math.round(completedCount/totalSteps*100):0}%</strong></div><div className="progress-line"><span style={{width:`${totalSteps?completedCount/totalSteps*100:0}%`}}/></div><div style={{fontSize:10,color:'#64748B',marginTop:8}}>{completedCount} of {totalSteps} {t.stepsMarked}</div><div className="badge-row">{completedCount>=1&&<span className="badge"><Award size={12} style={{verticalAlign:'-2px',marginRight:4}}/>{t.firstStep}</span>}{completedCount>=3&&<span className="badge"><CheckCircle2 size={12} style={{verticalAlign:'-2px',marginRight:4}}/>{t.pathwayExplorer}</span>}</div></div>
              <section className="panel"><div className="eyebrow">{t.potentialContribution}</div><h2 style={{fontSize:19}}>{t.directionMatters}</h2><div className="sdg-row">{selectedRole?.sdgs.map(s=><span className="sdg-tag" data-sdg={sdgNum(s)} key={s}>{sdgLabel(s)}</span>)}</div><h3 style={{fontSize:13,margin:'16px 0 8px'}}>{t.skillSdg}</h3><div className="skill-sdg-list">{selectedRole?.skills.map(skill=><div className="skill-sdg-row" key={skill}><span>{skill}</span><span className="sdg-row">{(skillSdgMap[skill]??[]).map(goal=><span className="sdg-tag" data-sdg={sdgNum(goal)} key={goal}>{sdgLabel(goal)}</span>)}</span></div>)}</div><p className="team-note" style={{marginTop:12}}>{t.sdgDisclosure}</p></section>
              <section className="callout section-gap"><strong>{t.autoReplanning}</strong><br/>{t.replanningText}</section>
            </aside></div></>}

        {view==='discover'&&<Discover key={JSON.stringify(profile)} profile={profile} onSave={saveDiscovered} onPathway={id=>{selectDir(id);setView('pathway');}}/>}
        {view==='org'&&<Org profileSaved={!!workspace.profile} completedKeys={workspace.completedKeys} onToggle={toggleStep} adminLogin={companyMode||searchParams.get('as')==='admin'} onDiscover={()=>setView('discover')} account={account}/>}
        {view==='team'&&<TeamManager language={language} roles={roleCatalog} courses={courseLinks} stepSkills={stepSkills} skillOptions={skillOptions} labelSkill={value=>choiceLabel(language,value)} roleTitle={roleTitle}/>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label={t.mobileNav}>{navItems.map(item=><button key={item.id} className={view===item.id?'active':''} onClick={()=>item.id==='profile'&&view!=='profile'?openProfile():setView(item.id)} data-testid={`mobile-nav-${item.id}`}><item.icon/><span>{t[item.labelKey]}</span></button>)}</nav>
  </div>;
}

function WorkspacePage(){
  const search=useSearch()||window.location.search;
  if(workspaceModeFromSearch(search)==='company')return <CompanyWorkspace registrationIntent={new URLSearchParams(search).get('intent')==='register-company'}/>;
  return <PersonalWorkspacePage/>;
}

function PersonalWorkspacePage(){
  const {user}=useUser();
  const query=useGetWorkspace({query:{queryKey:getGetWorkspaceQueryKey(),enabled:!!user,retry:1,staleTime:10_000,refetchInterval:30_000}});
  if(query.isLoading||!user)return <div className="workspace-loader">Loading your workspace…</div>;
  if(query.isError&&!query.data)return <div className="workspace-loader"><h2>Unable to load your workspace</h2><p>Your saved data has not been changed.</p><button className="primary-button" onClick={()=>query.refetch()}>Try again</button></div>;
  return <>{query.isError&&<div className="workspace-feedback" role="alert">Unable to refresh your workspace. Showing the last saved snapshot; your unsaved edits are still here. <button onClick={()=>query.refetch()}>Retry</button></div>}{query.data&&<Home key={user.id} workspace={query.data}/>}</>;
}

function HomeRedirect(){
  return <><Show when="signed-in"><Redirect to="/workspace"/></Show><Show when="signed-out"><PublicLanding/></Show></>;
}
function UserPortal(){
  return <><Show when="signed-in"><WorkspacePage/></Show><Show when="signed-out"><Redirect to="/"/></Show></>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?">{()=> <AccountPage mode="sign-in"/>}</Route>
        <Route path="/sign-up/*?">{()=> <AccountPage mode="sign-up"/>}</Route>
        <Route path="/company-sign-in/*?">{()=> <AccountPage mode="sign-in" admin/>}</Route>
        <Route path="/forgot-password">{()=> <AccountPage mode="forgot"/>}</Route>
        <Route path="/company-forgot-password">{()=> <AccountPage mode="forgot" admin/>}</Route>
        <Route path="/invite/:token">{(p)=> <InvitePage token={p.token}/>}</Route>
        <Route path="/register-company/*?">{()=> <AccountPage mode="sign-up" company/>}</Route>
        <Route path="/workspace" component={UserPortal} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath=import.meta.env.BASE_URL.replace(/\/$/,'');
function stripBase(path:string){return basePath&&path.startsWith(basePath)?path.slice(basePath.length)||'/':path;}
const clerkAppearance={
  theme:shadcn,
  cssLayerName:'clerk',
  options:{
    logoPlacement:'inside' as const,logoLinkUrl:basePath||'/',
    logoImageUrl:`${window.location.origin}${basePath}/logo.svg`,
  },
  variables:{
    colorPrimary:'#4F46E5',colorForeground:'#0F1B2D',colorMutedForeground:'#64748B',
    colorDanger:'#DC2626',colorBackground:'#FFFFFF',colorInput:'#FFFFFF',colorInputForeground:'#0F1B2D',
    colorNeutral:'#64748B',fontFamily:'Inter, system-ui, sans-serif',borderRadius:'0.75rem',
  },
  elements:{
    rootBox:{width:'100%',minWidth:0,display:'flex',justifyContent:'center'},
    cardBox:{width:'440px',minWidth:0,maxWidth:'100%',background:'#FFFFFF',borderRadius:'14px',boxShadow:'0 1px 2px rgba(15,27,45,0.06), 0 12px 32px rgba(15,27,45,0.08)',overflow:'hidden'},
    formButtonPrimary:{color:'#FFFFFF',background:'#4F46E5',fontWeight:600},
    headerTitle:{color:'#0F1B2D'},headerSubtitle:{color:'#64748B'},
    socialButtonsBlockButtonText:{color:'#0F1B2D'},formFieldLabel:{color:'#0F1B2D'},
    footerActionLink:{color:'#4F46E5'},footerActionText:{color:'#64748B'},dividerText:{color:'#64748B'},
    identityPreviewEditButton:{color:'#4F46E5'},formFieldSuccessText:{color:'#4F46E5'},alertText:{color:'#DC2626'},
  },
};
function ClerkQueryClientCacheInvalidator(){
  const {addListener}=useClerk();
  const queryClient=useQueryClient();
  const prevUserIdRef=useRef<string|null|undefined>(undefined);
  useEffect(()=>{
    const unsubscribe=addListener(({user})=>{
      const userId=user?.id??null;
      if(prevUserIdRef.current!==undefined&&prevUserIdRef.current!==userId)queryClient.clear();
      prevUserIdRef.current=userId;
    });
    return unsubscribe;
  },[addListener,queryClient]);
  return null;
}
function ClerkProviderWithRoutes(){
  const [,setLocation]=useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    signInFallbackRedirectUrl={`${basePath}/workspace`}
    signUpFallbackRedirectUrl={`${basePath}/workspace`}
    localization={{signIn:{start:{title:'Welcome back to Nexora',subtitle:'Sign in to your private career workspace'}},signUp:{start:{title:'Create your Nexora account',subtitle:'Start planning with your own skills and goals'}}}}
    routerPush={to=>setLocation(stripBase(to))}
    routerReplace={to=>setLocation(stripBase(to),{replace:true})}
  ><QueryClientProvider client={queryClient}><ClerkQueryClientCacheInvalidator/><TooltipProvider><Router/><SupportChat/><Toaster/></TooltipProvider></QueryClientProvider></ClerkProvider>;
}
function App(){return <WouterRouter base={basePath}><ClerkProviderWithRoutes/></WouterRouter>;}

export default App;
