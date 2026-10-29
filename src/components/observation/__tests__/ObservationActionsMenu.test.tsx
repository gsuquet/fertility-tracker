import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObservationActionsMenu } from '../ObservationActionsMenu';
import { renderWithProviders } from '../../../test/render';
import { en } from '../../../i18n';

const renderMenu = (props: Partial<React.ComponentProps<typeof ObservationActionsMenu>> = {}) => {
  const actions = { onCopyYesterday: vi.fn(), onToggleDirectOnly: vi.fn(), onDelete: vi.fn() };
  renderWithProviders(
    <ObservationActionsMenu yesterdayCode="10KL" directOnly={false} {...actions} {...props} />
  );
  const button = screen.getByRole('button', { name: en.observationForm.actionsLabel });
  fireEvent.click(button);
  return { actions, button };
};

const item = (name: string | RegExp) => screen.getByRole('menuitem', { name });

describe('ObservationActionsMenu', () => {
  it('opens a menu under its button and closes on Escape', () => {
    const { button } = renderMenu();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: en.observationForm.actionsLabel })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('runs an item and closes the menu', () => {
    const { actions } = renderMenu();
    expect(item(new RegExp(en.observationForm.copyYesterday))).toHaveTextContent('10KL');
    fireEvent.click(item(new RegExp(en.observationForm.copyYesterday)));
    expect(actions.onCopyYesterday).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: en.observationForm.actionsLabel }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect }));
    expect(actions.onToggleDirectOnly).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: en.observationForm.actionsLabel }));
    fireEvent.click(item(en.observationForm.deleteObservation));
    expect(actions.onDelete).toHaveBeenCalledOnce();
  });

  it('checks Direct Code Only, disables Copy yesterday and has no Delete for a new day', () => {
    renderMenu({ yesterdayCode: null, directOnly: true, onDelete: undefined });
    expect(item(en.observationForm.copyYesterday)).toBeDisabled();
    expect(screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(
      screen.queryByRole('menuitem', { name: en.observationForm.deleteObservation })
    ).toBeNull();
  });

  it('moves between the enabled items with the arrow keys', () => {
    renderMenu({ yesterdayCode: null });
    const menu = screen.getByRole('menu');
    const direct = screen.getByRole('menuitemcheckbox', { name: en.todayView.modeDirect });
    const remove = item(en.observationForm.deleteObservation);
    direct.focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(remove).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(direct).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(remove).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'a' });
    expect(remove).toHaveFocus();
  });

  it('closes on Tab, as a native menu does', () => {
    renderMenu();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
