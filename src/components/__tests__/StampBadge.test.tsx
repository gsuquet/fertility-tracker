import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StampBadge } from '../StampBadge';

describe('StampBadge Component', () => {
  it('renders Red stamp badge correctly for bleeding', () => {
    const { container } = render(<StampBadge stamp="RED" />);
    expect(container.querySelector('.stamp-red')).toBeInTheDocument();
  });

  it('renders Dark Green stamp badge correctly for infertile dry day', () => {
    const { container } = render(<StampBadge stamp="DARK_GREEN" />);
    expect(container.querySelector('.stamp-dark_green')).toBeInTheDocument();
  });

  it('renders White stamp badge with Baby figure SVG for fertile mucus', () => {
    const { container } = render(<StampBadge stamp="WHITE_BABY" />);
    expect(container.querySelector('.stamp-white_baby')).toBeInTheDocument();
    expect(container.querySelector('.baby-svg')).toBeInTheDocument();
  });

  it('renders Light Green post-peak count stamp badges with numbers 1, 2, 3', () => {
    const { container: c1 } = render(<StampBadge stamp="LIGHT_GREEN_BABY_1" />);
    expect(c1.querySelector('.stamp-light_green_baby_1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    const { container: c2 } = render(<StampBadge stamp="LIGHT_GREEN_BABY_2" />);
    expect(c2.querySelector('.stamp-light_green_baby_2')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    const { container: c3 } = render(<StampBadge stamp="LIGHT_GREEN_BABY_3" />);
    expect(c3.querySelector('.stamp-light_green_baby_3')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders Intercourse "I" badge when intercourse flag is true', () => {
    render(<StampBadge stamp="WHITE_BABY" intercourse={true} />);
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('renders Peak Day "P" badge when isPeakDay is true', () => {
    render(<StampBadge stamp="WHITE_BABY" isPeakDay={true} />);
    expect(screen.getByText('P')).toBeInTheDocument();
  });
});
