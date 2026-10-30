import type { TranslationSchema } from '../i18n';
import { formatMessage } from '../i18n';
import type { StampType } from '../types/crms';
import { getCycleEndDate } from '../domain/cycleBoundaryDetector';
import { showsEmptyStamp } from '../domain/stampCalculator';
import { formatDateDisplay } from './dateUtils';
import { downloadBlob, getExportFilename } from './exportUtils';
import type { PrintCycle } from './printCycles';
import { PRINT_ROW_DAYS, printCode, printRows } from './printCycles';

/**
 * The colors of the image: the light theme values of `tokens.css`. The image is always on white
 * paper, as the print is, in each theme. A test compares them with the tokens.
 */
export const IMAGE_COLORS = {
  paper: '#ffffff',
  text: '#1a2230', // --text-primary
  muted: '#5b5f66', // --text-muted
  grid: '#e4dfd4', // --bg-surface-border
  red: '#e11d48', // --stamp-red
  darkGreen: '#15803d', // --stamp-dark-green
  white: '#ffffff', // --stamp-white
  whiteBorder: '#64748b', // --stamp-white-border
  whiteText: '#0f172a', // --stamp-white-text
  lightGreen: '#4ade80', // --stamp-light-green
  lightGreenText: '#064e3b', // --stamp-light-green-text
  yellow: '#eab308', // --stamp-yellow
  empty: '#64748b', // --stamp-empty
  peak: '#7c3aed', // --color-peak
  ink: '#1f3a5f', // --brand-ink
} as const;

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const font = (size: number, weight = 400, family = FONT) => `${weight} ${size}px ${family}`;

const PAD = 24;
const COL = 44;
const CELL_H = 92;
const STAMP = 28;
/** The width of the image in CSS pixels: one row of 35 days and the margins */
export const IMAGE_WIDTH = PAD * 2 + PRINT_ROW_DAYS * COL;
/** Two image pixels for each CSS pixel, for a sharp print */
export const IMAGE_SCALE = 2;
/** The largest canvas area that Safari on iOS draws */
export const MAX_CANVAS_PIXELS = 16_000_000;

/** One drawing step of the image, in CSS pixels */
export type DrawOp =
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      radius: number;
      fill?: string;
      stroke?: string;
      dashed?: boolean;
    }
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      font: string;
      color: string;
      align: CanvasTextAlign;
      maxWidth?: number;
    }
  | { kind: 'circle'; x: number; y: number; r: number; fill: string }
  | { kind: 'baby'; x: number; y: number; size: number; color: string };

export interface ChartImageLayout {
  width: number;
  height: number;
  ops: DrawOp[];
}

/** Gives the width of a text in a font, in CSS pixels */
export type MeasureText = (text: string, font: string) => number;

interface StampMarks {
  stamp: StampType;
  isEmpty?: boolean | undefined;
  isPeakDay?: boolean | undefined;
  intercourse?: boolean | undefined;
}

const mark = (x: number, y: number, r: number, fill: string, letter: string): DrawOp[] => [
  { kind: 'circle', x, y, r, fill },
  {
    kind: 'text',
    x,
    y: y + r * 0.45,
    text: letter,
    font: font(Math.round(r * 1.3), 800),
    color: IMAGE_COLORS.paper,
    align: 'center',
  },
];

/** The stamp of a day, with its marks, in a square of `size` pixels at x, y */
function stampOps(x: number, y: number, size: number, marks: StampMarks): DrawOp[] {
  const { stamp, isEmpty, isPeakDay, intercourse } = marks;
  const square = { kind: 'rect' as const, x, y, w: size, h: size, radius: size / 5 };
  const ops: DrawOp[] = [];
  if (isEmpty) {
    ops.push({ ...square, stroke: IMAGE_COLORS.empty, dashed: true });
  } else if (stamp === 'WHITE_BABY') {
    ops.push({ ...square, fill: IMAGE_COLORS.white, stroke: IMAGE_COLORS.whiteBorder });
    ops.push({ kind: 'baby', x, y, size, color: IMAGE_COLORS.whiteText });
  } else if (stamp.startsWith('LIGHT_GREEN')) {
    ops.push({ ...square, fill: IMAGE_COLORS.lightGreen });
    ops.push({ kind: 'baby', x, y, size, color: IMAGE_COLORS.lightGreenText });
    ops.push({
      kind: 'text',
      x: x + size - 2,
      y: y + size - 3,
      text: stamp.slice(-1),
      font: font(Math.round(size * 0.36), 800),
      color: IMAGE_COLORS.lightGreenText,
      align: 'right',
    });
  } else {
    const fills = { RED: IMAGE_COLORS.red, YELLOW: IMAGE_COLORS.yellow };
    ops.push({ ...square, fill: fills[stamp as keyof typeof fills] ?? IMAGE_COLORS.darkGreen });
  }
  if (intercourse) ops.push(...mark(x + 5, y + 5, 6, IMAGE_COLORS.ink, 'I'));
  if (isPeakDay) ops.push(...mark(x + size - 1, y + size - 1, 7, IMAGE_COLORS.peak, 'P'));
  return ops;
}

