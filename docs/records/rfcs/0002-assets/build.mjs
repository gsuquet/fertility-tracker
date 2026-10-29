// Writes the static HTML mockups of RFC 0002 into this folder. The mockups use the demo data of
// src/domain/demoData.ts with today on 2026-10-27, the date of the e2e suite.
// Run: node docs/records/rfcs/0002-assets/build.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const LOGO = '../../../../public/icons/logo.svg';

// ---------------------------------------------------------------------------------------------
// Icons: the lucide paths that the app uses
// ---------------------------------------------------------------------------------------------
const ICONS = {
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  today:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  chart: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  analytics: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4M12 2v13"/>',
  trash:
    '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  printer:
    '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  image:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  vibrate:
    '<path d="m2 8 2 2-2 2 2 2-2 2M22 8l-2 2 2 2-2 2 2 2"/><rect width="8" height="14" x="8" y="5" rx="1"/>',
  keyboard:
    '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  dot: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
  demo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"/>',
  scale:
    '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  external:
    '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
};

const icon = (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// ---------------------------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------------------------
const DAY_MS = 86400000;
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => iso(new Date(Date.parse(`${s}T00:00:00Z`) + n * DAY_MS));
const toDate = s => new Date(`${s}T00:00:00Z`);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekday = s => WD[toDate(s).getUTCDay()];
const short = s => `${MO[toDate(s).getUTCMonth()]} ${toDate(s).getUTCDate()}`;
const long = s => `${weekday(s)}, ${short(s)}`;
const mmdd = s => s.slice(5);

const TODAY = '2026-10-27';
const CYCLE_STARTS = { 1: '2026-09-02', 2: '2026-09-30' };

/** The observation of the demo on a cycle day, as src/domain/demoData.ts builds it. */
function demoDay(cd) {
  if (cd === 1) return { main: 'H', stamp: 'red' };
  if (cd === 2) return { main: 'M', stamp: 'red' };
  if (cd === 3) return { main: 'L', stamp: 'red' };
  if (cd === 4) return { main: 'VL', stamp: 'red' };
  if (cd === 9 || cd === 10) return { main: '2CX2', stamp: 'dark_green', score: 2 };
  if (cd === 11) return { main: '6C/KX3', stamp: 'white_baby', i: true, score: 6 };
  if (cd === 12) return { main: '8KX3', stamp: 'white_baby', score: 8 };
  if (cd === 13) return { main: '10KLAD', stamp: 'white_baby', peak: true, sym: 'AP', score: 10 };
  if (cd >= 14 && cd <= 16) {
    return {
      main: '0AD',
      stamp: `light_green_baby_${cd - 13}`,
      pp: cd - 13,
      i: cd === 15,
      score: 0,
    };
  }
  return { main: '0AD', stamp: 'dark_green', i: cd === 21, score: 0 };
}

const fullCode = d => [d.main, d.sym, d.i ? 'I' : ''].filter(Boolean).join(' ');

/** The cycle day and the observation of a date, or null after today. */
function dayOf(date) {
  if (date > TODAY || date < CYCLE_STARTS[1]) return null;
  const cycle = date >= CYCLE_STARTS[2] ? 2 : 1;
  const cd = Math.round((toDate(date) - toDate(CYCLE_STARTS[cycle])) / DAY_MS) + 1;
  return { date, cycle, cd, ...demoDay(cd) };
}

const cycleDate = (cycle, cd) => addDays(CYCLE_STARTS[cycle], cd - 1);

const GUIDE = {
  red: 'Bleeding day. Possibly fertile under the CrMS rules.',
  dark_green: 'Dry day. Infertile under the CrMS rules.',
  white_baby: 'Fertile mucus. Fertile day.',
  pp: n => `Post-Peak count, day ${n} of 3. Fertile.`,
};
const guideOf = d => (d.pp ? GUIDE.pp(d.pp) : GUIDE[d.stamp]);

// ---------------------------------------------------------------------------------------------
// Stamps: the classes of the real StampBadge component
// ---------------------------------------------------------------------------------------------
const BABY =
  '<svg aria-hidden="true" class="baby-svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.2" r="4.6"/><path d="M10.4 3.1c.3-1.9 2.9-2.6 4.1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12.6c4.1 0 6.4 2.6 6.4 5.3 0 2.8-3 4.5-6.4 4.5s-6.4-1.7-6.4-4.5c0-2.7 2.3-5.3 6.4-5.3z"/></svg>';

/** A stamp. `marks` false leaves out the I, P and count marks (the calendar shows them in a row). */
function stamp(d, size = '', { marks = true, today = false } = {}) {
  const cls = ['stamp-badge', size, today ? 'today' : ''];
  if (!d) return `<span class="${cls.join(' ')} stamp-empty" aria-hidden="true"></span>`;
  const baby = d.stamp === 'white_baby' || d.stamp.startsWith('light_green');
  const inner = [
    baby
      ? `<span class="baby-icon-wrapper">${BABY}${marks && d.pp ? `<span class="post-peak-number">${d.pp}</span>` : ''}</span>`
      : '',
    marks && d.i ? '<span class="intercourse-stamp-overlay">I</span>' : '',
    marks && d.peak ? '<span class="peak-indicator-badge">P</span>' : '',
  ].join('');
  return `<span class="${cls.join(' ')} stamp-${d.stamp}" aria-hidden="true">${inner}</span>`;
}

// ---------------------------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------------------------
const PAGES = [];

function page(file, { title, caption, size, theme = 'light', long: isLong = false, html }) {
  const cls = [
    'frame',
    size,
    isLong ? 'long' : '',
    size === 'phone' && /no-nav/.test(html) ? '' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RFC 0002 mockup: ${title}</title>
<link rel="stylesheet" href="mock.css">
</head>
<body>
<p class="caption"><b>${title}.</b> ${caption}</p>
<div class="${cls}" id="frame" data-theme="${theme}">
${html}
</div>
</body>
</html>
`;
  writeFileSync(
    join(OUT, `${file}.html`),
    doc.replace(/<button(?![^>]*type=)/g, '<button type="button"')
  );
  PAGES.push({ file, title, caption, size, long: isLong });
}

// ---------------------------------------------------------------------------------------------
// Phone shell
// ---------------------------------------------------------------------------------------------
function bottomNav(current) {
  const tab = (id, label, ic) =>
    `<button class="tab"${current === id ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`;
  return `<nav class="bottombar" aria-label="Pages">${tab('today', 'Today', 'today')}${tab('chart', 'Chart', 'chart')}<span class="log"><button class="fab" aria-label="Log">${icon('plus')}</button></span>${tab('calendar', 'Calendar', 'calendar')}${tab('analytics', 'Analytics', 'analytics')}</nav>`;
}

const cyclePill = label =>
  `<button class="pill" aria-haspopup="dialog">${icon('layers', 's16')}${label}${icon('down', 's16')}</button>`;
const gear = `<button class="icon-btn" aria-label="Settings">${icon('gear')}</button>`;

const todayBar = date =>
  `<header class="topbar"><button class="icon-btn" aria-label="Previous day">${icon('left')}</button><h1 class="date-title"><button>${long(date)}</button></h1><button class="icon-btn" aria-label="Next day">${icon('right')}</button>${cyclePill('Cycle 2')}${gear}</header>`;

const titleBar = (title, pill = 'Cycle 2') =>
  `<header class="topbar"><h1 class="title">${title}</h1><span class="spacer"></span>${pill ? cyclePill(pill) : ''}${gear}</header>`;

const chartBar = (pill, view) =>
  `<header class="topbar chartbar"><h1 class="sr-only">Chart</h1>${cyclePill(pill)}<span class="seg"><button aria-pressed="${view === 'grid'}">35-day</button><button aria-pressed="${view === 'strip'}">Strip</button></span><span class="spacer"></span><button class="icon-btn" aria-label="Chart options">${icon('more')}</button>${gear}</header>`;

const backBar = title =>
  `<header class="topbar"><button class="icon-btn" aria-label="Back">${icon('back')}</button><h1 class="title" style="padding-left:0">${title}</h1></header>`;

const footline =
  '<p class="footline">© 2026 Fertility Tracker · <a href="#legal">Legal</a> · v1.32.0</p>';

// ---------------------------------------------------------------------------------------------
// Observation form
// ---------------------------------------------------------------------------------------------
const GROUPS = {
  bleeding: {
    name: 'Bleeding',
    multi: false,
    chips: [
      ['H', 'Heavy', 'H - Heavy flow'],
      ['M', 'Moderate', 'M - Moderate flow'],
      ['L', 'Light', 'L - Light flow'],
      ['VL', 'Very light', 'VL - Very light flow'],
      ['B', 'Brown or black', 'B - Brown or black blood'],
    ],
  },
  mucus: {
    name: 'Mucus',
    multi: false,
    chips: [
      ['0', 'Dry', '0 - Dry'],
      ['2', 'Damp', '2 - Damp without lubrication'],
      ['2W', 'Wet', '2W - Wet without lubrication'],
      ['4', 'Shiny', '4 - Shiny without lubrication'],
      ['6', 'Slightly stretchy', '6 - Slightly stretchy (about 0.5 cm)'],
      ['8', 'Moderately stretchy', '8 - Moderately stretchy (1 to 2 cm)'],
      ['10', 'Very stretchy', '10 - Very stretchy (2.5 cm or more)'],
      ['10DL', 'Damp, lubricative', '10DL - Damp with lubrication'],
      ['10SL', 'Shiny, lubricative', '10SL - Shiny with lubrication'],
      ['10WL', 'Wet, lubricative', '10WL - Wet with lubrication'],
    ],
  },
  appearance: {
    name: 'Appearance',
    multi: true,
    chips: [
      ['B', 'Brown', 'B - Brown blood'],
      ['C', 'Cloudy', 'C - Cloudy or white'],
      ['C/K', 'Cloudy and clear', 'C/K - Cloudy and clear mixed'],
      ['G', 'Gummy', 'G - Gummy or sticky'],
      ['K', 'Clear', 'K - Clear'],
      ['L', 'Lubricative', 'L - Lubricative'],
      ['P', 'Pasty', 'P - Pasty or creamy'],
      ['Y', 'Yellow', 'Y - Yellow'],
    ],
  },
  frequency: {
    name: 'Frequency',
    multi: false,
    chips: [
      ['X1', 'One time', 'X1 - One time only'],
      ['X2', 'Two times', 'X2 - Two times'],
      ['X3', 'Three times', 'X3 - Three times'],
      ['AD', 'All day', 'AD - All day (4 times or more)'],
    ],
  },
  symptoms: {
    name: 'Symptoms',
    multi: true,
    chips: [
      ['AP', 'Abdominal pain', 'AP - Abdominal pain'],
      ['RAP', 'Right side', 'RAP - Right abdominal pain'],
      ['LAP', 'Left side', 'LAP - Left abdominal pain'],
    ],
  },
};

const shortName = (group, code) => GROUPS[group].chips.find(c => c[0] === code)?.[1];

function rowValue(group, v) {
  if (!v || (Array.isArray(v) && v.length === 0)) return '<span class="v">None</span>';
  const codes = Array.isArray(v) ? v : [v];
  const names = codes
    .map((c, k) => (k === 0 ? shortName(group, c) : shortName(group, c).toLowerCase()))
    .join(', ');
  return `<span class="v set">${codes.join(', ')} - ${names}</span>`;
}

/**
 * The rows of the progressive form. `sel` holds the chosen codes, `open` the expanded group.
 * `only` limits the rows (Direct Code Only keeps the switches and the notes).
 */
function formRows(sel, { open = null, cols = 3, only = null } = {}) {
  const out = [];
  for (const key of Object.keys(GROUPS)) {
    if (only && !only.includes(key)) continue;
    const g = GROUPS[key];
    const isOpen = open === key;
    out.push(
      `<button class="row${isOpen ? ' open' : ''}" aria-expanded="${isOpen}"><span class="k">${g.name}</span>${rowValue(key, sel[key])}<span class="chev">${icon(isOpen ? 'up' : 'down', 's18')}</span></button>`
    );
    if (isOpen) {
      const chosen = [].concat(sel[key] ?? []);
      const attr = g.multi ? 'aria-pressed' : 'aria-pressed';
      const chips = g.chips
        .map(([code, name]) => {
          const on = chosen.includes(code);
          return g.multi
            ? `<button class="chip" ${attr}="${on}">${code}<small>${name}</small></button>`
            : `<button class="chip" ${attr}="${on}">${code}<small>${name}</small></button>`;
        })
        .join('');
      const full = chosen.map(c => g.chips.find(x => x[0] === c)[2]).join(' · ');
      out.push(
        `<div class="chips${cols === 4 ? ' c4' : ''}">${chips}${full ? `<span class="chipname">${full}</span>` : ''}</div>`
      );
    }
  }
  const sw = (label, on) =>
    `<div class="row"><span class="k">${label}</span><span class="spacer"></span><span class="switch" data-on="${on}"></span></div>`;
  if (!only || only.includes('i')) out.push(sw('I - Intercourse', !!sel.i));
  if (!only || only.includes('peak')) out.push(sw('Designate Peak Day (P)', !!sel.peak));
  if (!only || only.includes('notes')) {
    out.push(
      `<button class="row"><span class="k">Notes</span>${sel.notes ? `<span class="v set">${sel.notes}</span>` : '<span class="v">None</span>'}<span class="chev">${icon('right', 's18')}</span></button>`
    );
  }
  return `<section class="card rows" aria-label="Observation">${out.join('')}</section>`;
}

function statusCard(d, { codeOverride, size = 's40', more = true } = {}) {
  const code = codeOverride ?? (d ? fullCode(d) : null);
  const txt = d
    ? `<div class="code">${code}</div><div class="guide">${guideOf(d)}</div>`
    : '<div class="code none">No observation yet</div>';
  return `<section class="card status" aria-live="polite">${stamp(d, size)}<div class="txt">${txt}</div>${more ? `<button class="icon-btn" aria-label="Observation actions">${icon('more')}</button>` : ''}</section>`;
}

const codeField = (value, { focus = false, done = false } = {}) =>
  `<div class="codefield${focus ? ' focus' : ''}"><span class="label">Code</span><span class="value${value ? '' : ' ph'}">${value || 'For example 10KLX3 I AP'}${focus ? '<span class="caret"></span>' : ''}</span>${done ? '<button class="btn text md">Done</button>' : ''}</div>`;

function weekStrip(selDate, { emptyToday = false } = {}) {
  const days = [];
  for (let k = 6; k >= 0; k--) {
    const date = addDays(TODAY, -k);
    const d = date === TODAY && emptyToday ? null : dayOf(date);
    days.push(
      `<button class="d${date === selDate ? ' sel' : ''}" aria-label="${long(date)}">${stamp(d, 's28', { today: date === TODAY })}<span>${toDate(date).getUTCDate()}</span></button>`
    );
  }
  return `<section class="card week" aria-label="Last 7 days">${days.join('')}</section>`;
}

const savedTag = `<span class="saved">${icon('check', 's16')}Saved</span>`;

function dayStatus(date, d, { saved = true, jump = false } = {}) {
  const diff = Math.round((toDate(TODAY) - toDate(date)) / DAY_MS);
  const rel = diff === 0 ? '<b>Today</b>' : `<span>${diff} days ago</span>`;
  const state = saved ? savedTag : '<span>Not saved</span>';
  const txt = `<span>${rel} · <b>Day ${d.cd}</b> · ${state}</span>`;
  if (!jump) return `<p class="daystatus">${txt}</p>`;
  return `<div class="daystatus with-jump">${txt}<button class="btn text md">${icon('today', 's16')}Today</button></div>`;
}

const SEL_DRY = { mucus: '0', frequency: 'AD' };

// ---------------------------------------------------------------------------------------------
// Phone: Today
// ---------------------------------------------------------------------------------------------
function todayPhone({ overlay = '' } = {}) {
  const d = dayOf(TODAY);
  return `${todayBar(TODAY)}
<main class="page">
${dayStatus(TODAY, d)}
${statusCard(d)}
${codeField('0AD')}
${formRows(SEL_DRY)}
${weekStrip(TODAY)}
</main>
<div class="savebar"><button class="btn primary block" disabled>${icon('check', 's18')}Saved</button></div>
${bottomNav('today')}${overlay}`;
}

page('today-phone', {
  title: 'Today, phone',
  caption:
    'A saved dry day. The day status line shows Today, the cycle day and Saved. The groups are closed, so the form, the last 7 days and Save fit in one screen. Save reads Saved and is disabled until something changes.',
  size: 'phone',
  html: todayPhone(),
});

page('today-dark-phone', {
  title: 'Today, phone, dark theme',
  caption:
    'The same day in the dark theme. The status card uses the proposed --bg-hero token, so it follows the surface of the theme.',
  size: 'phone',
  theme: 'dark',
  html: todayPhone(),
});

page('today-menu-phone', {
  title: 'Today, phone, observation actions',
  caption:
    'The observation actions menu of the status card. Copy yesterday is an explicit action: the form never fills in the data of the day before. Delete is the last item, in red text, away from Save.',
  size: 'phone',
  html: todayPhone({
    overlay: `<div class="scrim light"></div><div class="menu" style="top:178px;right:16px"><button class="mi"><span class="ico">${icon('copy')}</span>Copy yesterday<span class="hint">0AD</span></button><button class="mi"><span class="ico">${icon('keyboard')}</span>Direct Code Only</button><hr><button class="mi danger"><span class="ico">${icon('trash')}</span>Delete observation</button></div>`,
  }),
});

{
  const date = '2026-10-12';
  const d = { ...dayOf(date), peak: false };
  page('today-group-open-phone', {
    title: 'Today, phone, a group open',
    caption:
      'A fertile day before the save (the mockup puts today on October 12, cycle day 13). The Mucus group is open: each chip shows the code over a short name, and the full name of the chosen code is under the chips. Only one group is open at a time. Peak Day is not shown yet, because the app finds it from the next days.',
    size: 'phone',
    html: `${todayBar(date)}
<main class="page">
<p class="daystatus"><span><b>Today</b> · <b>Day 13</b> · <span>Not saved</span></span></p>
${statusCard(d)}
${codeField('10KLAD AP')}
${formRows({ mucus: '10', appearance: ['K', 'L'], frequency: 'AD', symptoms: ['AP'] }, { open: 'mucus' })}
</main>
<div class="savebar"><button class="btn primary block">Save Observation</button></div>
${bottomNav('today')}`,
  });
}

page('today-empty-phone', {
  title: 'Today, phone, no observation',
  caption:
    'A day with no observation: a dashed stamp, the text No observation yet and no fertility text. The word Infertile never shows without a code. Save is disabled until something changes. A switch or a note alone also enables it.',
  size: 'phone',
  html: `${todayBar(TODAY)}
<main class="page">
<p class="daystatus"><span><b>Today</b> · <b>Day 28</b> · <span>Not saved</span></span></p>
${statusCard(null)}
${codeField('')}
${formRows({})}
${weekStrip(TODAY, { emptyToday: true })}
</main>
<div class="savebar"><button class="btn primary block" disabled>Save Observation</button></div>
${bottomNav('today')}`,
});

{
  const date = '2026-10-23';
  const d = dayOf(date);
  page('today-past-day-phone', {
    title: 'Today, phone, an earlier day',
    caption:
      'An earlier day, after three taps on Previous day. The day status line gives the distance to today, the cycle day and the saved state, and a Today button goes back to the date of today in one tap.',
    size: 'phone',
    html: `${todayBar(date)}
<main class="page">
${dayStatus(date, d, { jump: true })}
${statusCard(d)}
${codeField('0AD')}
${formRows(SEL_DRY)}
${weekStrip(date)}
</main>
<div class="savebar"><button class="btn primary block" disabled>${icon('check', 's18')}Saved</button></div>
${bottomNav('today')}`,
  });
}

{
  const d = { ...dayOf('2026-10-12'), sym: null, peak: false, main: '10KL' };
  const parse = [
    ['10', 'Very stretchy'],
    ['K', 'Clear'],
    ['L', 'Lubricative'],
  ]
    .map(([c, n]) => `<span><b>${c}</b> ${n}</span>`)
    .join('');
  const keys = r => `<div class="kr">${r.map(k => `<span class="key">${k}</span>`).join('')}</div>`;
  page('today-keyboard-phone', {
    title: 'Today, phone, keyboard open',
    caption:
      'A person types a code. The stamp and the group rows change as they type. The Save bar hides while the keyboard is open, and the field has a Done button, so the keyboard, the Save bar and the navigation never stack.',
    size: 'phone',
    html: `${todayBar(TODAY)}
<main class="page">
<p class="daystatus"><span><b>Today</b> · <b>Day 28</b> · <span>Not saved</span></span></p>
${statusCard(d, { codeOverride: '10KL' })}
${codeField('10KL', { focus: true, done: true })}
<div class="parse" aria-live="polite">${parse}</div>
${formRows({ mucus: '10', appearance: ['K', 'L'] })}
</main>
<div class="keyboard" aria-hidden="true">${keys(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])}${keys(['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'])}${keys(['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'])}<div class="kr"><span class="key w">ABC</span><span class="key space">space</span><span class="key ret">Done</span></div></div>`,
  });
}

{
  const d = dayOf(TODAY);
  page('today-direct-code-phone', {
    title: 'Today, phone, Direct Code Only',
    caption:
      'Direct Code Only, an option of the observation actions menu, for a person who knows the codes. The code groups hide. The two switches and the notes stay, and the field shows how the app reads the code.',
    size: 'phone',
    html: `${todayBar(TODAY)}
<main class="page">
${dayStatus(TODAY, d)}
${statusCard(d)}
${codeField('0AD')}
<div class="parse"><span><b>0</b> Dry</span><span><b>AD</b> All day</span></div>
${formRows(SEL_DRY, { only: ['i', 'peak', 'notes'] })}
${weekStrip(TODAY)}
</main>
<div class="savebar"><button class="btn primary block" disabled>${icon('check', 's18')}Saved</button></div>
${bottomNav('today')}`,
  });
}

// ---------------------------------------------------------------------------------------------
// Phone: Chart
// ---------------------------------------------------------------------------------------------
function dayCard(cycle, cd, { selected = false } = {}) {
  const date = cycleDate(cycle, cd);
  const d = dayOf(date);
  if (!d) {
    return `<button class="day empty" aria-label="Day ${cd}, ${long(date)}, empty"><span class="n">${cd}</span><span class="w">${weekday(date)}</span><span class="dt">${mmdd(date)}</span><span class="plus">${icon('plus', 's16')}</span></button>`;
  }
  const cls = ['day', date === TODAY ? 'today' : '', selected ? 'sel' : '', d.peak ? 'peak' : '']
    .filter(Boolean)
    .join(' ');
  return `<button class="${cls}" aria-label="Cycle day ${cd}, ${long(date)}, code ${fullCode(d)}"><span class="n">${cd}</span><span class="w">${weekday(date)}</span><span class="dt">${mmdd(date)}</span>${stamp(d)}<span class="c">${d.main}</span><span class="tag">${d.sym ?? ''}</span></button>`;
}

function compactCard(cycle, cd) {
  const date = cycleDate(cycle, cd);
  const d = dayOf(date);
  const cls = ['day', date === TODAY ? 'today' : '', d ? '' : 'empty'].filter(Boolean).join(' ');
  return `<button class="${cls}" aria-label="Cycle day ${cd}"><span class="n">${cd}</span>${stamp(d, 's24')}</button>`;
}

function phaseBar(cycle) {
  const last = cycle === 2 ? 28 : 28;
  const spans = [];
  for (let cd = 1; cd <= 35; cd++) {
    let c = 'ph-e';
    if (cd <= last) {
      if (cd <= 4) c = 'ph-m';
      else if (cd >= 9 && cd <= 12) c = 'ph-f';
      else if (cd === 13) c = 'ph-p';
      else if (cd >= 14 && cd <= 16) c = 'ph-c';
      else c = 'ph-d';
    }
    spans.push(`<span class="${c}"></span>`);
  }
  return `<div class="phasebar" aria-hidden="true">${spans.join('')}</div>`;
}

const cycleLine = (cycle, extra = '') =>
  `<div class="cycleline"><b>Cycle ${cycle}</b><span>${short(CYCLE_STARTS[cycle])} – ${short(cycleDate(cycle, 28))}</span>·<span>28 days</span>·<span class="peak">P Day 13</span>${extra}</div>`;

const jumpRow = `<div class="cyclecontrols"><button class="jump" aria-label="Jump to Day 1">1</button><button class="jump" aria-label="Jump to Peak Day (P)">P</button><button class="jump">${icon('today', 's16')}<span class="sr-only">Jump to Today</span></button><span class="spacer"></span><button class="jump" aria-label="Scroll left">${icon('left', 's18')}</button><button class="jump" aria-label="Scroll right">${icon('right', 's18')}</button></div>`;

function stripRow(cycle, from, to, { offset = 0, compact = false, selected = null } = {}) {
  const cards = [];
  for (let cd = from; cd <= to; cd++) {
    cards.push(
      compact ? compactCard(cycle, cd) : dayCard(cycle, cd, { selected: cd === selected })
    );
  }
  return `<div class="strip${compact ? ' compact' : ''}" style="margin-left:${-offset}px">${cards.join('')}</div>`;
}

function chartPhoneBody() {
  return `${chartBar('All cycles', 'grid')}
<main class="page">
<section class="card cyclecard" aria-label="Cycle 2">${cycleLine(2)}${jumpRow}${phaseBar(2)}<div style="overflow:hidden">${stripRow(2, 21, 28, { offset: 46 })}</div></section>
<section class="card cyclecard" aria-label="Cycle 1">${cycleLine(1)}${phaseBar(1)}<div style="overflow:hidden">${stripRow(1, 21, 28, { offset: 46 })}</div></section>
<div style="display:flex;gap:8px"><button class="btn ghost" style="flex:1">${icon('share', 's18')}Share chart</button><button class="btn ghost" style="flex:1">Legend</button></div>
${footline}
</main>
${bottomNav('chart')}`;
}

page('chart-phone', {
  title: 'Chart, phone, all cycles',
  caption:
    'All cycles in the 35-day view. The chart controls are in the top bar, and each cycle has a one-line header. The rows share one scroll position, so cycle day 22 of cycle 2 is above cycle day 22 of cycle 1. The page opens on the column of today. The day cards are 44 × 116 px, with the date, the stamp, the code and the symptom mark. A card cut at the left edge shows that the row scrolls.',
  size: 'phone',
  html: chartPhoneBody(),
});

page('chart-menu-phone', {
  title: 'Chart, phone, chart options',
  caption: 'The chart options menu: the phase bar, the legend and Share chart.',
  size: 'phone',
  html: `${chartPhoneBody()}<div class="scrim light"></div><div class="menu" style="top:50px;right:52px"><div class="mi"><span class="ico">${icon('analytics')}</span>Phase bar<span class="spacer"></span><span class="switch" data-on="true"></span></div><button class="mi"><span class="ico">${icon('info')}</span>Legend</button><button class="mi"><span class="ico">${icon('share')}</span>Share chart</button></div>`,
});

const legendItems = `<div>${stamp({ stamp: 'red' }, 's24')}Bleeding</div><div>${stamp({ stamp: 'dark_green' }, 's24')}Dry, no fertile mucus</div><div>${stamp({ stamp: 'white_baby' }, 's24')}Fertile mucus</div><div>${stamp({ stamp: 'white_baby', peak: true }, 's24')}Peak Day (P)</div><div>${stamp({ stamp: 'light_green_baby_1', pp: 1 }, 's24')}Post-Peak count 1, 2, 3</div><div>${stamp({ stamp: 'dark_green', i: true }, 's24')}I - Intercourse</div>`;
const legendCard = `<section class="card" aria-label="Legend"><div class="legend">${legendItems}</div></section>`;

page('chart-peak-phone', {
  title: 'Chart, phone, one cycle at Peak Day',
  caption:
    'Cycle 2 alone, after a tap on P. The row moves to Peak Day: the white stamps with the baby, the P mark, the Post-Peak count 1, 2, 3 and the I marks. The legend is open under the row.',
  size: 'phone',
  html: `${chartBar('Cycle 2', 'grid')}
<main class="page">
<section class="card cyclecard" aria-label="Cycle 2">${cycleLine(2)}${jumpRow}${phaseBar(2)}<div style="overflow:hidden">${stripRow(2, 9, 17, { offset: 47 })}</div></section>
${legendCard}
<div style="display:flex;gap:8px"><button class="btn ghost" style="flex:1">${icon('share', 's18')}Share chart</button><button class="btn ghost" style="flex:1">Hide legend</button></div>
${footline}
</main>
${bottomNav('chart')}`,
});

page('chart-strip-phone', {
  title: 'Chart, phone, strip view',
  caption:
    'The Strip view shows only the cycle day and the stamp, so 10 days fit in a row. A tap on a day opens the observation sheet with the full code. The rows stay aligned by cycle day.',
  size: 'phone',
  html: `${chartBar('All cycles', 'strip')}
<main class="page">
<section class="card cyclecard" aria-label="Cycle 2">${cycleLine(2)}${jumpRow}${phaseBar(2)}<div style="overflow:hidden">${stripRow(2, 18, 28, { offset: 80, compact: true })}</div></section>
<section class="card cyclecard" aria-label="Cycle 1">${cycleLine(1)}${phaseBar(1)}<div style="overflow:hidden">${stripRow(1, 18, 28, { offset: 80, compact: true })}</div></section>
<div style="display:flex;gap:8px"><button class="btn ghost" style="flex:1">${icon('share', 's18')}Share chart</button><button class="btn ghost" style="flex:1">Legend</button></div>
${footline}
</main>
${bottomNav('chart')}`,
});

page('chart-empty-phone', {
  title: 'Chart, phone, no data',
  caption:
    'The chart with no observation. One card gives the stamp legend and one button to record the observation of today. It tells the person where to load the demo cycles.',
  size: 'phone',
  html: `${chartBar('All cycles', 'grid')}
<main class="page">
<section class="card section"><h2 class="h2">No observations yet</h2><p class="sec small">Record the observation of today to start your chart. Each day gets a stamp:</p><div class="legend" style="padding:0">${legendItems}</div><button class="btn primary block">${icon('plus', 's18')}Record today</button><p class="small sec">To see an example chart, open <a href="#settings" style="color:var(--accent-primary)">Settings</a> and load the demo cycles.</p></section>
${footline}
</main>
${bottomNav('chart')}`,
});

// ---------------------------------------------------------------------------------------------
// Phone: sheets
// ---------------------------------------------------------------------------------------------
{
  const date = '2026-10-22';
  const d = { ...dayOf(date), i: true };
  page('observation-sheet-phone', {
    title: 'Observation sheet, phone',
    caption:
      'A tap on a day of the chart opens the observation sheet, with the same progressive form as Today. The header gives the date and the cycle day, the observation actions and Close. Here the person turned on I - Intercourse only, which enables Save. The red icon of the current footer is gone: Delete is in the observation actions.',
    size: 'phone',
    html: `${chartPhoneBody()}<div class="scrim"></div>
<section class="sheet" role="dialog" aria-label="Observation" style="top:70px"><div class="handle"></div><div class="sheet-head"><div><h2>${long(date)}</h2><div class="meta">Cycle 2 · Day 23 · Not saved</div></div><span class="spacer"></span><button class="icon-btn" aria-label="Observation actions">${icon('more')}</button><button class="icon-btn" aria-label="Close">${icon('x')}</button></div>
<div class="sheet-body">${statusCard(d, { more: false })}${codeField('0AD I')}${formRows({ ...SEL_DRY, i: true })}</div>
<div class="sheet-foot"><button class="btn ghost">Cancel</button><button class="btn primary">Save Observation</button></div></section>`,
  });
}

page('share-sheet-phone', {
  title: 'Share chart, phone',
  caption:
    'Share chart replaces the print part of the current export dialog. It holds only the print, PDF and PNG actions and the choice of cycles. Backup, restore, demo and delete go to Settings.',
  size: 'phone',
  html: `${chartPhoneBody()}<div class="scrim"></div>
<section class="sheet" role="dialog" aria-label="Share chart"><div class="handle"></div><div class="sheet-head"><h2>Share chart</h2><span class="spacer"></span><button class="icon-btn" aria-label="Close">${icon('x')}</button></div>
<div class="sheet-body"><p class="label">Cycles</p><div class="card"><div class="option sel"><span class="check on">${icon('check', 's16')}</span><span class="txt"><span class="t">Cycle 2<span class="badge-current">Current</span></span><br><span class="s">Sep 30 – Oct 27 · 28 days</span></span></div><div class="option"><span class="check"></span><span class="txt"><span class="t">Cycle 1</span><br><span class="s">Sep 2 – Sep 29 · 28 days</span></span></div></div><p class="caption-text" style="font-size:var(--font-size-xs)">Landscape pages with the 35-day grid, from the oldest cycle to the newest.</p></div>
<div class="sheet-foot"><button class="btn ghost">${icon('image', 's18')}Download PNG</button><button class="btn primary">${icon('printer', 's18')}Print or PDF</button></div></section>`,
});

page('cycle-picker-phone', {
  title: 'Cycle picker, phone',
  caption:
    'The cycle picker in the top bar opens this sheet on every page. The calendar follows the choice too: it tints the days of the chosen cycle.',
  size: 'phone',
  html: `${todayPhone()}<div class="scrim"></div>
<section class="sheet" role="dialog" aria-label="Cycle"><div class="handle"></div><div class="sheet-head"><h2>Cycle</h2><span class="spacer"></span><button class="icon-btn" aria-label="Close">${icon('x')}</button></div>
<div class="sheet-body" style="padding-bottom:24px"><div class="card"><button class="option" aria-pressed="false"><span class="radio"></span><span class="txt"><span class="t">All cycles (2)</span><br><span class="s">Show the 2 cycles</span></span></button><button class="option sel" aria-pressed="true"><span class="radio on"></span><span class="txt"><span class="t">Cycle 2<span class="badge-current">Current</span></span><br><span class="s">Started Sep 30 · 28 days with an observation</span></span></button><button class="option" aria-pressed="false"><span class="radio"></span><span class="txt"><span class="t">Cycle 1</span><br><span class="s">Started Sep 2 · 28 days with an observation</span></span></button></div></div></section>`,
});

// ---------------------------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------------------------
function calendarGrid({ selected = null, desktop = false } = {}) {
  const start = '2026-09-28';
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    .map(w => `<span class="wd">${w}</span>`)
    .join('');
  const cells = [];
  for (let k = 0; k < 42; k++) {
    const date = addDays(start, k);
    const d = dayOf(date);
    const inMonth = date.slice(5, 7) === '10';
    const cls = ['cell'];
    if (!inMonth) cls.push('other');
    if (date > TODAY) cls.push('future');
    if (d && d.cycle === 2) cls.push('tint');
    if (date === TODAY) cls.push('today');
    if (date === selected) cls.push('sel');
    const marks = d
      ? [
          d.i ? '<span class="mi-i">I</span>' : '',
          d.peak ? '<span class="mi-p">P</span>' : '',
          d.pp ? `<span class="mi-n">${d.pp}</span>` : '',
          d.cd === 1 ? `<span class="mi-c">C${d.cycle}</span>` : '',
        ].join('')
      : '';
    const startMark = d && d.cd === 1 ? '<span class="start"></span>' : '';
    const label = d ? `${long(date)}, cycle ${d.cycle} day ${d.cd}, ${fullCode(d)}` : long(date);
    cells.push(
      `<button class="${cls.join(' ')}" aria-label="${label}">${startMark}<span class="dn">${toDate(date).getUTCDate()}</span>${d ? stamp(d, desktop ? '' : 's24', { marks: false }) : ''}${d ? `<span class="c">${d.main}</span>` : ''}<span class="marks">${marks}</span></button>`
    );
  }
  return `<div class="calgrid">${wd}${cells.join('')}</div>`;
}

const monthNav = `<div class="monthnav"><button class="icon-btn" aria-label="Previous month">${icon('left')}</button><h2 class="m">October 2026</h2><button class="icon-btn" aria-label="Next month" disabled style="opacity:.35">${icon('right')}</button></div>`;
const calKey = `<p class="caption-text" style="font-size:var(--font-size-xs)">Tinted days: Cycle 2. A red edge and C2 mark the first day of a cycle. Under each code: I, P and the Post-Peak count.</p>`;

page('calendar-phone', {
  title: 'Calendar, phone',
  caption:
    'One month with cells of 48 × 80 px and 11 px codes. The I, P and 1, 2, 3 marks move from the stamp to a row under the code. The first day of a cycle has a red edge and its cycle number. The days of the chosen cycle are tinted, and all the days keep full contrast. The legal text is one line under the last card.',
  size: 'phone',
  html: `${titleBar('Calendar')}
<main class="page">
${monthNav}
${calendarGrid()}
${calKey}
${footline}
</main>
${bottomNav('calendar')}`,
});

// ---------------------------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------------------------
const tiles = `<div class="card tile"><span class="tl">Cycle length</span><span class="tv">28 <small>days</small></span><span class="ts">Sep 30 – Oct 27</span></div><div class="card tile"><span class="tl">Peak Day</span><span class="tv">CD 13</span><span class="ts">Oct 12</span></div><div class="card tile"><span class="tl">Luteal phase</span><span class="tv">15 <small>days</small></span><span class="ts">After Peak Day</span></div><div class="card tile"><span class="tl">Intercourse</span><span class="tv">3 <small>days</small></span><span class="ts">In this cycle</span></div>`;

const phasesCard = `<section class="card section phases"><h2 class="h2">Cycle phases</h2><div class="bar"><span style="flex:4;background:var(--stamp-red)">4</span><span style="flex:9;background:var(--color-info)">9</span><span style="flex:3;background:var(--stamp-light-green);color:var(--stamp-light-green-text)">3</span><span style="flex:12;background:var(--stamp-dark-green)">12</span></div><div class="keys"><span style="--sw:var(--stamp-red)">Menses</span><span style="--sw:var(--color-info)">Before Peak Day</span><span style="--sw:var(--stamp-light-green)">Post-Peak count</span><span style="--sw:var(--stamp-dark-green)">After the count</span></div></section>`;

function trendCard(barWidth = 8) {
  const bars = [];
  const xs = [];
  for (let cd = 1; cd <= 35; cd++) {
    const d = cd <= 28 ? demoDay(cd) : null;
    const s = d?.score ?? 0;
    bars.push(
      `<span class="tb${d?.peak ? ' pk' : ''}" style="width:${barWidth}px;height:${d ? Math.max(2, s * 11) : 0}px" title="CD ${cd}"></span>`
    );
    xs.push(
      `<span class="tx" style="width:${barWidth}px">${cd === 1 || cd % 5 === 0 ? cd : ''}</span>`
    );
  }
  return `<section class="card section"><h2 class="h2">Mucus score trend</h2><p class="caption-text" style="font-size:var(--font-size-xs)">Score from 0 to 10 for each cycle day. The pink bar is Peak Day.</p><div class="trend">${bars.join('')}</div><div class="trendx">${xs.join('')}</div></section>`;
}

const distCard = `<section class="card section dist"><h2 class="h2">Stamps in this cycle</h2>${[
  ['Bleeding', 4, 'var(--stamp-red)'],
  ['Dry', 18, 'var(--stamp-dark-green)'],
  ['Fertile mucus', 3, 'var(--stamp-white-border)'],
  ['Post-Peak count', 3, 'var(--stamp-light-green)'],
]
  .map(
    ([n, c, col]) =>
      `<div class="dr"><span style="width:120px">${n}</span><span class="bar"><span style="width:${(c / 28) * 100}%;background:${col}"></span></span><b style="width:24px;text-align:right">${c}</b></div>`
  )
  .join('')}</section>`;

const clinicalCard = `<section class="card section"><h2 class="h2">Clinical summary</h2><div><div class="kv"><span class="kk">Average mucus score, cycle days 9 to 13</span><span class="v">5.6</span></div><div class="kv"><span class="kk">Luteal phase</span><span class="v ok">Normal (9 to 17 days)</span></div></div></section>`;

const mcsCard = `<section class="card"><button class="accordion" aria-expanded="false">${icon('help', 's18')}What is the Creighton Mucus Score?<span class="spacer"></span>${icon('down', 's18')}</button></section>`;

page('analytics-phone', {
  title: 'Analytics, phone (full page)',
  caption:
    'The four tiles have full labels on two lines in a 2 × 2 grid, so no label is cut. Then come the phases, the trend, the stamps and the clinical summary. The trend uses 8 px bars, so 35 days fit in the card with no scroll. The summary does not repeat the numbers of the tiles. The explanation of the score is last and closed. This frame shows the full page.',
  size: 'phone',
  long: true,
  html: `${titleBar('Analytics')}
<main class="page">
<div class="tiles">${tiles}</div>
${phasesCard}
${trendCard(8)}
${distCard}
${clinicalCard}
${mcsCard}
${footline}
</main>
${bottomNav('analytics')}`,
});

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------
const navRow = (ic, k, v = '', { sub = '', danger = false, chev = true } = {}) =>
  `<button class="row${sub ? ' tall' : ''}${danger ? ' danger' : ''}"><span class="ico">${icon(ic)}</span><span class="k">${k}${sub ? `<span class="sub">${sub}</span>` : ''}</span><span class="v">${v}</span>${chev ? `<span class="chev">${icon('right', 's18')}</span>` : ''}</button>`;
const switchRow = (ic, k, on, sub = '') =>
  `<div class="row${sub ? ' tall' : ''}"><span class="ico">${icon(ic)}</span><span class="k" style="flex:1;white-space:normal">${k}${sub ? `<span class="sub">${sub}</span>` : ''}</span><span class="switch" data-on="${on}"></span></div>`;

const settingsList = `<section class="card rows"><div class="row tall"><span class="ico">${icon('phone')}</span><span class="k" style="flex:1;white-space:normal">Install app<span class="sub">Full screen, offline, and your data kept safer</span></span><button class="btn ghost md">Install</button></div></section>
<h2 class="group-title">Appearance and input</h2>
<section class="card rows">${navRow('globe', 'Language', 'English')}<div class="row"><span class="ico">${icon('moon')}</span><span class="k">Theme</span><span class="spacer"></span><span class="seg"><button aria-pressed="true">Light</button><button aria-pressed="false">Dark</button></span></div>${switchRow('vibrate', 'Vibration', true)}${switchRow('dot', 'App icon badge', false, 'A dot on the icon when today has no observation')}${switchRow('keyboard', 'Keyboard shortcuts', true)}</section>
<h2 class="group-title">Backup and restore</h2>
<section class="card rows">${navRow('download', 'Back up now', '', { sub: 'Last backup: Oct 20, 2026', chev: false })}${navRow('upload', 'Restore from a file', '', { chev: false })}</section>
<h2 class="group-title">Help</h2>
<section class="card rows">${navRow('help', 'Welcome guide')}${navRow('keyboard', 'Keyboard shortcuts')}</section>
<h2 class="group-title">About</h2>
<section class="card rows">${navRow('info', 'About Fertility Tracker', 'v1.32.0', { sub: 'Release notes, storage' })}${navRow('scale', 'Legal and medical notice')}</section>
<h2 class="group-title">Data</h2>
<section class="card rows">${navRow('demo', 'Load the demo cycles', '', { chev: false })}${navRow('trash', 'Delete all data', '', { danger: true, chev: false })}</section>`;

page('settings-phone', {
  title: 'Settings, phone (full page)',
  caption:
    'Settings holds all the actions that are not a part of the daily work: install, language, theme, vibration, badge, shortcuts, backup and restore, help, about and the data actions. It opens from the gear in the top bar and Back closes it. Delete all data is the last row, in red text. This frame shows the full page.',
  size: 'phone',
  long: true,
  html: `${backBar('Settings')}
<main class="page" style="padding-bottom:24px">
${settingsList}
</main>`,
});

const legalProse = `<div class="prose"><h3>Trademarks</h3><p>FertilityCare™ and Creighton Model FertilityCare™ System (CrMS) are registered trademarks of the Saint Paul VI Institute for the Study of Human Reproduction.</p><p>Fertility Tracker is an independent open-source software project. It is not affiliated with, endorsed by, certified by, or sponsored by the Saint Paul VI Institute, FertilityCare™ Centers of America (FCCA), or FertilityCare™ Centers International (FCCI).</p><h3>Medical notice</h3><p>This software is for personal tracking, record-keeping, and educational purposes only. It does not provide medical advice, diagnosis, or treatment. Always consult a certified FertilityCare Practitioner or Medical Consultant for clinical guidance.</p></div>`;

page('settings-about-phone', {
  title: 'Settings, About, phone (full page)',
  caption:
    'Settings, About: the version, the release notes, the storage data and the full legal and medical notice. The footer of the browser keeps one line with a Legal link to this page.',
  size: 'phone',
  long: true,
  html: `${backBar('About')}
<main class="page" style="padding-bottom:24px">
<section class="card section" style="flex-direction:row;align-items:center"><img src="${LOGO}" alt="" width="48" height="48" style="border-radius:12px"><div><div class="h2">Fertility Tracker</div><div class="small sec">Version 1.32.0 · Open-source software</div></div></section>
<section class="card rows">${navRow('file', 'Release notes', 'v1.32.0')}${navRow('database', 'Storage and diagnostics', '56 observations')}${navRow('external', 'Source code on GitHub', '', { chev: false })}</section>
<h2 class="group-title" id="legal">Legal and medical notice</h2>
<section class="card section">${legalProse}</section>
<p class="footline">© 2026 Fertility Tracker · Open-source software</p>
</main>`,
});

// ---------------------------------------------------------------------------------------------
// Welcome guide
// ---------------------------------------------------------------------------------------------
page('welcome-phone', {
  title: 'Welcome guide, phone',
  caption:
    'The first slide of the welcome guide. Explore Demo Data is on the first slide too, not only on the last one. The guide also opens from Settings, Help.',
  size: 'phone',
  html: `${todayPhone()}<div class="scrim"></div>
<section class="sheet welcome" role="dialog" aria-label="Welcome to Fertility Tracker" style="top:40px"><div style="display:flex;align-items:center"><span class="label">Step 1 of 4</span><span class="spacer"></span><button class="btn text md">Skip Tour</button></div>
<div style="display:flex;align-items:center;gap:12px"><img src="${LOGO}" alt="" width="48" height="48" style="border-radius:12px"><div><h2 style="font-size:var(--font-size-xl)">Clinical charting, privacy first</h2></div></div>
<p class="sec" style="line-height:1.5">Fertility Tracker follows the Creighton Model System (CrMS), a standard method to chart the natural signs of fertility.</p>
<div class="card feature"><span class="fi">${icon('shield')}</span><div><b>Your data stays on this device</b><p>No account, no server and no tracking. The app keeps your observations in this browser only.</p></div></div>
<div class="card feature"><span class="fi">${icon('drop')}</span><div><b>Daily observations, not guesses</b><p>CrMS uses what you see each day: bleeding, mucus and sensation. It does not calculate your cycle from averages.</p></div></div>
<span class="spacer"></span>
<div class="dots" aria-hidden="true"><span class="dot on"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
<div style="display:flex;gap:12px"><button class="btn ghost" style="flex:1;height:48px">Explore Demo Data</button><button class="btn primary" style="flex:1;height:48px">Next</button></div>
<button class="btn text md" style="align-self:center">${icon('upload', 's16')}Restore a backup</button></section>`,
});

// ---------------------------------------------------------------------------------------------
// Desktop shell
// ---------------------------------------------------------------------------------------------
function deskTop(current, right) {
  const tab = (id, label, ic) =>
    `<button class="t" role="tab" aria-selected="${current === id}">${icon(ic, 's18')}${label}</button>`;
  return `<header class="dtop"><div class="wordmark"><img src="${LOGO}" alt="">Fertility Tracker</div><div class="tabs" role="tablist" aria-label="Pages">${tab('today', 'Today', 'today')}${tab('chart', 'Chart', 'chart')}${tab('calendar', 'Calendar', 'calendar')}${tab('analytics', 'Analytics', 'analytics')}</div><span class="spacer"></span>${right}<button class="btn primary md" style="height:40px">${icon('plus', 's18')}Log<span class="kbd">N</span></button><button class="icon-btn" aria-label="Settings">${icon('gear')}</button></header>`;
}

const dateCtl = date => {
  const d = dayOf(date);
  return `<div class="datectl"><button class="icon-btn md" aria-label="Previous day">${icon('left')}</button><button class="d">${long(date)}</button><button class="icon-btn md" aria-label="Next day">${icon('right')}</button><span class="dmeta"><b>Today</b> · Day ${d.cd}</span></div>`;
};

const chartControls = (pill, { phases = true, legend = false } = {}) =>
  `${cyclePill(pill)}<span class="seg"><button aria-pressed="true">35-day</button><button aria-pressed="false">Strip</button></span><button class="btn ghost md" aria-pressed="${phases}">Phases</button><button class="btn ghost md" aria-pressed="${legend}">Legend</button><button class="btn ghost md">${icon('share', 's16')}Share</button>`;

// ---------------------------------------------------------------------------------------------
// Desktop: Today
// ---------------------------------------------------------------------------------------------
function mini35() {
  const cols = [];
  for (let cd = 1; cd <= 35; cd++) {
    const date = cycleDate(2, cd);
    const d = dayOf(date);
    cols.push(
      `<span class="mc${date === TODAY ? ' today' : ''}">${d ? stamp(d, 's20', { marks: false }) : '<span class="blank"></span>'}${cd}</span>`
    );
  }
  return `<div class="mini35" aria-hidden="true">${cols.join('')}</div>`;
}

function last7(fromDate, n = 7) {
  const rows = [];
  for (let k = 1; k <= n; k++) {
    const date = addDays(fromDate, -k);
    const d = dayOf(date);
    rows.push(
      `<button class="li" style="width:100%">${stamp(d, 's24')}<span class="dt">${long(date)}</span><span class="cd">Day ${d.cd}</span><span class="code">${fullCode(d)}</span><span class="muted">${icon('right', 's18')}</span></button>`
    );
  }
  return `<section class="card"><div style="padding:12px 12px 4px" class="h2">Last 7 days</div><div class="list7">${rows.join('')}</div></section>`;
}

function deskStatus(d) {
  return `<section class="card status" style="padding:16px;gap:16px">${stamp(d, 's56')}<div class="txt"><div class="code" style="font-size:var(--font-size-2xl)">${fullCode(d)}</div><div class="guide">${guideOf(d)}</div></div><span class="daystatus" style="height:auto">${savedTag}</span></section>`;
}

function todayDeskBody(open = 'mucus', cols = 4) {
  return `<div class="formcard card"><h2 class="sr-only">Observation</h2>${codeField('0AD')}${formRows(SEL_DRY, { open, cols })}<div class="formfoot"><button class="btn primary" disabled style="height:48px;min-width:200px">${icon('check', 's18')}Saved</button><span class="caption-text" style="font-size:var(--font-size-xs)">Save: <span class="kbd">Ctrl</span> <span class="kbd">S</span></span><span class="spacer"></span><button class="btn ghost md">${icon('more', 's18')}More</button></div></div>`;
}

page('today-desktop', {
  title: 'Today, desktop 1440 px',
  caption:
    'The form on the left (640 px) and its context on the right: the status of the day, the current cycle with today marked, and the last 7 days. The date control is in the top bar from 1360 px. No statistics bar and no empty column. Delete is in More, away from Save.',
  size: 'desk',
  html: `${deskTop('today', `${cyclePill('Cycle 2')}${dateCtl(TODAY)}`)}
<main class="dcontent"><h1 class="sr-only">Today</h1><div class="dinner grid-today">
${todayDeskBody()}
<div class="col">${deskStatus(dayOf(TODAY))}<section class="card section"><div style="display:flex;align-items:baseline;gap:8px"><h2 class="h2">This cycle</h2><span class="sec small">Day 28 of 28 · Peak Day 13</span><span class="spacer"></span><button class="btn text md">Open the chart${icon('right', 's16')}</button></div>${mini35()}</section>${last7(TODAY)}</div>
</div></main>`,
});

page('today-laptop', {
  title: 'Today, laptop 1024 px',
  caption:
    'From 1024 to 1359 px the top bar has two rows: the tabs on the first row, the date control on the second. Thus the French labels fit and the page never scrolls to the side. The context column keeps the status and the last 7 days.',
  size: 'laptop',
  html: `${deskTop('today', cyclePill('Cycle 2'))}<div class="dtop2">${dateCtl(TODAY)}</div>
<main class="dcontent two-row"><h1 class="sr-only">Today</h1><div class="dinner grid-today" style="grid-template-columns:minmax(0,1fr) 380px">
${todayDeskBody(null)}
<div class="col">${deskStatus(dayOf(TODAY))}${last7(TODAY, 5)}</div>
</div></main>`,
});

// ---------------------------------------------------------------------------------------------
// Desktop: Chart
// ---------------------------------------------------------------------------------------------
function deskCell(cycle, cd, { selected = null } = {}) {
  const date = cycleDate(cycle, cd);
  const d = dayOf(date);
  if (!d) {
    return `<button class="cell2 empty" aria-label="Day ${cd}, ${long(date)}, empty"><span class="n">${cd}</span><span class="w">${weekday(date)}</span>${icon('plus', 's16')}</button>`;
  }
  const cls = [
    'cell2',
    date === TODAY ? 'today' : '',
    selected === cd ? 'sel' : '',
    d.peak ? 'peak' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<button class="${cls}" aria-label="Cycle day ${cd}, ${long(date)}, code ${fullCode(d)}"><span class="n">${cd}</span><span class="w">${weekday(date)}</span>${stamp(d)}<span class="c"><span>${d.main}</span>${d.sym ? `<span class="sym">${d.sym}</span>` : ''}</span></button>`;
}

function deskCycle(
  cycle,
  { from = 1, to = 35, selected = null, controls = false, colw = 44 } = {}
) {
  const cells = [];
  for (let cd = from; cd <= to; cd++) {
    if (cycle === 1 && cd > 28) break;
    cells.push(deskCell(cycle, cd, { selected }));
  }
  const ctl = controls
    ? `<span class="spacer"></span><span class="cyclecontrols"><button class="jump">1</button><button class="jump">P</button><button class="jump">${icon('today', 's16')}</button><button class="jump">${icon('left', 's18')}</button><button class="jump">${icon('right', 's18')}</button></span>`
    : '';
  return `<section class="card cyclecard" aria-label="Cycle ${cycle}" style="padding:12px 16px 16px">${cycleLine(cycle, cycle === 2 ? `·<span>Current</span>${ctl}` : '')}${phaseBar(cycle)}<div style="overflow:hidden"><div class="cols" style="grid-template-columns:repeat(${to - from + 1},${colw}px)">${cells.join('')}</div></div></section>`;
}

const detailBar = (date, extra = '') => {
  const d = dayOf(date);
  return `<section class="card detailbar" aria-live="polite">${stamp(d, 's40')}<div class="txt"><div><b>${long(date)}</b> · Cycle ${d.cycle}, day ${d.cd} · <span class="dcode">${fullCode(d)}</span></div><div class="sec small">${guideOf(d)} Saved.</div></div>${extra}<button class="btn ghost md">Edit</button><button class="btn ghost md">Open in Today</button></section>`;
};

const legendRow = `<section class="card" aria-label="Legend"><div class="legend" style="grid-template-columns:repeat(6,auto);justify-content:start;gap:8px 28px">${legendItems}</div></section>`;

function chartDeskBody(sel = 28) {
  return `<main class="dcontent"><h1 class="sr-only">Chart</h1><div class="dinner col">
${deskCycle(2, { selected: sel === 28 ? null : sel, controls: true })}
${deskCycle(1)}
${detailBar(cycleDate(2, sel))}
${legendRow}
</div></main>`;
}

page('chart-desktop', {
  title: 'Chart, desktop 1440 px',
  caption:
    'The chart controls are in the top bar. The columns are 44 px, so 28 days fit at 1440 px, and days 29 to 35 scroll. From 1600 px all 35 columns fit. A code breaks only between its tokens (10KLAD over AP). Cycles align by cycle day. The day detail bar under the rows replaces the dialog of a click on a day. The legend is on.',
  size: 'desk',
  html: `${deskTop('chart', chartControls('All cycles', { legend: true }))}
${chartDeskBody()}`,
});

page('chart-laptop', {
  title: 'Chart, laptop 1024 px',
  caption:
    'At 1024 px the chart controls go to the second row of the top bar. About 20 columns fit. The page opens on the column of today, and the two rows share the scroll position.',
  size: 'laptop',
  html: `${deskTop('chart', cyclePill('All cycles'))}<div class="dtop2"><span class="seg"><button aria-pressed="true">35-day</button><button aria-pressed="false">Strip</button></span><button class="btn ghost md" aria-pressed="true">Phases</button><button class="btn ghost md">Legend</button><button class="btn ghost md">${icon('share', 's16')}Share</button></div>
<main class="dcontent two-row"><h1 class="sr-only">Chart</h1><div class="dinner col">
${deskCycle(2, { from: 9, to: 30, controls: true })}
${deskCycle(1, { from: 9, to: 30 })}
${detailBar(TODAY)}
</div></main>`,
});

{
  const date = cycleDate(2, 23);
  const d = { ...dayOf(date), i: true };
  page('observation-panel-desktop', {
    title: 'Observation panel, desktop 1440 px',
    caption:
      'From 1024 px the observation sheet is a 480 px panel on the right, so the chart stays visible. It has the focus rules of the current sheet. Escape and Back close it.',
    size: 'desk',
    html: `${deskTop('chart', chartControls('All cycles'))}
${chartDeskBody(23)}<div class="scrim light"></div>
<section class="panel" role="dialog" aria-label="Observation"><div class="sheet-head" style="display:flex;align-items:center;gap:4px;padding:12px 12px 12px 24px;border-bottom:1px solid var(--bg-surface-border)"><div><h2 class="h2">${long(date)}</h2><div class="sec small">Cycle 2 · Day 23 · Not saved</div></div><span class="spacer"></span><button class="icon-btn" aria-label="Observation actions">${icon('more')}</button><button class="icon-btn" aria-label="Close">${icon('x')}</button></div>
<div style="flex:1;padding:16px 24px;display:flex;flex-direction:column;gap:12px;overflow:hidden">${statusCard(d, { more: false })}${codeField('0AD I')}${formRows({ ...SEL_DRY, i: true }, { open: 'frequency', cols: 4 })}</div>
<div style="display:flex;gap:12px;padding:16px 24px;border-top:1px solid var(--bg-surface-border)"><button class="btn ghost" style="flex:1;height:48px">Cancel</button><button class="btn primary" style="flex:1;height:48px">Save Observation</button></div></section>`,
  });
}

page('share-desktop', {
  title: 'Share chart, desktop 1440 px',
  caption:
    'Share in the chart controls opens this dialog. It holds only the print, PDF and PNG actions and the choice of cycles.',
  size: 'desk',
  html: `${deskTop('chart', chartControls('All cycles'))}
${chartDeskBody()}<div class="scrim"></div>
<section class="dialog" role="dialog" aria-label="Share chart" style="width:480px"><div class="dh"><h2>Share chart</h2><button class="icon-btn" aria-label="Close">${icon('x')}</button></div>
<div class="db"><p class="label">Cycles</p><div class="card"><div class="option sel"><span class="check on">${icon('check', 's16')}</span><span class="txt"><span class="t">Cycle 2<span class="badge-current">Current</span></span><br><span class="s">Sep 30 – Oct 27 · 28 days</span></span></div><div class="option"><span class="check"></span><span class="txt"><span class="t">Cycle 1</span><br><span class="s">Sep 2 – Sep 29 · 28 days</span></span></div></div><p class="caption-text" style="font-size:var(--font-size-xs)">Landscape pages with the 35-day grid, from the oldest cycle to the newest.</p></div>
<div class="df"><button class="btn ghost">${icon('image', 's18')}Download PNG</button><button class="btn primary">${icon('printer', 's18')}Print or save as PDF</button></div></section>`,
});

// ---------------------------------------------------------------------------------------------
// Desktop: Calendar and Analytics
// ---------------------------------------------------------------------------------------------
{
  const date = '2026-10-12';
  const d = dayOf(date);
  const kv = (k, v) =>
    `<div class="kv"><span class="kk">${k}</span><span class="v">${v}</span></div>`;
  page('calendar-desktop', {
    title: 'Calendar, desktop 1440 px',
    caption:
      'The grid is 896 px wide with cells of 120 × 96 px. A click on a day fills the day panel on the right, the same panel as the day detail of the chart. The days of the chosen cycle are tinted.',
    size: 'desk',
    html: `${deskTop('calendar', cyclePill('Cycle 2'))}
<main class="dcontent"><h1 class="sr-only">Calendar</h1><div class="dinner dcal">
<div class="col" style="gap:8px">${monthNav}${calendarGrid({ selected: date, desktop: true })}${calKey}${footline}</div>
<section class="card section" aria-live="polite" style="gap:16px"><div style="display:flex;gap:16px;align-items:center">${stamp(d, 's56')}<div><h2 class="h2">${long(date)}</h2><div class="sec small">Cycle 2 · Day 13 · <span style="color:var(--color-peak-text);font-weight:700">Peak Day (P)</span></div><div class="mono" style="font-size:var(--font-size-xl);font-weight:700">${fullCode(d)}</div></div></div><p class="sec small">${guideOf(d)}</p><div>${kv('Bleeding', 'None')}${kv('Mucus', '10 - Very stretchy')}${kv('Appearance', 'K, L - Clear, lubricative')}${kv('Frequency', 'AD - All day')}${kv('Symptoms', 'AP - Abdominal pain')}${kv('I - Intercourse', 'No')}${kv('Notes', 'None')}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost md">Edit</button><button class="btn ghost md">Open in Chart</button><button class="btn ghost md">Open in Today</button></div></section>
</div></main>`,
  });
}

page('analytics-desktop', {
  title: 'Analytics, desktop 1440 px',
  caption:
    'The four tiles on one row. They are the only statistics bar of the app: the bar leaves Today, Chart and Calendar. Under the tiles, two columns of cards, and the closed explanation of the score at the end.',
  size: 'desk',
  html: `${deskTop('analytics', cyclePill('Cycle 2'))}
<main class="dcontent"><h1 class="sr-only">Analytics</h1><div class="dinner col">
<div class="dtiles">${tiles}</div>
<div class="dgrid2"><div class="col">${phasesCard}${trendCard(16)}</div><div class="col">${distCard}${clinicalCard}</div></div>
${mcsCard}
${footline}
</div></main>`,
});

page('settings-desktop', {
  title: 'Settings, desktop 1440 px',
  caption:
    'On a desktop, Settings is a 560 px dialog with the same groups as the phone page. The list scrolls inside the dialog.',
  size: 'desk',
  html: `${deskTop('today', `${cyclePill('Cycle 2')}${dateCtl(TODAY)}`)}
<main class="dcontent"><div class="dinner grid-today">${todayDeskBody()}<div class="col">${deskStatus(dayOf(TODAY))}${last7(TODAY)}</div></div></main><div class="scrim"></div>
<section class="dialog" role="dialog" aria-label="Settings" style="width:560px;height:780px"><div class="dh"><h2>Settings</h2><button class="icon-btn" aria-label="Close">${icon('x')}</button></div>
<div class="db" style="gap:8px;background:var(--bg-primary)">${settingsList}</div></section>`,
});

// ---------------------------------------------------------------------------------------------
// Index of the mockups
// ---------------------------------------------------------------------------------------------
const items = PAGES.map(
  p =>
    `<li><a href="${p.file}.html"><img src="images/${p.file}.png" alt="" loading="lazy"><span><b>${p.title}</b></span></a></li>`
).join('\n');
writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RFC 0002 mockups</title>
<style>
body { font-family: system-ui, sans-serif; margin: 24px; background: #f8f6f1; color: #1a2230; }
ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
a { color: inherit; text-decoration: none; display: flex; flex-direction: column; gap: 8px; }
img { width: 100%; height: 320px; object-fit: contain; object-position: top; background: #8a8d93; border-radius: 8px; }
</style>
</head>
<body>
<h1>RFC 0002 mockups</h1>
<p>Static mockups of the screens of RFC 0002, on the real tokens of src/styles. Open a mockup to see it at its real size.</p>
<ul>
${items}
</ul>
</body>
</html>
`
);
writeFileSync(join(OUT, 'pages.json'), `${JSON.stringify(PAGES, null, 2)}\n`);
console.log(`${PAGES.length} mockups written`);
