/**
 * SITE CONTENT — edit this file to update the portfolio.
 *
 * Everything a visitor reads (apart from the interactive lab text) lives here.
 * Rules this file follows, and that edits should keep following:
 *   • Only state things that are true and verifiable.
 *   • Past professional work and new independent demonstrations are labelled separately
 *     (`kind: 'past'` vs `kind: 'demo'`).
 *   • Leave a field empty rather than guessing. Empty fields are simply not rendered.
 */

export const person = {
  name: 'Sumana Panuganti',
  fields: ['Applied AI', 'Remote sensing', 'Energy systems', 'AI safety'],
  headline: 'Engineering intelligent systems for a changing world',
  intro:
    "I'm a graduate student at Columbia University with a background in Computer Science and experience developing data-driven technologies across agriculture, geospatial intelligence, and energy systems. My research interests focus on building intelligent systems that are reliable, transparent, and useful in real-world environments.",
  links: {
    linkedin: 'https://www.linkedin.com/in/sumana-panuganti-ab1907180/',
    github: 'https://github.com/sumana16713',
    email: '', // Add a public email address here to show it in the Contact section.
    cvPdf: '', // Optional: path to a PDF, e.g. 'assets/Sumana-Panuganti-CV.pdf'. The HTML CV always works.
  },
};

export const education = [
  { school: 'Columbia University', degree: 'M.S. Technology Management', dates: 'Expected December 2027', detail: 'Graduate studies in technology, AI, strategy and organisational decision-making' },
  { school: 'Albany State University', degree: 'B.S. Computer Science', dates: 'Completed', detail: 'GPA 3.7 / 4.0' },
];

/** Research agenda shown near the top of the home page. */
export const agenda = {
  statement:
    'The systems I care about make decisions, or shape them, in places where mistakes are costly: a crop plan, a grid dispatch, a funding application, an automated safety action. My question in each is the same: what does the system know, how sure is it, and who is accountable when it is wrong?',
  questions: [
    { q: 'When should an automated system act on its own in critical infrastructure, and when must a person decide?', lab: 'safety' },
    { q: 'How can satellite-derived indicators give farmers early, honest warnings about crop stress, including saying when the data is too poor to tell?', lab: 'skyacres' },
    { q: 'How much storage does a solar-heavy site need before reliability stops depending on the grid?', lab: 'energy' },
    { q: 'Which barriers keep farmers from funding they are eligible for, and which can software actually remove?', lab: 'agrione' },
  ],
};

export const labs = [
  { id: 'safety', title: 'Human oversight in critical infrastructure', short: 'AI safety sandbox', domain: 'AI safety', flagship: true,
    summary: 'A transparent decision-gating model for automated actions in energy systems. Change confidence, uncertainty, harm and oversight rules, and watch who decides.' },
  { id: 'skyacres', title: 'SkyAcres: geospatial crop intelligence', short: 'SkyAcres remote sensing lab', domain: 'Remote sensing',
    summary: 'A synthetic satellite scene with field parcels, NDVI time series, cloud masking and stress alerts that respond to rainfall and temperature.' },
  { id: 'energy', title: 'Solar, storage and grid reliability', short: 'Energy systems lab', domain: 'Energy',
    summary: 'An hourly dispatch model of a solar-plus-battery site. Size the system, add a grid outage, and compare scenarios.' },
  { id: 'agrione', title: 'AgriOne: farmer funding access', short: 'AgriOne funding lab', domain: 'Agriculture',
    summary: 'A barrier assessment and eligibility screener built on the research framework behind AgriOne, using clearly fictional programs.' },
];

/**
 * Projects. kind: 'past' = work I did in a role or program; 'demo' = new, independently built demonstration.
 * caseStudy sections render in order; omit a section to hide it.
 */