/** The short date of the cycle line, for example "Sep 30" */
const shortDate = (date: string, locale: string) =>
  formatDateDisplay(date, locale, { month: 'short', day: 'numeric' });

/**
 * The drawing of the chart image: the title, one 35-day grid for each cycle, from the oldest to
 * the newest, and the legend. It has the content of the print.
 */
export function layoutChartImage(
  cycles: PrintCycle[],
  t: TranslationSchema,
  exportDate: string,
  measure: MeasureText
): ChartImageLayout {
  const ops: DrawOp[] = [];
  const text = (
    x: number,
    y: number,
    value: string,
    textFont: string,
    color: string = IMAGE_COLORS.text,
    align: CanvasTextAlign = 'left'
  ) => ops.push({ kind: 'text', x, y, text: value, font: textFont, color, align });
  const right = IMAGE_WIDTH - PAD;
  let y = PAD;

  text(PAD, y + 20, t.printExport.title, font(22, 800));
  text(PAD, y + 42, t.printExport.subtitle, font(13), IMAGE_COLORS.muted);
  text(
    right,
    y + 18,
    formatMessage(t.printExport.exportDate, { date: exportDate }),
    font(12),
    IMAGE_COLORS.muted,
    'right'
  );
  text(
    right,
    y + 36,
    formatMessage(t.printExport.cyclesIncluded, { count: cycles.length }),
    font(12),
    IMAGE_COLORS.muted,
    'right'
  );
  y += 64;

  for (const { cycle, number } of cycles) {
    // The cycle line: the number, the dates, the length and the Peak Day
    const title = `${t.chartStrip.cycleBadge} ${number}`;
    const titleFont = font(15, 800);
    text(PAD, y + 16, title, titleFont);
    const end = getCycleEndDate(cycle);
    const days = cycle.observations.at(-1)?.cycleDay ?? 0;
    const details = `${shortDate(cycle.startDate, t.locale)} – ${shortDate(end, t.locale)} · ${formatMessage(t.chartStrip.cycleDays, { count: days })}`;
    const detailsX = PAD + measure(title, titleFont) + 10;
    text(detailsX, y + 16, details, font(13), IMAGE_COLORS.muted);
    const peakDay = cycle.observations.find(o => o.isPeakDay)?.cycleDay;
    if (peakDay) {
      const peakX = detailsX + measure(details, font(13)) + 10;
      text(
        peakX,
        y + 16,
        formatMessage(t.chartStrip.peakShort, { day: peakDay }),
        font(13, 700),
        IMAGE_COLORS.peak
      );
    }
    y += 26;

    for (const row of printRows(cycle)) {
      row.forEach(({ dayNum, obs, date }, i) => {
        const x = PAD + i * COL;
        const center = x + COL / 2;
        ops.push({ kind: 'rect', x, y, w: COL, h: CELL_H, radius: 0, stroke: IMAGE_COLORS.grid });
        text(center, y + 17, String(dayNum), font(13, 700), IMAGE_COLORS.text, 'center');
        const monthDay = formatMessage(t.common.monthDay, {
          month: date.slice(5, 7),
          day: date.slice(8, 10),
        });
        text(center, y + 31, monthDay, font(11), IMAGE_COLORS.muted, 'center');
        if (!obs) return;
        ops.push(
          ...stampOps(center - STAMP / 2, y + 38, STAMP, {
            stamp: obs.stamp,
            isEmpty: showsEmptyStamp(obs),
            isPeakDay: obs.isPeakDay,
            intercourse: obs.intercourse,
          })
        );
        ops.push({
          kind: 'text',
          x: center,
          y: y + 82,
          text: printCode(obs.codeString) || '---',
          font: font(11, 600, MONO),
          color: IMAGE_COLORS.text,
          align: 'center',
          maxWidth: COL - 4,
        });
      });
      y += CELL_H;
    }
    y += 20;
  }

  // The legend, on as many lines as it needs
  text(PAD, y + 14, t.chartStrip.legendTitle, font(13, 700));
  y += 28;
  const SAMPLE = 18;
  const legend: { label: string; draw: (x: number) => DrawOp[] }[] = [
    { label: t.chartStrip.legendMenses, draw: x => stampOps(x, y, SAMPLE, { stamp: 'RED' }) },
    { label: t.chartStrip.legendDry, draw: x => stampOps(x, y, SAMPLE, { stamp: 'DARK_GREEN' }) },
    {
      label: t.chartStrip.legendFertile,
      draw: x => stampOps(x, y, SAMPLE, { stamp: 'WHITE_BABY' }),
    },
    {
      label: t.chartStrip.legendPostPeak,
      draw: x => stampOps(x, y, SAMPLE, { stamp: 'LIGHT_GREEN_BABY_1' }),
    },
    {
      label: t.chartStrip.legendPeakDay,
      draw: x => mark(x + SAMPLE / 2, y + SAMPLE / 2, 8, IMAGE_COLORS.peak, 'P'),
    },
    {
      label: t.labels.intercourse,
      draw: x => mark(x + SAMPLE / 2, y + SAMPLE / 2, 8, IMAGE_COLORS.ink, 'I'),
    },
  ];
  let x = PAD;
  for (const item of legend) {
    const width = SAMPLE + 6 + measure(item.label, font(12));
    if (x > PAD && x + width > right) {
      x = PAD;
      y += 26;
    }
    ops.push(...item.draw(x));
    text(x + SAMPLE + 6, y + 13, item.label, font(12));
    x += width + 20;
  }
  y += SAMPLE + PAD;

  return { width: IMAGE_WIDTH, height: y, ops };
}

