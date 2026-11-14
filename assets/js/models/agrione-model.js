/**
 * AgriOne funding-access research framework.
 *
 * IMPORTANT: every program below is FICTIONAL. Names, rules and amounts are invented
 * to demonstrate how an eligibility screener and a barrier assessment could work.
 * They are not real funding programs and must not be used for real decisions.
 *
 * The barrier dimensions are a research framework (what the interviews probe),
 * not a set of findings.
 */

export const BARRIER_DIMENSIONS = [
  { id: 'awareness', label: 'Awareness', question: 'How does the farmer usually learn about funding?', options: [
    { label: 'A dedicated advisor or extension agent', value: 0.1 },
    { label: 'Word of mouth from other farmers', value: 0.5 },
    { label: 'They rarely hear about programs', value: 0.9 },
  ] },
  { id: 'complexity', label: 'Eligibility complexity', question: 'How confident are they reading program rules?', options: [
    { label: 'Confident', value: 0.1 },
    { label: 'Somewhat — needs help with edge cases', value: 0.5 },
    { label: 'Not confident', value: 0.9 },
  ] },
  { id: 'documentation', label: 'Documentation readiness', question: 'Are farm records and registrations up to date?', options: [
    { label: 'Yes, organised and current', value: 0.1 },
    { label: 'Partly', value: 0.5 },
    { label: 'Mostly missing', value: 0.9 },
  ] },
  { id: 'time', label: 'Time and capacity', question: 'Time available for applications each month?', options: [
    { label: 'More than 10 hours', value: 0.1 },
    { label: '3–10 hours', value: 0.5 },
    { label: 'Under 3 hours', value: 0.9 },
  ] },
  { id: 'digital', label: 'Digital access', question: 'Internet and device access?', options: [
    { label: 'Reliable broadband and a computer', value: 0.1 },
    { label: 'Smartphone only', value: 0.55 },
    { label: 'Unreliable or none', value: 0.9 },
  ] },
  { id: 'cashflow', label: 'Cash-flow timing', question: 'Can they pay costs up front and wait for reimbursement?', options: [
    { label: 'Yes', value: 0.1 },
    { label: 'Only small amounts', value: 0.55 },
    { label: 'No', value: 0.9 },
  ] },
];

export const SUPPORTS = {
  awareness: 'Proactive matching alerts when a new program fits the farm profile.',
  complexity: 'Plain-language eligibility explanations with the specific rule that applies.',
  documentation: 'A document checklist generated per program, with what is already on file.',
  time: 'Pre-filled applications from a reusable farm profile.',
  digital: 'Mobile-first, low-bandwidth flows and assisted applications through partners.',
  cashflow: 'Flag reimbursement-based programs and surface advance-payment options first.',
};

export function assessBarriers(answers) {
  const scores = BARRIER_DIMENSIONS.map((d) => ({ ...d, score: answers[d.id] ?? 0.5 }));
  const overall = scores.reduce((s, d) => s + d.score, 0) / scores.length;
  const top = [...scores].sort((a, b) => b.score - a.score).filter((d) => d.score >= 0.5).slice(0, 3);
  return { scores, overall, top };
}

export const NEEDS = {
  conservation: 'Soil and water conservation',
  equipment: 'Equipment or infrastructure',
  disaster: 'Disaster or weather recovery',
  operating: 'Operating credit',
  energy: 'On-farm energy',
};

export const FARM_TYPES = { row: 'Row crops', specialty: 'Fruit and vegetables', livestock: 'Livestock', mixed: 'Mixed' };

/** Fictional programs. `reimbursement: true` means the farmer pays first and is repaid later. */
export const PROGRAMS = [
  { id: 'f1', name: 'Riverbend Soil Health Cost-Share', needs: ['conservation'], types: ['row', 'mixed', 'specialty'], maxAcres: 2000, minYears: 0, beginningOnly: false, reimbursement: true, award: 'Up to 75 % of practice cost', docs: ['Farm registration', 'Field map', 'Conservation plan'], cadence: 'Annual window' },
  { id: 'f2', name: 'New Grower Equipment Microgrant', needs: ['equipment'], types: ['specialty', 'mixed', 'livestock'], maxAcres: 200, minYears: 0, beginningOnly: true, reimbursement: false, award: 'Fixed grant, paid on approval', docs: ['Farm registration', 'Equipment quote'], cadence: 'Rolling' },
  { id: 'f3', name: 'Harvest Bridge Operating Loan', needs: ['operating'], types: ['row', 'specialty', 'livestock', 'mixed'], maxAcres: 5000, minYears: 1, beginningOnly: false, reimbursement: false, award: 'Low-interest loan', docs: ['Farm registration', 'Two years of records', 'Operating budget'], cadence: 'Rolling' },
  { id: 'f4', name: 'Stormline Recovery Fund', needs: ['disaster'], types: ['row', 'specialty', 'livestock', 'mixed'], maxAcres: 10000, minYears: 0, beginningOnly: false, reimbursement: false, award: 'Per-acre loss payment', docs: ['Farm registration', 'Loss documentation', 'Photos'], cadence: 'After declared events' },
  { id: 'f5', name: 'Sunfield On-Farm Energy Rebate', needs: ['energy', 'equipment'], types: ['row', 'livestock', 'mixed', 'specialty'], maxAcres: 3000, minYears: 2, beginningOnly: false, reimbursement: true, award: 'Up to 40 % of installed cost', docs: ['Farm registration', 'Energy audit', 'Installer quote'], cadence: 'Annual window' },
  { id: 'f6', name: 'Cover Crop Starter Payment', needs: ['conservation'], types: ['row', 'mixed'], maxAcres: 1000, minYears: 0, beginningOnly: false, reimbursement: false, award: 'Per-acre advance payment', docs: ['Farm registration', 'Field map'], cadence: 'Annual window' },
  { id: 'f7', name: 'Pasture Water Infrastructure Grant', needs: ['equipment', 'conservation'], types: ['livestock', 'mixed'], maxAcres: 2500, minYears: 1, beginningOnly: false, reimbursement: true, award: 'Up to 60 % of project cost', docs: ['Farm registration', 'Grazing plan', 'Contractor quote'], cadence: 'Annual window' },
  { id: 'f8', name: 'Market Garden Expansion Loan', needs: ['equipment', 'operating'], types: ['specialty'], maxAcres: 100, minYears: 0, beginningOnly: false, reimbursement: false, award: 'Small-farm loan', docs: ['Farm registration', 'Business plan'], cadence: 'Rolling' },
];

