import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useObservationForm } from '../useObservationForm';
import { EMPTY_FIELDS } from '../../domain/observationForm';
import { makeObservation } from '../../test/factories';

const setup = () => renderHook(() => useObservationForm()).result;

describe('useObservationForm', () => {
  it('starts empty', () => {
    const form = setup();
    expect(form.current.fields).toEqual(EMPTY_FIELDS);
    expect(form.current.directInputText).toBe('');
    expect(form.current.currentCode).toBe('');
    expect(form.current.calculatedStamp).toBe('DARK_GREEN');
  });

  it('loads a saved observation and resets to empty', () => {
    const form = setup();
    act(() =>
      form.current.load(
        makeObservation({ date: '2026-09-02', stretch: '10', modifiers: ['K'], codeString: '10K' })
      )
    );
    expect(form.current.fields.stretch).toBe('10');
    expect(form.current.directInputText).toBe('10K');
    expect(form.current.calculatedStamp).toBe('WHITE_BABY');

    act(() => form.current.load(undefined));
    expect(form.current.fields).toEqual(EMPTY_FIELDS);
    expect(form.current.directInputText).toBe('');
  });

  it('parses the direct code into the fields and keeps the typed text', () => {
    const form = setup();
    act(() => form.current.setDirectText('h ap'));
    expect(form.current.directInputText).toBe('h ap');
    expect(form.current.fields).toMatchObject({ bleeding: 'H', symptoms: ['AP'] });
    expect(form.current.currentCode).toBe('H AP');
  });

  it('rewrites the direct code when a code field changes', () => {
    const form = setup();
    act(() => form.current.selectStretch('10'));
    act(() => form.current.toggleModifier('K'));
    act(() => form.current.toggleModifier('L'));
    act(() => form.current.selectFrequency('X3'));
    act(() => form.current.toggleSymptom('AP'));
    act(() => form.current.toggleIntercourse());
    act(() => form.current.selectBleeding('B'));
    expect(form.current.directInputText).toBe('B 10KLX3 I AP');

    act(() => form.current.toggleModifier('K'));
    act(() => form.current.toggleSymptom('AP'));
    act(() => form.current.toggleIntercourse());
    act(() => form.current.selectBleeding(undefined));
    act(() => form.current.selectFrequency(undefined));
    act(() => form.current.selectStretch(undefined));
    expect(form.current.fields).toMatchObject({
      modifiers: ['L'],
      symptoms: [],
      intercourse: false,
    });
    expect(form.current.directInputText).toBe('-L');
  });

  it('keeps the direct code when notes, peak or cycle start change', () => {
    const form = setup();
    act(() => form.current.setDirectText('10kl'));
    act(() => form.current.setNotes('travel'));
    act(() => form.current.toggleManualPeak());
    act(() => form.current.toggleCycleStart());
    expect(form.current.directInputText).toBe('10kl');
    expect(form.current.fields).toMatchObject({
      notes: 'travel',
      isManualPeak: true,
      isCycleStart: true,
    });

    act(() => form.current.toggleManualPeak());
    act(() => form.current.toggleCycleStart());
    act(() => form.current.setCycleStart(true));
    expect(form.current.fields).toMatchObject({ isManualPeak: false, isCycleStart: true });
  });

  it('builds the payload to save', () => {
    const form = setup();
    act(() => form.current.setDirectText('H I'));
    expect(form.current.toInput('2026-09-02', 'obs_1', false)).toEqual({
      ...form.current.fields,
      id: 'obs_1',
      date: '2026-09-02',
      isCycleStart: false,
      codeString: 'H I',
    });
  });
});
