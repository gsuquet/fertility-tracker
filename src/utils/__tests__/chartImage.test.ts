import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en, fr } from '../../i18n';
import { makeObservation } from '../../test/factories';
import type { Cycle } from '../../types/crms';
import type { ChartImageLayout, DrawOp } from '../chartImage';
import {
  IMAGE_COLORS,
  IMAGE_SCALE,
  IMAGE_WIDTH,
  MAX_CANVAS_PIXELS,
  downloadChartPng,
  imageScale,
  layoutChartImage,
  paintChartImage,
} from '../chartImage';
import { getTodayStr } from '../dateUtils';
import { selectPrintCycles } from '../printCycles';

const cycle: Cycle = {
  id: 'c1',
  startDate: '2026-09-01',
  observations: [
    makeObservation({ date: '2026-09-01', cycleDay: 1, stamp: 'RED', codeString: 'H' }),
    makeObservation({ date: '2026-09-02', cycleDay: 2, stamp: 'DARK_GREEN', codeString: '' }),
    makeObservation({ date: '2026-09-03', cycleDay: 3, stamp: 'YELLOW', codeString: '6C X1' }),
    makeObservation({
      date: '2026-09-04',
      cycleDay: 4,
      stamp: 'WHITE_BABY',
      codeString: '10KL AD AP',
      isPeakDay: true,
      intercourse: true,
    }),
    makeObservation({
      date: '2026-09-05',
      cycleDay: 5,
      stamp: 'LIGHT_GREEN_BABY_1',
      codeString: '0AD',
    }),
    makeObservation({
      date: '2026-09-06',
      cycleDay: 6,
      stamp: 'DARK_GREEN',
      stretch: '0',
      codeString: '0AD',
    }),
  ],
};

const measure = (text: string) => text.length * 7;
const layout = (cycles: Cycle[], t = en) =>
  layoutChartImage(selectPrintCycles(cycles, ['all'], '2026-10-01'), t, '10/1/2026', measure);
const texts = (l: ChartImageLayout) => l.ops.flatMap(op => (op.kind === 'text' ? [op.text] : []));
const ofKind = <K extends DrawOp['kind']>(l: ChartImageLayout, kind: K) =>
  l.ops.filter((op): op is Extract<DrawOp, { kind: K }> => op.kind === kind);

