import React, { useState, useEffect } from 'react';
import { FolderOpen, HardDrive, Clock, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface DestinationSelectorProps {
  outputPath: string | null;
  onPathChange: (path: string) => void;
  disabled?: boolean;
  requiredSpace?: number;
}

const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  outputPath,
  onPathChange,
  disabled = false,
  requiredSpace = 0,
}) => {
  const [availableSpace] = useState<number | null>(null);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [createNewFolder, setCreateNewFolder] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Generate default path
  const getDefaultPath = () => {
    const date = new Date().toISOString().split('T')[0];
    // In real implementation, this would use Tauri's path API
    return `~/Desktop/Barqly-Recovery-${date}/`;
  };

  useEffect(() => {
    // Set default path if none selected
    if (!outputPath) {
      onPathChange(getDefaultPath());
    }

    // Load recent paths from localStorage
    const stored = localStorage.getItem('recentDecryptPaths');
    if (stored) {
      try {
        const paths = JSON.parse(stored);
        setRecentPaths(paths.slice(0, 3));
      } catch (error) {
        console.error('Failed to load recent paths:', error);
      }
    }
  }, []);

  const handleBrowse = async () => {
    if (disabled) return;

    try {
      const result = await open({
        directory: true,
        title: 'Select Output Directory',
      });

      if (result && typeof result === 'string') {
        onPathChange(result);

        // Update recent paths
        const updated = [result, ...recentPaths.filter((p) => p !== result)].slice(0, 3);
        setRecentPaths(updated);
        localStorage.setItem('recentDecryptPaths', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const handleQuickSelect = (path: string) => {
    if (disabled) return;
    onPathChange(path);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const hasEnoughSpace = availableSpace === null || availableSpace >= requiredSpace;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose where to save recovered files
        </label>

        {/* Current path display */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={outputPath || ''}
              onChange={(e) => onPathChange(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg font-mono text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Select output directory..."
            />
            <FolderOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <button
            onClick={handleBrowse}
            disabled={disabled}
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Browse for folder"
          >
            <FolderOpen className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Quick select recent paths */}
        {recentPaths.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Recent locations:</p>
            <div className="flex flex-wrap gap-2">
              {recentPaths.map((path, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSelect(path)}
                  disabled={disabled}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-mono truncate max-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                  title={path}
                >
                  <Clock className="inline w-3 h-3 mr-1" />
                  {path.split('/').pop() || path}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={createNewFolder}
            onChange={(e) => setCreateNewFolder(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span>Create new folder for recovered files</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span>Replace existing files if found</span>
        </label>
      </div>

      {/* Space indicator */}
      <div className="flex items-center gap-2 text-sm">
        <HardDrive className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600">
          Space required: ~{formatFileSize(requiredSpace || 1800000)}
        </span>
        {availableSpace !== null && (
          <>
            <span className="text-gray-400">•</span>
            <span className={hasEnoughSpace ? 'text-green-600' : 'text-red-600'}>
              Available: {formatFileSize(availableSpace)}
              {hasEnoughSpace ? ' ✓' : ' ✗'}
            </span>
          </>
        )}
      </div>

      {!hasEnoughSpace && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Insufficient space</p>
            <p className="text-xs mt-1">
              Please select a different location or free up space on the selected drive.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationSelector;