export const projects = [
  {
    id: 'skyacres', kind: 'past', title: 'SkyAcres / SkyHarvest', org: 'Albany State University', dates: '2024–2026',
    domains: ['Remote sensing', 'Agriculture', 'Data engineering'],
    summary: 'Satellite-data pipelines, agricultural analytics, software integrations and dashboards for a university agricultural technology program.',
    lab: 'skyacres',
    caseStudy: [
      { h: 'Research problem', p: 'Farm decisions depend on knowing how crops are doing across whole fields, often across many fields at once. Satellite imagery can show this, but only after raw scenes are cleaned, turned into indicators, summarised per field and presented in a way people can act on.' },
      { h: 'My responsibilities', list: ['Developed satellite-data pipelines.', 'Applied Python and geospatial-data processing for agricultural research initiatives.', 'Built agricultural analytics on top of processed imagery.', 'Worked on software integrations between system components.', 'Built dashboards and contributed to technical reporting.'] },
      { h: 'Methods and architecture', p: 'The general workflow for this kind of system is: acquire imagery → mask clouds and bad pixels → compute vegetation indices such as NDVI → aggregate per field (zonal statistics) → compare against a baseline → surface anomalies in a dashboard. The SkyAcres lab on this site rebuilds that workflow from scratch with synthetic data so it can be explored openly.' },
      { h: 'Research relevance', p: 'The same pipeline questions — data quality, uncertainty, and how indicators turn into decisions — run through all of my work, including the AI safety sandbox.' },
      { h: 'About the demonstration', note: 'The interactive SkyAcres lab is a new, independent reconstruction. It is not the original project code, and its data is synthetic.' },
      { h: 'Limitations', p: 'Original project code, data and quantitative results are not reproduced here. I am happy to discuss the project in more detail directly.' },
    ],
  },
  {
    id: 'nasa', kind: 'past', title: 'Crater detection', org: 'NASA MINDS', dates: '2021–2022',
    domains: ['Computer vision', 'AI'],
    summary: 'A student research project on detecting impact craters in planetary imagery with computer vision.',
    caseStudy: [
      { h: 'Computer vision problem', p: 'Craters are counted to estimate the age of planetary surfaces and to assess landing hazards. Counting by hand does not scale. Automated detection is hard because craters vary by orders of magnitude in size, overlap and erode, and look different depending on the sun angle when an image was taken.' },
      { h: 'Why it matters for my research', p: 'The project was an early lesson in a theme I keep returning to: a detector is only useful if you know where it fails — at small scales, under low illumination, or on terrain unlike its training data.' },
      { h: 'Results', note: 'The original code and experimental results are not reproduced here. I can discuss the methods and outcomes directly.' },
      { h: 'Future improvements', list: ['Evaluate detection performance separately by crater size and illumination angle.', 'Report calibrated confidence scores rather than raw detections.', 'Test transfer between imagery from different instruments.'] },
    ],
  },
  {
    id: 'agrione', kind: 'past', title: 'AgriOne', org: 'Venture in development', dates: '2026–present',
    domains: ['Agriculture', 'AI', 'User research'],
    summary: 'An AI-assisted funding navigation platform for farmers, grounded in about 30 farmer discovery interviews.',
    lab: 'agrione',
    caseStudy: [
      { h: 'The challenge', p: 'Funding programs for farmers exist, but finding the right one, confirming eligibility, gathering documents and applying takes knowledge and time that many farmers do not have.' },
      { h: 'Primary research', p: 'I have conducted approximately 30 discovery interviews with farmers to understand how they find, assess and apply for funding.' },
      { h: 'Research framework', p: 'Interviews are organised around six barrier dimensions: awareness, eligibility complexity, documentation readiness, time and capacity, digital access, and cash-flow timing. The AgriOne lab turns this framework into an interactive assessment.' },
      { h: 'Product hypothesis', p: 'If a farm profile is captured once and reused, software can surface relevant programs, explain eligibility in plain language and track missing documents, reducing the effort needed to apply. Whether it does is an empirical question the impact framework is designed to answer.' },
      { h: 'Findings', note: 'Coded interview findings are being synthesised and are not published here yet. Nothing in the AgriOne lab should be read as an interview result.' },
    ],
  },
  {
    id: 'energy', kind: 'past', title: 'Clean energy infrastructure', org: 'Professional work', dates: '',
    domains: ['Energy', 'Infrastructure'],
    summary: 'Clean energy infrastructure planning involving renewable energy, battery storage and technology systems.',
    lab: 'energy',
    caseStudy: [
      { h: 'Scope', p: 'I have worked on clean energy infrastructure planning involving renewable energy, battery storage and the technology systems that connect them.' },
      { h: 'Technical considerations', list: ['Matching variable renewable output to demand that peaks at different times.', 'Sizing storage by both energy (MWh) and power (MW), which constrain different things.', 'Planning for grid constraints and outages, not just average conditions.'] },
      { h: 'Research questions', list: ['How should storage be sized when the goal is reliability during outages rather than cost?', 'Which simple models are good enough for early planning, and where do they break?', 'Where can automated dispatch be trusted, and where should operators stay in the loop?'] },
      { h: 'About the demonstration', note: 'The Energy lab is an independent teaching model built for this site. It is not an operational grid model or a reproduction of project work.' },
    ],
  },
  { id: 'demo-safety', kind: 'demo', title: 'Human oversight sandbox', org: 'Independent demonstration', dates: '2026', domains: ['AI safety', 'Energy'], summary: 'Rule-based oversight gating, audit logs, sensitivity analysis and a Monte Carlo study of oversight thresholds.', lab: 'safety' },
  { id: 'demo-skyacres', kind: 'demo', title: 'SkyAcres remote sensing lab', org: 'Independent demonstration', dates: '2026', domains: ['Remote sensing', 'Agriculture'], summary: 'Synthetic satellite scene, NDVI phenology model, cloud masking and per-field stress alerts.', lab: 'skyacres' },
  { id: 'demo-energy', kind: 'demo', title: 'Solar and storage dispatch lab', org: 'Independent demonstration', dates: '2026', domains: ['Energy'], summary: 'Hourly energy balance with battery limits, grid caps and outage scenarios.', lab: 'energy' },
  { id: 'demo-agrione', kind: 'demo', title: 'Funding access screener', org: 'Independent demonstration', dates: '2026', domains: ['Agriculture', 'User research'], summary: 'Barrier assessment and eligibility screening against clearly fictional programs.', lab: 'agrione' },
];

