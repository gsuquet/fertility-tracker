import { describe, it, expect } from 'vitest';
import { translations, supportedLanguages } from '../index';
import { en } from '../locales/en';
import { fr } from '../locales/fr';

describe('i18n Translation Modules & Schema Parity', () => {
  it('supports en and fr languages', () => {
    expect(supportedLanguages).toContain('en');
    expect(supportedLanguages).toContain('fr');
    expect(translations.en).toBeDefined();
    expect(translations.fr).toBeDefined();
  });

  it('verifies that fr has key parity with en', () => {
    const enKeys = Object.keys(en);
    const frKeys = Object.keys(fr);
    expect(frKeys).toEqual(enKeys);

    // Deep check sub-objects
    expect(Object.keys(fr.tabs)).toEqual(Object.keys(en.tabs));
    expect(Object.keys(fr.todayView)).toEqual(Object.keys(en.todayView));
    expect(Object.keys(fr.actions)).toEqual(Object.keys(en.actions));
    expect(Object.keys(fr.labels)).toEqual(Object.keys(en.labels));
    expect(Object.keys(fr.codes.bleeding)).toEqual(Object.keys(en.codes.bleeding));
    expect(Object.keys(fr.codes.stretch)).toEqual(Object.keys(en.codes.stretch));
    expect(Object.keys(fr.codes.modifiers)).toEqual(Object.keys(en.codes.modifiers));
    expect(Object.keys(fr.codes.frequency)).toEqual(Object.keys(en.codes.frequency));
    expect(Object.keys(fr.codes.symptoms)).toEqual(Object.keys(en.codes.symptoms));
    expect(Object.keys(fr.stats)).toEqual(Object.keys(en.stats));
    expect(Object.keys(fr.analytics)).toEqual(Object.keys(en.analytics));
    expect(Object.keys(fr.chartStrip)).toEqual(Object.keys(en.chartStrip));
    expect(Object.keys(fr.exportModal)).toEqual(Object.keys(en.exportModal));
    expect(Object.keys(fr.versionTracker)).toEqual(Object.keys(en.versionTracker));
    expect(Object.keys(fr.welcomeModal)).toEqual(Object.keys(en.welcomeModal));
    expect(Object.keys(fr.cycleStartModal)).toEqual(Object.keys(en.cycleStartModal));
  });
});
