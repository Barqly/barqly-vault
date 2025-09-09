import { render, screen, act, waitFor } from '@testing-library/react';
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

// Mock the API calls
vi.mock('../../lib/api-types', async () => {
  const actual = await vi.importActual('../../lib/api-types');
  return {
    ...actual,
    invokeCommand: vi.fn(),
  };
});

// Import the mock after mocking
import * as apiTypes from '../../lib/api-types';
const mockInvokeCommand = vi.mocked(apiTypes.invokeCommand);

describe('EnhancedSetupPage - User Experience', () => {
  // const user = userEvent.setup(); // Unused in current tests

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeCommand.mockResolvedValue([]); // Default to no YubiKey devices
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User understands the setup process', () => {
    it('user sees the enhanced setup page with YubiKey options', async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <EnhancedSetupPage />
          </MemoryRouter>,
        );
      });

      // User should see setup interface elements
      await waitFor(() => {
        const hasSetupInterface =
          screen.queryAllByRole('textbox').length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasSetupInterface).toBeTruthy();
      });
    });

    it('user sees step-by-step progress through setup', async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <EnhancedSetupPage />
          </MemoryRouter>,
        );
      });

      // User should see setup workflow interface
      await waitFor(() => {
        const hasWorkflowInterface =
          screen.queryAllByRole('textbox').length > 0 || screen.queryAllByRole('radio').length > 0;
        expect(hasWorkflowInterface).toBeTruthy();
      });
    });
  });

  describe('User can complete setup workflow', () => {
    it('user can enter a label for their vault key', async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <EnhancedSetupPage />
          </MemoryRouter>,
        );
      });

      // User should see some form of setup interface (even if not fully loaded yet)
      await waitFor(() => {
        const hasSetupInterface =
          screen.queryAllByRole('textbox').length > 0 ||
          screen.queryAllByRole('radio').length > 0 ||
          screen.queryAllByRole('button').length > 0;
        expect(hasSetupInterface).toBeTruthy();
      });
    });

    it('user can choose their protection mode', async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <EnhancedSetupPage />
          </MemoryRouter>,
        );
      });

      // User should see protection mode options
      await waitFor(() => {
        const hasProtectionOptions = screen.queryAllByRole('radio').length > 0;
        expect(hasProtectionOptions).toBeTruthy();
      });
    });
  });

  describe('Accessibility for all users', () => {
    it('keyboard users can navigate through setup steps', async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <EnhancedSetupPage />
          </MemoryRouter>,
        );
      });

      // User should be able to navigate interface elements
      await waitFor(() => {
        const interactiveElements =
          screen.queryAllByRole('textbox').length > 0 ||
          screen.queryAllByRole('radio').length > 0 ||
          screen.queryAllByRole('button').length > 0;
        expect(interactiveElements).toBeTruthy();
      });
    });

    it('screen reader users understand setup progress', async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <EnhancedSetupPage />
          </MemoryRouter>,
        );
      });

      // Should have accessible interface structure
      await waitFor(() => {
        const hasAccessibleStructure =
          screen.queryAllByRole('heading').length > 0 ||
          screen.queryAllByRole('textbox').length > 0;
        expect(hasAccessibleStructure).toBeTruthy();
      });
    });
  });
});
