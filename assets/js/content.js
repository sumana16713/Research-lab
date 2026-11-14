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
  { school: 'Albany State University', degree: 'B.S. Computer Science and Business', dates: 'August 2020 – May 2024', detail: 'GPA 3.7 / 4.0. NCAA Division II women’s tennis, full scholarship' },
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
    id: 'skyacres', kind: 'past', title: 'Sky Acres', org: 'Sky Acres (USG), Albany, GA', dates: '2024–2026',
    domains: ['Remote sensing', 'Agriculture', 'Data engineering'],
    summary: 'Python backend features for an agricultural land and finance platform that integrates satellite-derived data, AI-assisted land analysis, APIs, asset valuation and digital land registration.',
    lab: 'skyacres',
    caseStudy: [
      { h: 'The problem', p: 'Agricultural land is hard to value and finance when information about it is scattered and slow to verify. Sky Acres brings satellite-derived data, AI-assisted land analysis and digital registration into one platform for land registration, valuation and transactions.' },
      { h: 'My role', p: 'Software Engineer, Data & Platform, May 2024 – May 2026.' },
      { h: 'What I built', list: [
        'Python-based backend features integrating satellite-derived data, AI-assisted land analysis, APIs, asset valuation and digital land-registration workflows.',
        'Python services, API integrations, database queries and user-facing features supporting land registration and valuation. Platform adoption increased by 25%.',
        'SQL analysis of application and user data, and workflow improvements across registration, valuation and transaction features. Weekly active usage increased by 18%.',
        'A quarterly roadmap prioritised from 30+ discovery sessions using impact scoring (RICE / MoSCoW), cutting cycle time by 25%.',
      ] },
      { h: 'Research relevance', p: 'Turning satellite observations into decisions about land raises the questions that run through all my work: how good is the data, how uncertain is the derived indicator, and who relies on it. The SkyAcres lab on this site explores the remote-sensing side of that pipeline.' },
      { h: 'About the demonstration', note: 'The interactive SkyAcres lab is a new, independent demonstration of a remote-sensing workflow with synthetic data. It is not Sky Acres platform code or data.' },
    ],
  },
  {
    id: 'nasa', kind: 'past', title: 'Crater detection for Mars rovers', org: 'NASA MINDS, Albany State University', dates: '2021–2024',
    domains: ['Computer vision', 'AI'],
    summary: 'Led a five-person team building an object-detection pipeline in Python, TensorFlow and OpenCV to identify surface craters in unstructured terrain.',
    caseStudy: [
      { h: 'Computer vision problem', p: 'A rover navigating unstructured terrain needs to recognise craters, which vary in size, overlap, erode and look different depending on the light. The project aimed to detect craters automatically from surface imagery.' },
      { h: 'My role', p: 'Student Researcher, August 2021 – May 2024, advised by Dr Robert Owor. I led a team of five engineers.' },
      { h: 'Methods and my contributions', list: [
        'Designed and implemented an object-detection pipeline using Python, TensorFlow and OpenCV.',
        'Built and maintained training datasets, optimised convolutional neural network architectures, and applied data augmentation to improve robustness and generalisation.',
        'Ran performance analysis and hyperparameter tuning, reducing inference time by 15% and improving reliability across terrain conditions.',
        'Coordinated sprint planning and milestones with Agile methods, incorporating stakeholder feedback into each iteration.',
      ] },
      { h: 'Why it matters for my research', p: 'A detector is only useful if you know where it fails: at small scales, in low light, or on terrain unlike its training data. That lesson shapes how I approach model reliability and evaluation.' },
      { h: 'Future improvements', list: ['Report detection performance separately by crater size and illumination angle.', 'Attach calibrated confidence scores to each detection.', 'Test how well the model transfers between imagery from different instruments.'] },
      { h: 'About this page', note: 'Original project code and data are not reproduced here.' },
    ],
  },
  {
    id: 'space-ag', kind: 'past', title: 'Space agriculture', org: 'NASA Better Together, Albany State University', dates: '2023–2024',
    domains: ['Agriculture', 'Experimental research'],
    summary: 'Led a five-person team developing plant-growth prototypes for simulated extraterrestrial conditions, with automated monitoring of growth conditions.',
    caseStudy: [
      { h: 'Research problem', p: 'Growing food in extraterrestrial conditions means keeping plants alive with very limited water and nutrients. The project tested growth prototypes under simulated conditions.' },
      { h: 'My role', p: 'Student Researcher, August 2023 – May 2024, advised by Dr Robert Owor. I led a team of five.' },
      { h: 'What we did', list: [
        'Developed three growth prototypes; plant survival improved by 25% under simulated extraterrestrial conditions.',
        'Ran 50+ growth trials, increasing average yield by 20% and reducing water and nutrient use by 15% per cycle.',
        'Designed automated monitoring of growth conditions, cutting manual observation time by 40% and keeping data collection consistent.',
        'Presented findings to faculty and industry partners.',
      ] },
      { h: 'Presentation', p: 'Poster: “Pioneering Space Agriculture: Cultivating Plants with Innovative Techniques”, NASA STEM Better Together Conference, San Jose, CA, November 2023.' },
    ],
  },
  {
    id: 'providencia', kind: 'past', title: 'Bacterial stress responses from RNA sequencing', org: 'Providencia Project, Albany State University', dates: '2021',
    domains: ['Bioinformatics', 'Data analysis'],
    summary: 'Python analysis of RNA sequencing data to study how bacteria respond to salicylate compounds.',
    caseStudy: [
      { h: 'Research problem', p: 'How do bacteria change their gene expression when exposed to salicylate compounds, and at what concentrations do those compounds inhibit or kill them?' },
      { h: 'My role', p: 'Researcher, September – December 2021, advised by Dr Ojo Olabisi, working with the Biology Department.' },
      { h: 'What I did', list: [
        'Applied Python to analyse RNA sequencing data, supporting determination of minimum inhibitory concentration (MIC) and minimum bactericidal concentration (MBC).',
        'Designed computational workflows to track RNA expression changes after exposure to salicylate compounds.',
        'Worked with biologists to connect RNA-level results to experimentally validated conclusions about bacterial behaviour.',
      ] },
    ],
  },
  {
    id: 'agrione', kind: 'past', title: 'AgriOne', org: 'Venture in development', dates: '2026–present',
    domains: ['Agriculture', 'AI', 'User research'],
    summary: 'An AI-assisted funding navigation platform for farmers, grounded in about 30 farmer discovery interviews.',
    lab: 'agrione',
    caseStudy: [
      { h: 'The challenge', p: 'Funding programs for farmers exist, but finding the right one, confirming eligibility, gathering documents and applying takes knowledge and time that many farmers do not have.' },
      { h: 'Primary research', p: 'I have conducted approximately 30 discovery interviews with farmers to understand how they find, assess and apply for funding. My training includes the University of Michigan Summer Institute in Survey Research Techniques (2023).' },
      { h: 'Research framework', p: 'Interviews are organised around six barrier dimensions: awareness, eligibility complexity, documentation readiness, time and capacity, digital access, and cash-flow timing. The AgriOne lab turns this framework into an interactive assessment.' },
      { h: 'Product hypothesis', p: 'If a farm profile is captured once and reused, software can surface relevant programs, explain eligibility in plain language and track missing documents, reducing the effort needed to apply. Whether it does is an empirical question the impact framework is designed to answer.' },
      { h: 'Findings', note: 'Coded interview findings are being synthesised and are not published here yet. Nothing in the AgriOne lab should be read as an interview result.' },
    ],
  },
  {
    id: 'energy', kind: 'past', title: 'Energy and infrastructure data workflows', org: 'GSCE (Green Structures & Clean Energy)', dates: '2026',
    domains: ['Energy', 'Infrastructure', 'Data engineering'],
    summary: 'Python and SQL data workflows across energy, site-selection and infrastructure datasets for AI-driven feasibility and deployment analysis.',
    lab: 'energy',
    caseStudy: [
      { h: 'My role', p: 'Technical Product Analyst, GSCE (remote), June – August 2026.' },
      { h: 'What I did', list: [
        'Built Python and SQL data workflows across energy, site-selection and infrastructure datasets to support AI-driven technical feasibility and deployment analysis.',
        'Defined model inputs, output variables, data pipelines and integration requirements for AI-based energy optimisation and data-centre infrastructure use cases.',
        'Translated operational requirements from engineering and business stakeholders into APIs, data schemas, system requirements and implementation plans.',
      ] },
      { h: 'Technical considerations', list: ['Matching variable renewable output to demand that peaks at different times.', 'Sizing storage by both energy (MWh) and power (MW), which constrain different things.', 'Planning for grid constraints and outages, not just average conditions.'] },
      { h: 'Research questions', list: ['How should storage be sized when the goal is reliability during outages rather than cost?', 'Which simple models are good enough for early planning, and where do they break?', 'Where can automated dispatch be trusted, and where should operators stay in the loop?'] },
      { h: 'About the demonstration', note: 'The Energy lab is an independent teaching model built for this site. It is not an operational grid model or a reproduction of GSCE work.' },
    ],
  },
  { id: 'demo-safety', kind: 'demo', title: 'Human oversight sandbox', org: 'Independent demonstration', dates: '2026', domains: ['AI safety', 'Energy'], summary: 'Rule-based oversight gating, audit logs, sensitivity analysis and a Monte Carlo study of oversight thresholds.', lab: 'safety' },
  { id: 'demo-skyacres', kind: 'demo', title: 'SkyAcres remote sensing lab', org: 'Independent demonstration', dates: '2026', domains: ['Remote sensing', 'Agriculture'], summary: 'Synthetic satellite scene, NDVI phenology model, cloud masking and per-field stress alerts.', lab: 'skyacres' },
  { id: 'demo-energy', kind: 'demo', title: 'Solar and storage dispatch lab', org: 'Independent demonstration', dates: '2026', domains: ['Energy'], summary: 'Hourly energy balance with battery limits, grid caps and outage scenarios.', lab: 'energy' },
  { id: 'demo-agrione', kind: 'demo', title: 'Funding access screener', org: 'Independent demonstration', dates: '2026', domains: ['Agriculture', 'User research'], summary: 'Barrier assessment and eligibility screening against clearly fictional programs.', lab: 'agrione' },
];

