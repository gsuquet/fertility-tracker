import type React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';
import { CycleStartModal } from '../CycleStartModal';
import { ExportModal } from '../ExportModal';
import { InstallGuideModal } from '../InstallGuideModal';
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal';
import { VersionModal } from '../VersionModal';
import { WelcomeModal } from '../WelcomeModal';
import { renderWithProviders } from '../../test/render';

/** Each dialog that is a bottom sheet on a phone, with the function that its close calls. */
const dialogs: [string, (onClose: () => void) => React.ReactElement][] = [
  [
    'export',
    onClose => <ExportModal onClose={onClose} onPreparePrint={vi.fn()} onImageDone={vi.fn()} />,
  ],
  ['version', onClose => <VersionModal onClose={onClose} />],
  ['welcome guide', onClose => <WelcomeModal onClose={onClose} />],
  [
    'confirm',
    onClose => (
      <ConfirmDialog title="Sure?" actions={[]} onCancel={onClose}>
        Text
      </ConfirmDialog>
    ),
  ],
  ['install guide', onClose => <InstallGuideModal onClose={onClose} />],
  ['keyboard shortcuts', onClose => <KeyboardShortcutsModal onClose={onClose} />],
  [
    'new cycle start',
    onClose => <CycleStartModal isOpen date="2026-10-27" onConfirm={vi.fn()} onCancel={onClose} />,
  ],
];

const nativeCapture = Element.prototype.setPointerCapture;

beforeEach(() => {
  // A phone that prefers reduced motion: the sheet closes at the release
  vi.mocked(window.matchMedia).mockImplementation(
    query => ({ matches: true, media: query }) as MediaQueryList
  );
  // jsdom has no pointer capture
  Element.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  vi.mocked(window.matchMedia).mockImplementation(
    query => ({ matches: false, media: query }) as MediaQueryList
  );
  Element.prototype.setPointerCapture = nativeCapture;
});

/** Drags the element down by 600 pixels and releases it. */
const dragDown = (element: Element) => {
  fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientY: 100 });
  fireEvent.pointerMove(element, { pointerId: 1, clientY: 700 });
  fireEvent.pointerUp(element, { pointerId: 1, clientY: 700 });
};

describe.each(dialogs)('The %s dialog on a phone', (_name, render) => {
  it('closes with a drag down on its grab handle', () => {
    const onClose = vi.fn();
    renderWithProviders(render(onClose));
    const handle = screen.getByRole('dialog').querySelector('.sheet-handle') as HTMLElement;
    expect(handle).toHaveAttribute('aria-hidden', 'true');
    dragDown(handle);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes with a drag down on its header', () => {
    const onClose = vi.fn();
    renderWithProviders(render(onClose));
    const header = (screen.getByRole('dialog').querySelector('.sheet-handle') as HTMLElement)
      .nextElementSibling as HTMLElement;
    dragDown(header);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