/** Adds a rectangle with round corners to the path. arcTo works in older browsers than roundRect. */
function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the layout on a canvas, with `scale` canvas pixels for each CSS pixel */
export function paintChartImage(
  ctx: CanvasRenderingContext2D,
  layout: ChartImageLayout,
  scale: number
) {
  ctx.scale(scale, scale);
  ctx.fillStyle = IMAGE_COLORS.paper;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.lineWidth = 1;
  for (const op of layout.ops) {
    switch (op.kind) {
      case 'rect':
        roundedPath(ctx, op.x + 0.5, op.y + 0.5, op.w - 1, op.h - 1, op.radius);
        if (op.fill) {
          ctx.fillStyle = op.fill;
          ctx.fill();
        }
        if (op.stroke) {
          ctx.setLineDash(op.dashed ? [3, 2] : []);
          ctx.strokeStyle = op.stroke;
          ctx.stroke();
        }
        break;
      case 'text':
        ctx.font = op.font;
        ctx.fillStyle = op.color;
        ctx.textAlign = op.align;
        ctx.fillText(op.text, op.x, op.y, op.maxWidth);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
        ctx.fillStyle = op.fill;
        ctx.fill();
        break;
      case 'baby': {
        // The figure of BabyIcon: a round head and a swaddled body
        const s = op.size;
        ctx.fillStyle = op.color;
        ctx.beginPath();
        ctx.arc(op.x + s * 0.5, op.y + s * 0.32, s * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(op.x + s * 0.5, op.y + s * 0.72, s * 0.24, s * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }
}

/** The scale of the canvas: two pixels for each CSS pixel, less for a very tall image */
export const imageScale = (layout: ChartImageLayout) =>
  Math.min(IMAGE_SCALE, Math.sqrt(MAX_CANVAS_PIXELS / (layout.width * layout.height)));

/**
 * Draws the cycles on a canvas and downloads the PNG file. It returns false when the browser
 * cannot make the image.
 */
export async function downloadChartPng(
  cycles: PrintCycle[],
  t: TranslationSchema,
  fileDetail: string
): Promise<boolean> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const measure: MeasureText = (value, textFont) => {
    ctx.font = textFont;
    return ctx.measureText(value).width;
  };
  const layout = layoutChartImage(cycles, t, new Date().toLocaleDateString(t.locale), measure);
  const scale = imageScale(layout);
  // A new size clears the canvas and its state, so the size comes before the drawing
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  paintChartImage(ctx, layout, scale);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;
  downloadBlob(blob, getExportFilename('png', fileDetail));
  return true;
}
