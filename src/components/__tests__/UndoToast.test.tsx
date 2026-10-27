import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UndoToast } from '../UndoToast';
import { useCycleData } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en, fr } from '../../i18n';

const UNDO_KEY = 'fertility_care_observations_undo';
const saved = [makeObservation({ date: '2026-06-01', bleeding: 'H' })];

/** Gives the test buttons for the replacing actions and shows the number of observations. */
const Actions = () => {
  const { observations, loadDemoData, importDataJson, clearAllData, saveObservation } =
    useCycleData();
  return (
    <>
      <span data-testid="count">{observations.length}</span>
      <button type="button" onClick={loadDemoData}>
        demo
      </button>
      <button type="button" onClick={() => importDataJson('[]')}>
        import
      </button>
      <button type="button" onClick={() => importDataJson('[]', 'merge')}>
        merge
      </button>
      <button type="button" onClick={clearAllData}>
        clear
      </button>
      <button type="button" onClick={() => saveObservation({ date: '2026-06-05', stretch: '0' })}>
        save
      </button>
    </>
  );
};

const renderToast = (language: 'en' | 'fr' = 'en') =>
  renderWithProviders(
    <>
      <Actions />
      <UndoToast />
    </>,
    { language, observations: saved }
  );

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('UndoToast', () => {
  it('renders nothing when there is nothing to undo', () => {
    renderToast();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('tells what changed for each replacing action', () => {
    renderToast();
    click('demo');
    expect(screen.getByRole('status')).toHaveTextContent(en.undoToast.demo);
    click('import');
    expect(screen.getByRole('status')).toHaveTextContent(en.undoToast.import);
    click('merge');
    expect(screen.getByRole('status')).toHaveTextContent(en.undoToast.merge);
    click('clear');
    expect(screen.getByRole('status')).toHaveTextContent(en.undoToast.clear);
  });

  it('restores the previous observations on Undo', () => {
    renderToast();
    click('clear');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    click(en.undoToast.undo);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps the change and deletes the copy on dismiss', () => {
    renderToast();
    click('clear');
    click(en.undoToast.dismiss);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.queryByRole('status')).toBeNull();
    expect(localStorage.getItem(UNDO_KEY)).toBeNull();
  });

  it('offers the copy from an earlier session, in French', () => {
    localStorage.setItem(UNDO_KEY, JSON.stringify(saved));
    renderToast('fr');
    expect(screen.getByRole('status')).toHaveTextContent(fr.undoToast.earlier);
    expect(screen.getByRole('button', { name: fr.undoToast.undo })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.undoToast.dismiss })).toBeInTheDocument();
  });
  it('closes when an observation is saved after the change', () => {
    renderToast();
    click('clear');
    click('save');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('warns when the copy could not be saved in the browser', () => {
    const setItem = localStorage.setItem.bind(localStorage);
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === UNDO_KEY) throw new Error('QuotaExceededError');
      setItem(key, value);
    });
    try {
      renderToast();
      click('clear');
      expect(screen.getByRole('status')).toHaveTextContent(en.undoToast.notSaved);
    } finally {
      spy.mockRestore();
    }
  });

  it('does not warn when the copy is saved', () => {
    renderToast('fr');
    click('clear');
    expect(screen.getByRole('status')).not.toHaveTextContent(fr.undoToast.notSaved);
  });
});
