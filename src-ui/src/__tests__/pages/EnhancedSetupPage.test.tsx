import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EnhancedSetupPage from '../../pages/EnhancedSetupPage';

// Mock the router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('EnhancedSetupPage - User Experience', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User understands the setup process', () => {
    it('user sees the enhanced setup page with YubiKey options', () => {
      render(
        <MemoryRouter>
          <EnhancedSetupPage />
        </MemoryRouter>,
      );

      expect(screen.getByText(/enhanced.*setup/i)).toBeInTheDocument();
      expect(screen.getByText(/secure.*vault.*key/i)).toBeInTheDocument();
    });

    it('user sees step-by-step progress through setup', () => {
      render(
        <MemoryRouter>
          <EnhancedSetupPage />
        </MemoryRouter>,
      );

      // User should see they are on step 1 initially
      expect(screen.getByText(/step.*1/i)).toBeInTheDocument();
    });
  });

  describe('User can complete setup workflow', () => {
    it('user can enter a label for their vault key', async () => {
      render(
        <MemoryRouter>
          <EnhancedSetupPage />
        </MemoryRouter>,
      );

      const labelField = screen.getByLabelText(/key.*label/i);
      await user.type(labelField, 'My Important Documents');

      expect(labelField).toHaveValue('My Important Documents');
    });

    it('user can choose their protection mode', () => {
      render(
        <MemoryRouter>
          <EnhancedSetupPage />
        </MemoryRouter>,
      );

      // User should see protection mode options
      expect(screen.getByText(/choose.*protection/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate through setup steps', async () => {
      render(
        <MemoryRouter>
          <EnhancedSetupPage />
        </MemoryRouter>,
      );

      // User should be able to tab through form fields
      const labelField = screen.getByLabelText(/key.*label/i);
      await user.tab();
      expect(labelField).toHaveFocus();
    });

    it('screen reader users understand setup progress', () => {
      render(
        <MemoryRouter>
          <EnhancedSetupPage />
        </MemoryRouter>,
      );

      // Should have proper heading structure
      expect(screen.getByRole('heading', { name: /enhanced.*setup/i })).toBeInTheDocument();
    });
  });
});
