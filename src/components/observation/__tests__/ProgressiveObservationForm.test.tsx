import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressiveObservationForm } from '../ProgressiveObservationForm';
import { useObservationForm } from '../../../hooks/useObservationForm';
import { renderWithProviders } from '../../../test/render';
import { en } from '../../../i18n';

const Harness = ({
  directOnly = false,
  onTypingChange,
}: {
  directOnly?: boolean;
  onTypingChange?: (typing: boolean) => void;
}) => {
  const form = useObservationForm();
  return (
    <ProgressiveObservationForm
      form={form}
      directOnly={directOnly}
      idPrefix="t"
      onTypingChange={onTypingChange}
    />
  );
};

const row = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });
const codeField = () => screen.getByLabelText(en.labels.directInput);

describe('ProgressiveObservationForm', () => {
  it('starts with each group closed and shows None', () => {
    renderWithProviders(<Harness />);
    for (const label of Object.values(en.observationForm.groups)) {
      expect(row(label)).toHaveAttribute('aria-expanded', 'false');
      expect(row(label)).toHaveTextContent(en.observationForm.none);
    }
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('opens one group at a time and closes it on a second tap', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(row(en.observationForm.groups.bleeding));
    expect(row(en.observationForm.groups.bleeding)).toHaveAttribute('aria-expanded', 'true');
    expect(row(en.observationForm.groups.bleeding)).toHaveAttribute(
      'aria-controls',
      't-group-bleeding'
    );
    fireEvent.click(row(en.observationForm.groups.stretch));
    expect(row(en.observationForm.groups.bleeding)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
    fireEvent.click(row(en.observationForm.groups.stretch));
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('moves the focus to the first chip, or to the selected chip', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(row(en.observationForm.groups.stretch));
    expect(screen.getByRole('radio', { name: en.codes.stretch['0'] })).toHaveFocus();
    fireEvent.click(screen.getByRole('radio', { name: en.codes.stretch['10'] }));
    fireEvent.click(row(en.observationForm.groups.stretch));
    fireEvent.click(row(en.observationForm.groups.stretch));
    expect(screen.getByRole('radio', { name: en.codes.stretch['10'] })).toHaveFocus();
  });

  it('selects a code, shows its full name and the short value of the row', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(row(en.observationForm.groups.stretch));
    const chip = screen.getByRole('radio', { name: en.codes.stretch['10'] });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-checked', 'true');
    expect(codeField()).toHaveValue('10');
    expect(
      screen.getByText(en.codes.stretch['10'], { selector: '.obs-chip-name' })
    ).toBeInTheDocument();
    expect(row(en.observationForm.groups.stretch)).toHaveTextContent(
      `10 - ${en.observationForm.shortNames.stretch['10']}`
    );
    // A second tap clears the code
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-checked', 'false');
    expect(codeField()).toHaveValue('');
  });

  it('moves the selection with the arrow keys in a radio group', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(row(en.observationForm.groups.frequency));
    const group = screen.getByRole('radiogroup', { name: en.observationForm.groups.frequency });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map(r => r.tabIndex)).toEqual([0, ...radios.slice(1).map(() => -1)]);
    fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveFocus();
    fireEvent.keyDown(radios[1]!, { key: 'ArrowLeft' });
    fireEvent.keyDown(radios[0]!, { key: 'ArrowUp' });
    expect(radios.at(-1)).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(radios.at(-1)!, { key: 'ArrowDown' });
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    // Another key does nothing
    fireEvent.keyDown(radios[0]!, { key: 'Enter' });
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles more values in the appearance and symptom groups', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(row(en.observationForm.groups.stretch));
    fireEvent.click(screen.getByRole('radio', { name: en.codes.stretch['10'] }));
    fireEvent.click(row(en.observationForm.groups.modifiers));
    fireEvent.click(screen.getByRole('button', { name: en.codes.modifiers.K }));
    fireEvent.click(screen.getByRole('button', { name: en.codes.modifiers.L }));
    expect(screen.getByRole('button', { name: en.codes.modifiers.K })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(row(en.observationForm.groups.modifiers)).toHaveTextContent('K, L - ');
    fireEvent.click(row(en.observationForm.groups.symptoms));
    fireEvent.click(screen.getByRole('button', { name: en.codes.symptoms.AP }));
    fireEvent.click(screen.getByRole('button', { name: en.codes.symptoms.AP }));
    fireEvent.click(screen.getByRole('button', { name: en.codes.symptoms.AP }));
    fireEvent.click(row(en.observationForm.groups.frequency));
    fireEvent.click(screen.getByRole('radio', { name: en.codes.frequency.X3 }));
    fireEvent.click(row(en.observationForm.groups.bleeding));
    fireEvent.click(screen.getByRole('radio', { name: en.codes.bleeding.L }));
    expect(codeField()).toHaveValue('L 10KLX3 AP');
  });

  it('shows the cycle start choice only when a bleeding code is set', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(row(en.observationForm.groups.bleeding));
    expect(screen.queryByRole('button', { name: en.cycleStartModal.isCycleStartLabel })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: en.codes.bleeding.M }));
    fireEvent.click(screen.getByRole('button', { name: en.cycleStartModal.isCycleStartLabel }));
    expect(
      screen.getByRole('button', { name: `${en.cycleStartModal.isCycleStartLabel} (Yes)` })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('turns the intercourse and Peak Day switches on and off', () => {
    renderWithProviders(<Harness />);
    const intercourse = screen.getByRole('switch', { name: en.codes.intercourse.I });
    const peak = screen.getByRole('switch', { name: en.actions.setPeak });
    fireEvent.click(intercourse);
    fireEvent.click(peak);
    expect(intercourse).toHaveAttribute('aria-checked', 'true');
    expect(peak).toHaveAttribute('aria-checked', 'true');
    expect(codeField()).toHaveValue('I');
    fireEvent.click(peak);
    expect(peak).toHaveAttribute('aria-checked', 'false');
  });

  it('opens the notes in place and shows them in the closed row', () => {
    const onTypingChange = vi.fn();
    renderWithProviders(<Harness onTypingChange={onTypingChange} />);
    fireEvent.click(row(en.observationForm.notes));
    const notes = screen.getByLabelText(en.labels.notes);
    expect(notes).toHaveFocus();
    expect(onTypingChange).toHaveBeenLastCalledWith(true);
    fireEvent.change(notes, { target: { value: ' tired ' } });
    fireEvent.blur(notes);
    expect(onTypingChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(row(en.observationForm.notes));
    expect(row(en.observationForm.notes)).toHaveTextContent('tired');
  });

  it('shows Done and the parse of the code while the code field has the focus', () => {
    const onTypingChange = vi.fn();
    renderWithProviders(<Harness onTypingChange={onTypingChange} />);
    expect(screen.queryByRole('button', { name: en.observationForm.done })).toBeNull();
    fireEvent.focus(codeField());
    expect(onTypingChange).toHaveBeenLastCalledWith(true);
    fireEvent.change(codeField(), { target: { value: '10kx3' } });
    const parse = screen.getByRole('list', { name: en.observationForm.readAs });
    expect(
      within(parse)
        .getAllByRole('listitem')
        .map(li => li.textContent)
    ).toEqual([
      `10 ${en.observationForm.shortNames.stretch['10']}`,
      `K ${en.observationForm.shortNames.modifiers.K}`,
      `X3 ${en.observationForm.shortNames.frequency.X3}`,
    ]);
    const done = screen.getByRole('button', { name: en.observationForm.done });
    const down = new Event('pointerdown', { bubbles: true, cancelable: true });
    done.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    codeField().focus();
    fireEvent.click(done);
    expect(codeField()).not.toHaveFocus();
    expect(onTypingChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('list', { name: en.observationForm.readAs })).toBeNull();
  });

  it('works without a typing callback', () => {
    renderWithProviders(<Harness />);
    fireEvent.focus(codeField());
    fireEvent.blur(codeField());
    expect(codeField()).toBeInTheDocument();
  });

  it('hides the group rows and keeps the parse in Direct Code Only', () => {
    renderWithProviders(<Harness directOnly />);
    expect(screen.queryByRole('button', { name: /^Bleeding/ })).toBeNull();
    expect(screen.getByRole('switch', { name: en.actions.setPeak })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(`^${en.observationForm.notes}`) })
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: en.observationForm.readAs })).toBeNull();
    fireEvent.change(codeField(), { target: { value: 'H' } });
    expect(screen.getByRole('list', { name: en.observationForm.readAs })).toHaveTextContent('H');
  });
});