describe('layoutChartImage', () => {
  it('has the title, the export date, the cycle line and the legend of the print', () => {
    const image = layout([cycle]);
    expect(image.width).toBe(IMAGE_WIDTH);
    expect(IMAGE_WIDTH).toBe(24 * 2 + 35 * 44);
    expect(texts(image)).toEqual(
      expect.arrayContaining([
        en.printExport.title,
        en.printExport.subtitle,
        expect.stringContaining('10/1/2026'),
        `${en.chartStrip.cycleBadge} 1`,
        'Sep 1 – Sep 6 · 6 days',
        'P Day 4',
        en.chartStrip.legendTitle,
        en.chartStrip.legendMenses,
        en.chartStrip.legendDry,
        en.chartStrip.legendFertile,
        en.chartStrip.legendPostPeak,
        en.chartStrip.legendPeakDay,
        en.labels.intercourse,
      ])
    );
  });

  it('draws 35 cells with the day and the date, and a stamp and a code for each observation', () => {
    const image = layout([cycle]);
    const cells = ofKind(image, 'rect').filter(r => r.w === 44);
    expect(cells).toHaveLength(35);
    const all = texts(image);
    expect(all).toContain('35');
    expect(all).toContain('10-05');
    // No spaces and no AP mark in the codes; an empty day shows ---
    expect(all).toEqual(expect.arrayContaining(['H', '---', '6CX1', '10KLAD', '0AD']));
  });

  it('draws each stamp in the color of the light theme', () => {
    const stamps = ofKind(layout([cycle]), 'rect').filter(r => r.w === 28);
    expect(stamps.map(s => s.fill)).toEqual([
      IMAGE_COLORS.red,
      undefined,
      IMAGE_COLORS.yellow,
      IMAGE_COLORS.white,
      IMAGE_COLORS.lightGreen,
      IMAGE_COLORS.darkGreen,
    ]);
    // A day without a code has a dashed empty square, as on the chart
    expect(stamps[1]).toMatchObject({ stroke: IMAGE_COLORS.empty, dashed: true });
    expect(stamps[3]).toMatchObject({ stroke: IMAGE_COLORS.whiteBorder });
  });

  it('draws the baby, the post-peak number and the P and I marks', () => {
    const image = layout([cycle]);
    // The white and the light green day stamps, and their two legend samples
    expect(ofKind(image, 'baby')).toHaveLength(4);
    expect(texts(image).filter(text => text === '1')).toHaveLength(3);
    const circles = ofKind(image, 'circle').map(c => c.fill);
    // The day marks and the two legend marks
    expect(circles.filter(fill => fill === IMAGE_COLORS.peak)).toHaveLength(2);
    expect(circles.filter(fill => fill === IMAGE_COLORS.ink)).toHaveLength(2);
  });

  it('draws one empty cycle that starts today without cycles, and no Peak Day', () => {
    const image = layout([]);
    const all = texts(image);
    expect(all).toContain('Oct 1 – Oct 1 · 0 days');
    expect(all.some(text => text.startsWith('P Day'))).toBe(false);
    expect(ofKind(image, 'rect').filter(r => r.w === 28)).toHaveLength(0);
  });

  it('adds a row for a long cycle and a cycle line for each cycle', () => {
    const long: Cycle = {
      id: 'c2',
      startDate: '2026-10-01',
      observations: [makeObservation({ date: '2026-11-06', cycleDay: 37 })],
    };
    const one = layout([cycle]);
    const two = layout([long, cycle]);
    expect(ofKind(two, 'rect').filter(r => r.w === 44)).toHaveLength(35 * 3);
    expect(texts(two)).toContain(`${en.chartStrip.cycleBadge} 2`);
    expect(two.height).toBeGreaterThan(one.height + 2 * 92);
  });

  it('puts the legend on more lines when the labels are long', () => {
    const narrow = layoutChartImage(
      selectPrintCycles([cycle], ['all'], '2026-10-01'),
      en,
      '10/1/2026',
      text => text.length * 60
    );
    const labelY = (label: string) =>
      ofKind(narrow, 'text').find(op => op.text === label)?.y as number;
    expect(labelY(en.chartStrip.legendDry)).toBeGreaterThan(labelY(en.chartStrip.legendMenses));
  });

  it('uses the language of the interface', () => {
    const all = texts(layout([cycle], fr));
    expect(all).toContain(fr.printExport.title);
    expect(all).toContain('01/09');
    expect(all).toContain(fr.chartStrip.legendTitle);
  });
});

describe('IMAGE_COLORS', () => {
  it('has the light theme values of the tokens', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/tokens/tokens.css'), 'utf8');
    const light = css.slice(css.indexOf(':root {'), css.indexOf("[data-theme='dark']"));
    const tokens: Record<string, keyof typeof IMAGE_COLORS> = {
      '--text-primary': 'text',
      '--text-muted': 'muted',
      '--bg-surface-border': 'grid',
      '--stamp-red': 'red',
      '--stamp-dark-green': 'darkGreen',
      '--stamp-white': 'white',
      '--stamp-white-border': 'whiteBorder',
      '--stamp-white-text': 'whiteText',
      '--stamp-light-green': 'lightGreen',
      '--stamp-light-green-text': 'lightGreenText',
      '--stamp-yellow': 'yellow',
      '--stamp-empty': 'empty',
      '--color-peak': 'peak',
      '--brand-ink': 'ink',
    };
    for (const [token, key] of Object.entries(tokens)) {
      expect(light, token).toContain(`${token}: ${IMAGE_COLORS[key]};`);
    }
  });
});