/**
 * Screen a (fictional) farm profile against the fictional programs.
 * Returns every program with a status and the reasons for it, so nothing is hidden.
 */
export function screen(profile, barriers) {
  const docsOnFile = new Set(profile.docs || []);
  const cashBarrier = barriers?.cashflow ?? 0;
  return PROGRAMS.map((prog) => {
    const fails = [];
    const notes = [];
    if (!prog.types.includes(profile.type)) fails.push(`Not open to ${FARM_TYPES[profile.type].toLowerCase()} operations.`);
    if (profile.acres > prog.maxAcres) fails.push(`Farm size ${profile.acres} ac is above the ${prog.maxAcres} ac limit.`);
    if (profile.years < prog.minYears) fails.push(`Needs at least ${prog.minYears} year(s) of operation.`);
    if (prog.beginningOnly && profile.years > 10) fails.push('Limited to beginning farmers (10 years or fewer).');
    const needMatch = prog.needs.includes(profile.need);
    if (!needMatch) fails.push(`Funds ${prog.needs.map((n) => NEEDS[n].toLowerCase()).join(' or ')}, not ${NEEDS[profile.need].toLowerCase()}.`);
    const missing = prog.docs.filter((d) => !docsOnFile.has(d));
    if (missing.length) notes.push(`Missing: ${missing.join(', ')}.`);
    if (prog.reimbursement && cashBarrier >= 0.5) notes.push('Reimbursement-based: costs are paid up front, which conflicts with the cash-flow answer.');
    const status = fails.length ? 'ineligible' : missing.length || (prog.reimbursement && cashBarrier >= 0.5) ? 'conditional' : 'eligible';
    const fit = fails.length ? 0 : 1 - missing.length / prog.docs.length * 0.5 - (prog.reimbursement ? cashBarrier * 0.4 : 0);
    return { program: prog, status, fails, notes, missing, fit };
  }).sort((a, b) => b.fit - a.fit);
}

export const ALL_DOCS = [...new Set(PROGRAMS.flatMap((p) => p.docs))];

export const PERSONAS = [
  { id: 'a', label: 'Fictional persona A: first-year vegetable grower', profile: { type: 'specialty', acres: 12, years: 1, need: 'equipment', docs: ['Farm registration'] }, answers: { awareness: 0.5, complexity: 0.9, documentation: 0.5, time: 0.9, digital: 0.55, cashflow: 0.9 } },
  { id: 'b', label: 'Fictional persona B: established row-crop farm', profile: { type: 'row', acres: 850, years: 22, need: 'conservation', docs: ['Farm registration', 'Field map', 'Two years of records'] }, answers: { awareness: 0.1, complexity: 0.5, documentation: 0.1, time: 0.5, digital: 0.1, cashflow: 0.1 } },
  { id: 'c', label: 'Fictional persona C: cattle operation after a storm', profile: { type: 'livestock', acres: 400, years: 9, need: 'disaster', docs: ['Farm registration', 'Photos'] }, answers: { awareness: 0.9, complexity: 0.5, documentation: 0.5, time: 0.5, digital: 0.9, cashflow: 0.55 } },
];

/** Impact measurement framework: metric definitions only, no values. */
export const IMPACT_METRICS = [
  { stage: 'Reach', metric: 'Farmers who complete a profile', why: 'Shows whether the tool reaches farmers who are not already well-served.' },
  { stage: 'Discovery', metric: 'Relevant programs surfaced per farmer', why: 'Tests the awareness hypothesis.' },
  { stage: 'Readiness', metric: 'Required documents on file before applying', why: 'Tests whether checklists reduce documentation gaps.' },
  { stage: 'Effort', metric: 'Self-reported time to submit an application', why: 'Tests the time-and-capacity hypothesis.' },
  { stage: 'Outcome', metric: 'Applications submitted and approved', why: 'The end result, measured against a comparison group where possible.' },
  { stage: 'Equity', metric: 'Outcomes split by farm size and access barriers', why: 'Checks that gains are not concentrated among already-advantaged farms.' },
];
