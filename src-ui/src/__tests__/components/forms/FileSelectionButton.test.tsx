import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, MockedFunction } from 'vitest';
import FileSelectionButton from '../../../components/forms/FileSelectionButton';

// Mock the dialog module
vi.mock('@tauri-apps/plugin-dialog');

// Import and type the mock
import { open } from '@tauri-apps/plugin-dialog';
const mockOpen = open as MockedFunction<typeof open>;

describe('FileSelectionButton (4.2.1.3)', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render file selection button with default text', () => {
      render(<FileSelectionButton onSelectionChange={() => {}} />);

      expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
      expect(screen.getByText(/select file/i)).toBeInTheDocument();
    });

    it('should render with custom button text when provided', () => {
      render(<FileSelectionButton onSelectionChange={() => {}} buttonText="Choose Files" />);

      expect(screen.getByRole('button', { name: /choose files/i })).toBeInTheDocument();
      expect(screen.getByText(/choose files/i)).toBeInTheDocument();
    });

    it('should render with folder selection mode', () => {
      render(<FileSelectionButton onSelectionChange={() => {}} mode="folder" />);

      expect(screen.getByRole('button', { name: /select folder/i })).toBeInTheDocument();
      expect(screen.getByText(/select folder/i)).toBeInTheDocument();
    });

    it('should render with multiple file selection mode', () => {
      render(<FileSelectionButton onSelectionChange={() => {}} mode="files" multiple />);

      expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument();
      expect(screen.getByText(/select files/i)).toBeInTheDocument();
    });

    it('should render with disabled state when provided', () => {
      render(<FileSelectionButton onSelectionChange={() => {}} disabled />);

      const button = screen.getByRole('button', { name: /select file/i });
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('should render with custom className when provided', () => {
      render(<FileSelectionButton onSelectionChange={() => {}} className="custom-class" />);

      const button = screen.getByRole('button', { name: /select file/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('File Selection Behavior', () => {
    it('should open file dialog when button is clicked', async () => {
      mockOpen.mockResolvedValue(['/path/to/file.txt']);

      render(<FileSelectionButton onSelectionChange={() => {}} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      expect(mockOpen).toHaveBeenCalledWith({
        multiple: false,
        directory: false,
        filters: undefined,
        title: 'Select File',
      });
    });

    it('should open folder dialog when in folder mode', async () => {
      mockOpen.mockResolvedValue(['/path/to/folder']);

      render(<FileSelectionButton onSelectionChange={() => {}} mode="folder" />);

      const button = screen.getByRole('button', { name: /select folder/i });
      await user.click(button);

      expect(mockOpen).toHaveBeenCalledWith({
        multiple: false,
        directory: true,
        filters: undefined,
        title: 'Select Folder',
      });
    });

    it('should support multiple file selection', async () => {
      mockOpen.mockResolvedValue(['/path/to/file1.txt', '/path/to/file2.txt']);

      render(<FileSelectionButton onSelectionChange={() => {}} multiple />);

      const button = screen.getByRole('button', { name: /select files/i });
      await user.click(button);

      expect(mockOpen).toHaveBeenCalledWith({
        multiple: true,
        directory: false,
        filters: undefined,
        title: 'Select Files',
      });
    });

    it('should apply file filters when provided', async () => {
      mockOpen.mockResolvedValue(['/path/to/file.txt']);

      const filters = [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] },
      ];

      render(<FileSelectionButton onSelectionChange={() => {}} filters={filters} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      expect(mockOpen).toHaveBeenCalledWith({
        multiple: false,
        directory: false,
        filters,
        title: 'Select File',
      });
    });
  });

  describe('Selection Callbacks', () => {
    it('should call onSelectionChange with selected files', async () => {
      const selectedFiles = ['/path/to/file1.txt', '/path/to/file2.txt'];
      mockOpen.mockResolvedValue(selectedFiles);

      const mockOnSelectionChange = vi.fn();
      render(<FileSelectionButton onSelectionChange={mockOnSelectionChange} multiple />);

      const button = screen.getByRole('button', { name: /select files/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(selectedFiles);
      });
    });

    it('should call onSelectionChange with single file when not multiple', async () => {
      const selectedFile = '/path/to/file.txt';
      mockOpen.mockResolvedValue([selectedFile]);

      const mockOnSelectionChange = vi.fn();
      render(<FileSelectionButton onSelectionChange={mockOnSelectionChange} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith([selectedFile]);
      });
    });

    it('should not call onSelectionChange when dialog is cancelled', async () => {
      mockOpen.mockResolvedValue(null);

      const mockOnSelectionChange = vi.fn();
      render(<FileSelectionButton onSelectionChange={mockOnSelectionChange} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnSelectionChange).not.toHaveBeenCalled();
      });
    });

    it('should call onError when dialog fails', async () => {
      const error = new Error('Dialog failed');
      mockOpen.mockRejectedValue(error);

      const mockOnError = vi.fn();
      render(<FileSelectionButton onSelectionChange={() => {}} onError={mockOnError} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during file selection', async () => {
      let resolvePromise: ((value: string[]) => void) | undefined;
      const promise = new Promise<string[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockOpen.mockReturnValue(promise);

      render(<FileSelectionButton onSelectionChange={() => {}} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      // Should show loading state
      expect(screen.getByText(/selecting/i)).toBeInTheDocument();
      expect(button).toBeDisabled();

      // Resolve the promise
      resolvePromise!(['/path/to/file.txt']);

      // Should return to normal state
      await waitFor(() => {
        expect(screen.getByText(/select file/i)).toBeInTheDocument();
        expect(button).not.toBeDisabled();
      });
    });

    it('should handle loading state with custom loading text', async () => {
      let resolvePromise: ((value: string[]) => void) | undefined;
      const promise = new Promise<string[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockOpen.mockReturnValue(promise);

      render(<FileSelectionButton onSelectionChange={() => {}} loadingText="Processing..." />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      // Should show custom loading text
      expect(screen.getByText(/processing/i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(['/path/to/file.txt']);

      // Should return to normal state
      await waitFor(() => {
        expect(screen.getByText(/select file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FileSelectionButton onSelectionChange={() => {}} />);

      const button = screen.getByRole('button', { name: /select file/i });
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-label', 'select file');
    });

    it('should be keyboard navigable', async () => {
      mockOpen.mockResolvedValue(['/path/to/file.txt']);

      render(<FileSelectionButton onSelectionChange={() => {}} />);

      const button = screen.getByRole('button', { name: /select file/i });
      button.focus();

      await user.keyboard('{Enter}');

      expect(mockOpen).toHaveBeenCalled();
    });

    it('should have proper focus management', async () => {
      render(<FileSelectionButton onSelectionChange={() => {}} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.tab();

      expect(button).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should handle dialog errors gracefully', async () => {
      const error = new Error('Permission denied');
      mockOpen.mockRejectedValue(error);

      const mockOnError = vi.fn();

      render(<FileSelectionButton onSelectionChange={() => {}} onError={mockOnError} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });

    it('should handle empty selection gracefully', async () => {
      mockOpen.mockResolvedValue([]);

      const mockOnSelectionChange = vi.fn();
      render(<FileSelectionButton onSelectionChange={mockOnSelectionChange} />);

      const button = screen.getByRole('button', { name: /select file/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('Performance', () => {
    it('should handle rapid clicks gracefully', async () => {
      // Create a promise that we control

      let resolvePromise: ((value: string[]) => void) | undefined;
      const promise = new Promise<string[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockOpen.mockReturnValue(promise);

      render(<FileSelectionButton onSelectionChange={() => {}} />);

      const button = screen.getByRole('button', { name: /select file/i });

      // Rapid clicks
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only call open once due to loading state
      expect(mockOpen).toHaveBeenCalledTimes(1);

      // Resolve the promise to complete the test
      resolvePromise!(['/path/to/file.txt']);
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should handle large file lists efficiently', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => `/path/to/file${i}.txt`);
      mockOpen.mockResolvedValue(largeFileList);

      const mockOnSelectionChange = vi.fn();
      render(<FileSelectionButton onSelectionChange={mockOnSelectionChange} multiple />);

      const button = screen.getByRole('button', { name: /select files/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(largeFileList);
      });
    });
  });
});