/** Experience timeline. `skills` power the skill filter. Keep bullets to things you can confirm. */
export const experience = [
  { role: 'Scientific Officer', org: 'Albany State University', start: '2024-10', end: '2026-06', dates: 'Oct 2024 – Jun 2026',
    bullets: ['Contributed to agricultural software and satellite-data applications, dashboards, integration and technical reporting.'],
    skills: ['Research coordination', 'Data analytics', 'Satellite data', 'Software development'] },
  { role: 'Research Assistant', org: 'Albany State University', start: '2024-06', end: '2024-10', dates: 'Jun 2024 – Oct 2024',
    bullets: ['Worked on SkyAcres / SkyHarvest: satellite-data pipelines, agricultural analytics, software integrations and dashboards.', 'Applied Python and geospatial-data processing for agricultural research initiatives.'],
    skills: ['Python', 'Satellite data', 'ETL pipelines', 'Data analytics', 'Software development'] },
  { role: 'Information and Digital Solutions Intern', org: 'Eli Lilly and Company', start: '2023-05', end: '2023-08', dates: 'May 2023 – Aug 2023',
    bullets: ['Supported ETL workflows, data integration and operational technology projects.'],
    skills: ['ETL pipelines', 'Software development', 'Data analytics'] },
  { role: 'Research project: crater detection', org: 'NASA MINDS', start: '2021-01', end: '2022-12', dates: '2021 – 2022',
    bullets: ['Participated in a computational crater-detection project applying computer vision to planetary imagery.'],
    skills: ['Python', 'AI applications', 'Computer vision'] },
];

export const interests = [
  { title: 'Oversight and accountability for automated decisions', body: 'Escalation design, human-in-the-loop latency, audit trails, and who is responsible when an automated action causes harm.' },
  { title: 'Reliability under uncertainty', body: 'Calibration, out-of-distribution detection and honest abstention: systems that can say "I don\'t know".' },
  { title: 'Remote sensing for agriculture', body: 'Turning satellite observations into field-level indicators that farmers can trust, with data quality made visible.' },
  { title: 'Energy systems and storage', body: 'Simple, inspectable models for renewable integration, storage sizing and resilience planning.' },
  { title: 'Technology access and adoption', body: 'Why useful tools and public programs fail to reach the people they are designed for, and what design can change.' },
];

export const skills = ['Python', 'Data analytics', 'Satellite data', 'ETL pipelines', 'Software development', 'AI applications', 'Computer vision', 'Research coordination'];