/** A canvas context that records the calls */
const fakeContext = () => {
  const calls: string[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(`${name}(${args.join(',')})`);
    };
  const ctx = {
    calls,
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'left',
    scale: record('scale'),
    fillRect: record('fillRect'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    arcTo: record('arcTo'),
    closePath: record('closePath'),
    fill: record('fill'),
    stroke: record('stroke'),
    setLineDash: record('setLineDash'),
    fillText: record('fillText'),
    arc: record('arc'),
    ellipse: record('ellipse'),
    measureText: (text: string) => ({ width: text.length * 7 }),
  };
  return ctx;
};

describe('paintChartImage', () => {
  it('scales the canvas, paints the paper and draws each step', () => {
    const ctx = fakeContext();
    const image: ChartImageLayout = {
      width: 100,
      height: 50,
      ops: [
        { kind: 'rect', x: 0, y: 0, w: 10, h: 10, radius: 2, fill: '#111' },
        { kind: 'rect', x: 0, y: 0, w: 10, h: 10, radius: 2, stroke: '#222', dashed: true },
        { kind: 'rect', x: 0, y: 0, w: 10, h: 10, radius: 0, stroke: '#333' },
        { kind: 'text', x: 5, y: 5, text: 'Hi', font: '12px a', color: '#444', align: 'center' },
        { kind: 'circle', x: 5, y: 5, r: 3, fill: '#555' },
        { kind: 'baby', x: 0, y: 0, size: 20, color: '#666' },
      ],
    };
    paintChartImage(ctx as unknown as CanvasRenderingContext2D, image, 2);
    expect(ctx.calls[0]).toBe('scale(2,2)');
    expect(ctx.calls[1]).toBe('fillRect(0,0,100,50)');
    expect(ctx.calls).toContain('setLineDash(3,2)');
    expect(ctx.calls).toContain('setLineDash()');
    expect(ctx.calls).toContain('fillText(Hi,5,5,)');
    expect(ctx.calls.filter(call => call.startsWith('stroke('))).toHaveLength(2);
    expect(ctx.calls.filter(call => call.startsWith('ellipse('))).toHaveLength(1);
    expect(ctx.fillStyle).toBe('#666');
    expect(ctx.textAlign).toBe('center');
  });
});

describe('imageScale', () => {
  it('uses two pixels for each CSS pixel, and less for a very tall image', () => {
    expect(imageScale({ width: IMAGE_WIDTH, height: 1000, ops: [] })).toBe(IMAGE_SCALE);
    const tall = { width: IMAGE_WIDTH, height: 10_000, ops: [] };
    const scale = imageScale(tall);
    expect(scale).toBeLessThan(IMAGE_SCALE);
    expect(tall.width * scale * tall.height * scale).toBeCloseTo(MAX_CANVAS_PIXELS, -2);
  });
});

describe('downloadChartPng', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const cycles = () => selectPrintCycles([cycle], ['all'], getTodayStr());

  it('draws the cycles and downloads a PNG file with the print file name', async () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    );
    let size = [0, 0];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback
    ) {
      size = [this.width, this.height];
      callback(new Blob(['png'], { type: 'image/png' }));
    });
    const createUrl = vi.fn(() => 'blob:chart');
    const revokeUrl = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    let downloaded = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloaded = this.download;
    });

    await expect(downloadChartPng(cycles(), en, 'cycle-1')).resolves.toBe(true);
    expect(downloaded).toBe(`fertility-tracker-chart-cycle-1-${getTodayStr()}.png`);
    expect(size[0]).toBe(IMAGE_WIDTH * IMAGE_SCALE);
    expect(size[1]).toBeGreaterThan(0);
    expect(ctx.calls).toContain(`scale(${IMAGE_SCALE},${IMAGE_SCALE})`);
    expect(revokeUrl).toHaveBeenCalledWith('blob:chart');
    vi.unstubAllGlobals();
  });

  it('returns false when the browser has no 2D canvas', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(downloadChartPng(cycles(), en, 'cycle-1')).resolves.toBe(false);
  });

  it('returns false when the browser cannot make the PNG', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      fakeContext() as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(null));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    await expect(downloadChartPng(cycles(), en, 'cycle-1')).resolves.toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
});