/**
 * Experience timeline, newest first. `group` separates research from industry roles.
 * `skills` power the skill filter. Source: my resume and CV.
 */
export const experience = [
  { role: 'Technical Product Analyst', org: 'GSCE (Green Structures & Clean Energy), Remote', group: 'Industry', dates: 'Jun 2026 – Aug 2026',
    bullets: ['Built Python and SQL data workflows across energy, site-selection and infrastructure datasets to support AI-driven feasibility and deployment analysis.', 'Defined model inputs, outputs, data pipelines and integration requirements for AI-based energy optimisation and data-centre infrastructure use cases.'],
    skills: ['Python', 'SQL', 'Data pipelines', 'AI applications'] },
  { role: 'Software Engineer, Data & Platform', org: 'Sky Acres (USG), Albany, GA', group: 'Industry', dates: 'May 2024 – May 2026',
    bullets: ['Built Python backend features for an agricultural land and finance platform integrating satellite-derived data, AI-assisted land analysis, APIs, asset valuation and digital land registration.', 'Developed services, API integrations and database queries for registration and valuation workflows; platform adoption rose 25% and weekly active usage 18%.'],
    skills: ['Python', 'SQL', 'Satellite data', 'APIs', 'Software development'] },
  { role: 'Student Researcher, space agriculture', org: 'NASA Better Together, Albany State University', group: 'Research', dates: 'Aug 2023 – May 2024',
    bullets: ['Led a five-person team developing three plant-growth prototypes for simulated extraterrestrial conditions across 50+ growth trials.', 'Designed automated monitoring of growth conditions. Advisor: Dr Robert Owor.'],
    skills: ['Experimental design', 'Data analysis', 'Research leadership'] },
  { role: 'IDS Analyst Intern', org: 'Eli Lilly and Company, Indianapolis, IN', group: 'Industry', dates: 'May 2023 – Aug 2023',
    bullets: ['Developed predictive analytics pipelines on AWS (S3, EC2, Lambda) to automate data ingestion and processing in a regulated environment, cutting manual processing by 70%.', 'Defined product KPIs and built SQL and Tableau dashboards to monitor usage funnels.'],
    skills: ['Python', 'SQL', 'AWS', 'Data pipelines', 'Data analysis'] },
  { role: 'Student Researcher, crater detection', org: 'NASA MINDS, Albany State University', group: 'Research', dates: 'Aug 2021 – May 2024',
    bullets: ['Led a team of five building an object-detection pipeline in Python, TensorFlow and OpenCV to identify craters for Mars rovers.', 'Curated training data, optimised CNN architectures, applied data augmentation and tuned hyperparameters, reducing inference time by 15%. Advisor: Dr Robert Owor.'],
    skills: ['Python', 'Computer vision', 'Machine learning', 'Research leadership'] },
  { role: 'Researcher, Providencia Project', org: 'Albany State University', group: 'Research', dates: 'Sep 2021 – Dec 2021',
    bullets: ['Analysed RNA sequencing data in Python to study bacterial stress responses to salicylate compounds, supporting MIC and MBC determination. Advisor: Dr Ojo Olabisi.'],
    skills: ['Python', 'Data analysis'] },
  { role: 'Product Management Intern', org: 'Grus & Grade, India', group: 'Industry', dates: 'May 2022 – Jul 2023',
    bullets: ['Prioritised features using customer-lifecycle data and 70+ user interviews; ran A/B tests on onboarding.'],
    skills: ['User research', 'Data analysis'] },
  { role: 'Co-founder, Product Lead', org: 'SquarExchange, Remote', group: 'Industry', dates: 'May 2021 – Apr 2023',
    bullets: ['Defined the MVP roadmap from 40+ user interviews and scaled the product to 1,000+ users.'],
    skills: ['User research', 'Research leadership'] },
];

