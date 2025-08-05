import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileDropZone from '../../../components/encrypt/FileDropZone';

// Mock the Tauri dialog API
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

const mockOpen = vi.mocked(await import('@tauri-apps/plugin-dialog')).open;

describe('FileDropZone', () => {
  const mockOnFilesSelected = vi.fn();
  const mockOnClearFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render with file/folder drop prompt', () => {
      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
        />,
      );

      expect(screen.getByText('Drop files or folders here to encrypt')).toBeInTheDocument();
      expect(screen.getByText('(Dropping files will open the file dialog)')).toBeInTheDocument();
    });
  });

  describe('Browse Functionality', () => {
    it('should open file dialog when Browse Files is clicked', async () => {
      mockOpen.mockResolvedValueOnce(['/path/to/file1.txt', '/path/to/file2.txt']);

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
        />,
      );

      const browseButton = screen.getByText('Browse Files');
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          multiple: true,
          directory: false,
          title: 'Select Files to Encrypt',
        });
        expect(mockOnFilesSelected).toHaveBeenCalledWith(
          ['/path/to/file1.txt', '/path/to/file2.txt'],
          'Files',
        );
      });
    });

    it('should open folder dialog when Browse Folder is clicked', async () => {
      mockOpen.mockResolvedValueOnce('/path/to/folder');

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
        />,
      );

      const browseButton = screen.getByText('Browse Folder');
      fireEvent.click(browseButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          multiple: false,
          directory: true,
          title: 'Select Folder to Encrypt',
        });
        expect(mockOnFilesSelected).toHaveBeenCalledWith(['/path/to/folder'], 'Folder');
      });
    });

    it('should disable browse buttons when disabled prop is true', () => {
      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          disabled={true}
        />,
      );

      const browseFilesButton = screen.getByText('Browse Files');
      const browseFolderButton = screen.getByText('Browse Folder');
      expect(browseFilesButton).toBeDisabled();
      expect(browseFolderButton).toBeDisabled();
    });
  });

  describe('Drag and Drop', () => {
    it('should show drag state when files are dragged over', () => {
      const { container } = render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
        />,
      );

      // Find the drop zone by its class pattern
      const dropZone = container.querySelector('.border-dashed');
      expect(dropZone).toBeInTheDocument();

      // Simulate drag enter
      fireEvent.dragEnter(dropZone!, {
        dataTransfer: { files: [] },
      });

      // Check for visual feedback (blue border)
      expect(dropZone).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should handle file drop by opening file dialog', async () => {
      mockOpen.mockResolvedValueOnce(['/path/to/dropped.txt']);

      const { container } = render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
        />,
      );

      const dropZone = container.querySelector('.border-dashed');

      // Create a mock file
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      // Simulate drop
      fireEvent.drop(dropZone!, { dataTransfer });

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          multiple: true,
          directory: false,
          title: 'Select the files you just dropped',
        });
        expect(mockOnFilesSelected).toHaveBeenCalledWith(['/path/to/dropped.txt'], 'Files');
      });
    });

    it('should not handle drop when disabled', async () => {
      const { container } = render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          disabled={true}
        />,
      );

      const dropZone = container.querySelector('.border-dashed');

      // Create a mock file
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      // Simulate drop
      fireEvent.drop(dropZone!, { dataTransfer });

      await waitFor(() => {
        expect(mockOpen).not.toHaveBeenCalled();
        expect(mockOnFilesSelected).not.toHaveBeenCalled();
      });
    });
  });

  describe('Selected Files Display', () => {
    it('should display selected files information', () => {
      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={{
            paths: ['/path/to/file1.txt', '/path/to/file2.pdf'],
            file_count: 2,
            total_size: 2048576, // 2MB
          }}
          onClearFiles={mockOnClearFiles}
        />,
      );

      expect(screen.getByText('Selected:')).toBeInTheDocument();
      // 2048576 bytes = 1.95 MB
      expect(screen.getByText(/2 files, 1\.95 MB/)).toBeInTheDocument();
      expect(screen.getByText('file1.txt')).toBeInTheDocument();
      expect(screen.getByText('file2.pdf')).toBeInTheDocument();
    });

    it('should handle single file display correctly', () => {
      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={{
            paths: ['/path/to/file.txt'],
            file_count: 1,
            total_size: 1024, // 1KB
          }}
          onClearFiles={mockOnClearFiles}
        />,
      );

      expect(screen.getByText(/1 file, 1\.0 KB/)).toBeInTheDocument();
    });

    it('should call onClearFiles when Clear button is clicked', () => {
      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={{
            paths: ['/path/to/file.txt'],
            file_count: 1,
            total_size: 1024,
          }}
          onClearFiles={mockOnClearFiles}
        />,
      );

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(mockOnClearFiles).toHaveBeenCalled();
    });

    it('should format file sizes correctly', () => {
      const testCases = [
        { size: 512, expected: '512 B' },
        { size: 1536, expected: '1.5 KB' },
        { size: 1048576, expected: '1.00 MB' },
        { size: 5242880, expected: '5.00 MB' },
      ];

      testCases.forEach(({ size, expected }) => {
        const { rerender } = render(
          <FileDropZone
            onFilesSelected={mockOnFilesSelected}
            selectedFiles={{
              paths: ['/test.txt'],
              file_count: 1,
              total_size: size,
            }}
            onClearFiles={mockOnClearFiles}
          />,
        );

        expect(
          screen.getByText(new RegExp(`1 file, ${expected.replace('.', '\\.')}`)),
        ).toBeInTheDocument();
        rerender(<div />); // Clear for next test
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={{
            paths: ['/file.txt'],
            file_count: 1,
            total_size: 1024,
          }}
          onClearFiles={mockOnClearFiles}
        />,
      );

      const clearButton = screen.getByLabelText('Clear all files');
      expect(clearButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
        />,
      );

      const browseButton = screen.getByText('Browse Files');
      browseButton.focus();
      expect(document.activeElement).toBe(browseButton);
    });
  });
});
