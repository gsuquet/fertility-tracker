import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WelcomeModal } from '../WelcomeModal';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider, useCycleData } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { createVault } from '../../sync/deviceVault';
import { createMemoryKeyStore, createRelayHarness } from '../../test/relayHarness';
import { controlOf } from '../../test/syncControl';

const ObservationCount = () => (
  <span data-testid="count">{useCycleData().observations.length}</span>
);

describe('WelcomeModal Component', () => {
  it('renders slide 1 title and step indicators', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to Fertility Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinical Charting, Privacy First/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
  });

  it('navigates through slides when Next and Previous buttons are clicked', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Understanding Chart Stamps/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /Previous/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText(/Clinical Charting, Privacy First/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
  });

  it('navigates directly to a step when step dot is clicked', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    const step3Dot = screen.getByTitle('Go to step 3');
    fireEvent.click(step3Dot);

    expect(screen.getByText(/How to Log Observations/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
  });

  it('calls onClose and sets localStorage when close or Skip is clicked', () => {
    const handleClose = vi.fn();
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal onClose={handleClose} />
        </CycleProvider>
      </LanguageProvider>
    );

    const skipBtn = screen.getByRole('button', { name: /Skip Tour/i });
    fireEvent.click(skipBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('fertility_tracker_has_seen_welcome')).toBe('true');
  });

  it('renders quick start buttons on slide 4', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    const step4Dot = screen.getByTitle('Go to step 4');
    fireEvent.click(step4Dot);

    expect(screen.getByText(/Explore Demo Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Fresh/i)).toBeInTheDocument();
  });

  it('loads the demo data and closes from the last step', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <>
        <WelcomeModal onClose={handleClose} />
        <ObservationCount />
      </>
    );
    fireEvent.click(screen.getByTitle('Go to step 4'));
    expect(screen.queryByRole('button', { name: /Next/i })).toBeNull();
    fireEvent.click(screen.getByText(/Explore Demo Data/i));
    expect(screen.getByTestId('count')).toHaveTextContent('56');
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('does not offer the demo data on a device with a sync record (ADR 0012)', async () => {
    const { relay } = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    await createVault(relay, keyStore, 'Phone');
    renderWithProviders(<WelcomeModal onClose={() => {}} sync={controlOf(relay, keyStore)} />);
    fireEvent.click(screen.getByTitle('Go to step 4'));
    expect(screen.getByText(/Start Fresh/i)).toBeInTheDocument();
    // Hidden while the key store loads, and after
    expect(screen.queryByText(/Explore Demo Data/i)).toBeNull();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText(/Explore Demo Data/i)).toBeNull();
  });

  it('offers the demo data once the key store has no record', async () => {
    const { relay } = createRelayHarness();
    renderWithProviders(
      <WelcomeModal onClose={() => {}} sync={controlOf(relay, createMemoryKeyStore())} />
    );
    fireEvent.click(screen.getByTitle('Go to step 4'));
    expect(await screen.findByText(/Explore Demo Data/i)).toBeInTheDocument();
  });

  it('does not load the demo data when the device joined a vault after the guide opened', async () => {
    const { relay } = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    const handleClose = vi.fn();
    renderWithProviders(
      <>
        <WelcomeModal onClose={handleClose} sync={controlOf(relay, keyStore)} />
        <ObservationCount />
      </>
    );
    fireEvent.click(screen.getByTitle('Go to step 4'));
    const demo = await screen.findByText(/Explore Demo Data/i);
    await createVault(relay, keyStore, 'Phone');
    fireEvent.click(demo);
    await waitFor(() => expect(screen.queryByText(/Explore Demo Data/i)).toBeNull());
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not load the demo data when the key store fails at the click', async () => {
    const { relay } = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    let fail = false;
    const control = controlOf(relay, {
      ...keyStore,
      load: () => (fail ? Promise.reject(new Error('blocked')) : keyStore.load()),
    });
    renderWithProviders(
      <>
        <WelcomeModal onClose={() => {}} sync={control} />
        <ObservationCount />
      </>
    );
    fireEvent.click(screen.getByTitle('Go to step 4'));
    const demo = await screen.findByText(/Explore Demo Data/i);
    fail = true;
    fireEvent.click(demo);
    await waitFor(() => expect(screen.queryByText(/Explore Demo Data/i)).toBeNull());
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('loads the demo data at the click when the key store still has no record', async () => {
    const { relay } = createRelayHarness();
    const handleClose = vi.fn();
    renderWithProviders(
      <>
        <WelcomeModal onClose={handleClose} sync={controlOf(relay, createMemoryKeyStore())} />
        <ObservationCount />
      </>
    );
    fireEvent.click(screen.getByTitle('Go to step 4'));
    fireEvent.click(await screen.findByText(/Explore Demo Data/i));
    await waitFor(() => expect(handleClose).toHaveBeenCalledOnce());
    expect(screen.getByTestId('count')).toHaveTextContent('56');
  });

  it('closes with Start Fresh, the close button, the overlay and Escape', () => {
    const handleClose = vi.fn();
    renderWithProviders(<WelcomeModal onClose={handleClose} />);
    fireEvent.click(screen.getByTitle('Go to step 4'));
    fireEvent.click(screen.getByText(/Start Fresh/i));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(4);
  });

  it('is a native modal dialog with the focus on the close button', () => {
    renderWithProviders(<WelcomeModal onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /Welcome to Fertility Tracker/i });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('lets the keyboard focus and scroll the slide body, named by the slide title', () => {
    renderWithProviders(<WelcomeModal onClose={vi.fn()} />);
    const body = screen.getByRole('region', { name: /Clinical Charting, Privacy First/i });
    expect(body).toHaveClass('welcome-modal-body');
    expect(body).toHaveAttribute('tabindex', '0');
    fireEvent.click(screen.getByTitle('Go to step 2'));
    expect(screen.getByRole('region')).toHaveAccessibleName(
      screen.getByRole('heading', { level: 3 }).textContent as string
    );
  });

  it('ignores other keys and clicks inside the dialog', () => {
    const handleClose = vi.fn();
    renderWithProviders(<WelcomeModal onClose={handleClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    fireEvent.click(screen.getByText(/Step 1 of 4/i));
    expect(handleClose).not.toHaveBeenCalled();
  });
});
