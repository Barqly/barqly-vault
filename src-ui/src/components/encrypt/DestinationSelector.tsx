import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Info } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { documentDir, join } from '@tauri-apps/api/path';

interface DestinationSelectorProps {
  outputPath: string;
  onPathChange: (path: string) => void;
  archiveName: string;
  onNameChange: (name: string) => void;
  disabled?: boolean;
}

const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  outputPath,
  onPathChange,
  archiveName,
  onNameChange,
  disabled = false,
}) => {
  const [defaultPath, setDefaultPath] = useState<string>('');
  const [finalFileName, setFinalFileName] = useState<string>('');

  // Set default path on mount
  useEffect(() => {
    const setDefault = async () => {
      try {
        // Use documentDir for cross-platform compatibility
        const docsPath = await documentDir();
        const vaultsPath = await join(docsPath, 'Barqly-Vaults');
        setDefaultPath(vaultsPath);
        if (!outputPath) {
          onPathChange(vaultsPath);
        }
      } catch (error) {
        console.error('Error setting default path:', error);
      }
    };
    setDefault();
  }, [outputPath, onPathChange]);

  // Update final filename preview
  useEffect(() => {
    const timestamp = new Date().toISOString().split('T')[0];
    const name = archiveName?.trim() || `barqly-vault-${timestamp}`;
    setFinalFileName(`${name}.age`);
  }, [archiveName]);

  const handleBrowse = useCallback(async () => {
    if (disabled) return;

    try {
      const selectedPath = await open({
        directory: true,
        title: 'Select Output Directory',
        defaultPath: outputPath || defaultPath,
      });

      if (selectedPath && typeof selectedPath === 'string') {
        onPathChange(selectedPath);
      }
    } catch (error) {
      console.error('Directory selection error:', error);
    }
  }, [disabled, outputPath, defaultPath, onPathChange]);

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPathChange(e.target.value);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any file extensions from the input
    const name = e.target.value.replace(/\.(age|tar|gz|zip)$/i, '');
    onNameChange(name);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="output-path" className="block text-sm font-medium text-gray-700 mb-2">
          Save encrypted vault to:
        </label>
        <div className="flex gap-2">
          <input
            id="output-path"
            type="text"
            value={outputPath}
            onChange={handlePathChange}
            placeholder={defaultPath || 'Enter output directory path'}
            disabled={disabled}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            aria-label="Output directory path"
          />
          <button
            type="button"
            onClick={handleBrowse}
            disabled={disabled}
            className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Browse for output directory"
          >
            <FolderOpen className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="archive-name" className="block text-sm font-medium text-gray-700 mb-2">
          Archive name (optional):
        </label>
        <input
          id="archive-name"
          type="text"
          value={archiveName}
          onChange={handleNameChange}
          placeholder="family-bitcoin-backup"
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          aria-label="Archive name"
        />
        <div className="mt-2 flex items-start gap-1">
          <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500">
            Will be saved as: <span className="font-mono text-gray-600">{finalFileName}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DestinationSelector;
