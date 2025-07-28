import React, { useState } from 'react';
import FileSelectionButton, { FileFilter } from '../../src/components/forms/FileSelectionButton';
import BackToDemos from '../components/back-to-demos';

const FileSelectionDemo: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string[]>([]);
  const [selectedMultipleFiles, setSelectedMultipleFiles] = useState<string[]>([]);
  const [selectedFilteredFiles, setSelectedFilteredFiles] = useState<string[]>([]);

  const textFileFilters: FileFilter[] = [
    { name: 'Text Files', extensions: ['txt', 'md', 'json'] },
    { name: 'All Files', extensions: ['*'] },
  ];

  const handleError = (error: Error) => {
    console.error('File selection error:', error);
    alert(`File selection failed: ${error.message}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <BackToDemos className="mb-6" />

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">FileSelectionButton Demo</h1>
            <div className="text-sm text-gray-500 font-mono">Task 4.2.1.1</div>
          </div>

          <div className="space-y-8">
            {/* Single File Selection */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Single File Selection</h2>
              <div className="flex items-center gap-4 mb-4">
                <FileSelectionButton
                  onSelectionChange={setSelectedFiles}
                  onError={handleError}
                  buttonText="Choose a File"
                />
                <span className="text-sm text-gray-600">Select any file from your system</span>
              </div>
              {selectedFiles.length > 0 && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected File:</p>
                  <p className="text-sm text-gray-600 font-mono break-all">{selectedFiles[0]}</p>
                </div>
              )}
            </div>

            {/* Folder Selection */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Folder Selection</h2>
              <div className="flex items-center gap-4 mb-4">
                <FileSelectionButton
                  onSelectionChange={setSelectedFolder}
                  onError={handleError}
                  mode="folder"
                  buttonText="Choose Folder"
                />
                <span className="text-sm text-gray-600">
                  Select a folder to encrypt all its contents
                </span>
              </div>
              {selectedFolder.length > 0 && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Folder:</p>
                  <p className="text-sm text-gray-600 font-mono break-all">{selectedFolder[0]}</p>
                </div>
              )}
            </div>

            {/* Multiple File Selection */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Multiple File Selection</h2>
              <div className="flex items-center gap-4 mb-4">
                <FileSelectionButton
                  onSelectionChange={setSelectedMultipleFiles}
                  onError={handleError}
                  multiple
                  buttonText="Choose Multiple Files"
                />
                <span className="text-sm text-gray-600">
                  Select multiple files (Ctrl/Cmd + click)
                </span>
              </div>
              {selectedMultipleFiles.length > 0 && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Files ({selectedMultipleFiles.length}):
                  </p>
                  <ul className="text-sm text-gray-600 font-mono space-y-1">
                    {selectedMultipleFiles.map((file, index) => (
                      <li key={index} className="break-all">
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Filtered File Selection */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Filtered File Selection</h2>
              <div className="flex items-center gap-4 mb-4">
                <FileSelectionButton
                  onSelectionChange={setSelectedFilteredFiles}
                  onError={handleError}
                  filters={textFileFilters}
                  buttonText="Choose Text Files"
                />
                <span className="text-sm text-gray-600">Only shows .txt, .md, and .json files</span>
              </div>
              {selectedFilteredFiles.length > 0 && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Text File:</p>
                  <p className="text-sm text-gray-600 font-mono break-all">
                    {selectedFilteredFiles[0]}
                  </p>
                </div>
              )}
            </div>

            {/* Disabled State */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Disabled State</h2>
              <div className="flex items-center gap-4">
                <FileSelectionButton
                  onSelectionChange={() => {}}
                  disabled
                  buttonText="Disabled Button"
                />
                <span className="text-sm text-gray-600">
                  This button is disabled and cannot be clicked
                </span>
              </div>
            </div>

            {/* Custom Styling */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Custom Styling</h2>
              <div className="flex items-center gap-4">
                <FileSelectionButton
                  onSelectionChange={() => {}}
                  buttonText="Custom Style"
                  className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                />
                <span className="text-sm text-gray-600">Button with custom blue styling</span>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="mt-12 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              How to Use FileSelectionButton
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • <strong>Single File:</strong> Click to select one file
              </p>
              <p>
                • <strong>Multiple Files:</strong> Hold Ctrl (Windows) or Cmd (Mac) to select
                multiple files
              </p>
              <p>
                • <strong>Folder Selection:</strong> Use folder mode to select entire directories
              </p>
              <p>
                • <strong>File Filters:</strong> Configure filters to show only specific file types
              </p>
              <p>
                • <strong>Error Handling:</strong> Component handles permission errors and
                cancellations gracefully
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSelectionDemo;
