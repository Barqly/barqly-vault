import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CollapsibleHelp from '../../../components/ui/CollapsibleHelp';

describe('CollapsibleHelp', () => {
  it('renders with default trigger text', () => {
    render(<CollapsibleHelp />);

    expect(screen.getByRole('button', { name: /learn what happens next/i })).toBeInTheDocument();
  });

  it('renders with custom trigger text', () => {
    render(<CollapsibleHelp triggerText="Custom help text" />);

    expect(screen.getByRole('button', { name: /custom help text/i })).toBeInTheDocument();
  });

  it('starts in collapsed state', () => {
    render(<CollapsibleHelp />);

    const trigger = screen.getByRole('button', { name: /learn what happens next/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    const content = document.getElementById('help-content')!;
    expect(content).toHaveAttribute('aria-hidden', 'true');
    expect(content).toHaveClass('max-h-0', 'opacity-0');
  });

  it('expands when trigger is clicked', () => {
    render(<CollapsibleHelp />);

    const trigger = screen.getByRole('button', { name: /learn what happens next/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const content = document.getElementById('help-content')!;
    expect(content).toHaveAttribute('aria-hidden', 'false');
    expect(content).toHaveClass('max-h-96', 'opacity-100');
  });

  it('toggles chevron rotation when expanded/collapsed', () => {
    render(<CollapsibleHelp />);

    const trigger = screen.getByRole('button', { name: /learn what happens next/i });
    const chevron = trigger.querySelector('svg:last-child') as Element;
    expect(chevron).not.toHaveClass('rotate-180');

    fireEvent.click(trigger);
    expect(chevron).toHaveClass('rotate-180');

    fireEvent.click(trigger);
    expect(chevron).not.toHaveClass('rotate-180');
  });

  it('renders all three steps', () => {
    render(<CollapsibleHelp />);

    fireEvent.click(screen.getByRole('button', { name: /learn what happens next/i }));

    expect(screen.getByText('Key Generation')).toBeInTheDocument();
    expect(screen.getByText('File Encryption')).toBeInTheDocument();
    expect(screen.getByText('Secure Storage')).toBeInTheDocument();
  });

  it('shows detailed information when detailed prop is true', () => {
    render(<CollapsibleHelp detailed={true} />);

    fireEvent.click(screen.getByRole('button', { name: /learn what happens next/i }));

    expect(screen.getByText(/Uses industry-standard age encryption/)).toBeInTheDocument();
    expect(screen.getByText(/Files are compressed, archived/)).toBeInTheDocument();
    expect(screen.getByText(/Only those with your private key/)).toBeInTheDocument();
  });

  it('hides detailed information when detailed prop is false', () => {
    render(<CollapsibleHelp detailed={false} />);

    fireEvent.click(screen.getByRole('button', { name: /learn what happens next/i }));

    expect(screen.queryByText(/Uses industry-standard age encryption/)).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<CollapsibleHelp />);

    const trigger = screen.getByRole('button', { name: /learn what happens next/i });
    expect(trigger).toHaveAttribute('aria-controls', 'help-content');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    const content = document.getElementById('help-content')!;
    expect(content).toHaveAttribute('id', 'help-content');
  });

  it('shows security note in expanded content', () => {
    render(<CollapsibleHelp />);

    fireEvent.click(screen.getByRole('button', { name: /learn what happens next/i }));

    expect(screen.getByText(/Your private key never leaves this device/)).toBeInTheDocument();
    expect(
      screen.getByText(/Only share your public key with trusted individuals/),
    ).toBeInTheDocument();
  });
});