/** Posters and talks. */
export const presentations = [
  { title: 'Pioneering Space Agriculture: Cultivating Plants with Innovative Techniques', venue: 'NASA STEM Better Together Conference, San Jose, CA', date: 'November 2023', kind: 'Poster' },
  { title: 'Enhancing Data Processing Efficiency with AWS Glue and Lambda', venue: 'Summer Internship Poster Session, Eli Lilly and Company, Indianapolis, IN', date: 'August 2023', kind: 'Poster' },
];

/** Selected honours. */
export const honors = [
  'Summer Institute in Survey Research Techniques Fellowship, University of Michigan (2023)',
  'NASA STEM Recipient (2023)',
  'Eli Lilly Hackathon, Best Design Award (2023)',
  'TMCF Leadership Institute (2022, 2023)',
  'NCAA Women’s Tennis full scholarship (2020–2024)',
  'Velma Fudge Grant Honors Program (2022–2024)',
  'Highest Ranking Freshman Award (2020–2021); Dean’s List (2020–2021)',
];

export const interests = [
  { title: 'Oversight and accountability for automated decisions', body: 'Escalation design, human-in-the-loop latency, audit trails, and who is responsible when an automated action causes harm.' },
  { title: 'Reliability under uncertainty', body: 'Calibration, out-of-distribution detection and honest abstention: systems that can say "I don\'t know".' },
  { title: 'Remote sensing for agriculture', body: 'Turning satellite observations into field-level indicators that farmers can trust, with data quality made visible.' },
  { title: 'Energy systems and storage', body: 'Simple, inspectable models for renewable integration, storage sizing and resilience planning.' },
  { title: 'Technology access and adoption', body: 'Why useful tools and public programs fail to reach the people they are designed for, and what design can change.' },
];

export const skills = ['Python', 'SQL', 'Machine learning', 'Computer vision', 'Satellite data', 'Data pipelines', 'AWS', 'APIs', 'Data analysis', 'User research', 'Research leadership'];

/** Full technical skills, shown on the CV. */
export const toolset = 'Python, SQL, TensorFlow, OpenCV, AWS (S3, EC2, Lambda), REST APIs, Snowflake, Oracle, Tableau, machine learning, predictive analytics, data pipelines, JIRA, Confluence';
