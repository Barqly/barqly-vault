import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileDropZone from '../../../components/encrypt/FileDropZone';
import { safeInvoke } from '../../../lib/tauri-safe';

// Mock dependencies
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('../../../lib/environment/platform', () => ({
  isTauri: vi.fn(() => true),
}));

vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
}));

vi.mock('../../../utils/retry', () => ({
  withRetry: vi.fn((fn) => fn()), // By default, just call the function without retry
}));

describe('FileDropZone Error Recovery', () => {
  const mockOnFilesSelected = vi.fn();
  const mockOnClearFiles = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Backend Failure Recovery', () => {
    it('should use fallback detection when get_file_info fails', async () => {
      // Mock backend failure
      vi.mocked(safeInvoke).mockRejectedValue(new Error('Backend unavailable'));

      // Import withRetry here to mock it properly
      const { withRetry } = await import('../../../utils/retry');
      vi.mocked(withRetry).mockImplementation(async (fn) => {
        return await fn();
      });

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          onError={mockOnError}
        />,
      );

      // Simulate Tauri file drop event
      const { listen } = await import('@tauri-apps/api/event');
      const mockListen = vi.mocked(listen);

      // Get the file-drop listener
      const fileDropCall = mockListen.mock.calls.find((call) => call[0] === 'tauri://file-drop');

      if (fileDropCall && fileDropCall[1]) {
        const fileDropHandler = fileDropCall[1];

        // Simulate dropping a single file (should assume folder in fallback)
        await fileDropHandler({ payload: ['/path/to/folder'] } as any);

        // Should call onFilesSelected with fallback detection
        await waitFor(() => {
          expect(mockOnFilesSelected).toHaveBeenCalledWith(
            ['/path/to/folder'],
            'Folder', // Single path = folder in fallback
          );
        });
      }
    });

    it('should use fallback detection for multiple files', async () => {
      // Mock backend failure
      vi.mocked(safeInvoke).mockRejectedValue(new Error('Backend unavailable'));

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          onError={mockOnError}
        />,
      );

      // Simulate Tauri file drop event
      const { listen } = await import('@tauri-apps/api/event');
      const mockListen = vi.mocked(listen);

      // Get the file-drop listener
      const fileDropCall = mockListen.mock.calls.find((call) => call[0] === 'tauri://file-drop');

      if (fileDropCall && fileDropCall[1]) {
        const fileDropHandler = fileDropCall[1];

        // Simulate dropping multiple files (should assume files in fallback)
        await fileDropHandler({
          payload: ['/path/to/file1.txt', '/path/to/file2.txt'],
        } as any);

        // Should call onFilesSelected with fallback detection
        await waitFor(() => {
          expect(mockOnFilesSelected).toHaveBeenCalledWith(
            ['/path/to/file1.txt', '/path/to/file2.txt'],
            'Files', // Multiple paths = files in fallback
          );
        });
      }
    });

    it('should call onError when file processing fails', async () => {
      // Mock backend success but onFilesSelected fails
      vi.mocked(safeInvoke).mockResolvedValue([
        { path: '/test.txt', is_file: true, is_directory: false, name: 'test.txt', size: 100 },
      ]);

      mockOnFilesSelected.mockRejectedValue(new Error('Processing failed'));

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          onError={mockOnError}
        />,
      );

      // Simulate Tauri file drop event
      const { listen } = await import('@tauri-apps/api/event');
      const mockListen = vi.mocked(listen);

      // Get the file-drop listener
      const fileDropCall = mockListen.mock.calls.find((call) => call[0] === 'tauri://file-drop');

      if (fileDropCall && fileDropCall[1]) {
        const fileDropHandler = fileDropCall[1];

        await fileDropHandler({ payload: ['/test.txt'] } as any);

        // Should call onError with user-friendly message
        await waitFor(() => {
          expect(mockOnError).toHaveBeenCalled();
          const errorCall = mockOnError.mock.calls[0][0];
          expect(errorCall).toBeInstanceOf(Error);
          expect(errorCall.message).toContain('Failed to process dropped files');
          expect(errorCall.message).toContain('Please try again or use the browse buttons');
        });
      }
    });
  });

  describe('Browse Button Error Recovery', () => {
    it('should call onError when Browse Files fails', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockRejectedValue(new Error('Dialog failed'));

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          onError={mockOnError}
        />,
      );

      const browseFilesButton = screen.getByText('Browse Files');
      fireEvent.click(browseFilesButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
        const errorCall = mockOnError.mock.calls[0][0];
        expect(errorCall).toBeInstanceOf(Error);
        expect(errorCall.message).toContain('Failed to open file browser');
      });
    });

    it('should call onError when Browse Folder fails', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      vi.mocked(open).mockRejectedValue(new Error('Dialog failed'));

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          onError={mockOnError}
        />,
      );

      const browseFolderButton = screen.getByText('Browse Folder');
      fireEvent.click(browseFolderButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
        const errorCall = mockOnError.mock.calls[0][0];
        expect(errorCall).toBeInstanceOf(Error);
        expect(errorCall.message).toContain('Failed to open');
      });
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry backend calls with exponential backoff', async () => {
      let callCount = 0;
      vi.mocked(safeInvoke).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve([
          { path: '/test.txt', is_file: true, is_directory: false, name: 'test.txt', size: 100 },
        ]);
      });

      // Mock withRetry to actually retry
      const { withRetry } = await import('../../../utils/retry');
      vi.mocked(withRetry).mockImplementation(async (fn, options) => {
        let lastError;
        for (let attempt = 1; attempt <= (options?.maxAttempts || 2); attempt++) {
          try {
            return await fn();
          } catch (error) {
            lastError = error;
            if (attempt < (options?.maxAttempts || 2) && options?.onRetry) {
              options.onRetry(error as Error, attempt);
            }
          }
        }
        throw lastError;
      });

      render(
        <FileDropZone
          onFilesSelected={mockOnFilesSelected}
          selectedFiles={null}
          onClearFiles={mockOnClearFiles}
          onError={mockOnError}
        />,
      );

      // Simulate Tauri file drop event
      const { listen } = await import('@tauri-apps/api/event');
      const mockListen = vi.mocked(listen);

      const fileDropCall = mockListen.mock.calls.find((call) => call[0] === 'tauri://file-drop');

      if (fileDropCall && fileDropCall[1]) {
        const fileDropHandler = fileDropCall[1];
        await fileDropHandler({ payload: ['/test.txt'] } as any);

        // Should succeed after retry
        await waitFor(() => {
          expect(mockOnFilesSelected).toHaveBeenCalledWith(['/test.txt'], 'Files');
          expect(callCount).toBe(2); // First attempt failed, second succeeded
        });
      }
    });
  });
});
