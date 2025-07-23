import React, { useState } from 'react';
import FileSelectionButton from '../components/forms/FileSelectionButton';

const EncryptPage: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string[]>([]);

  const handleError = (error: Error) => {
    console.error('File selection error:', error);
    alert(`File selection failed: ${error.message}`);
  };

  const handleFileSelection = (files: string[]) => {
    setSelectedFiles(files);
  };

  const handleFolderSelection = (folders: string[]) => {
    setSelectedFolder(folders);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Encrypt Files</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select files or folders to encrypt with your chosen key for secure Bitcoin custody
            backup.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="space-y-8">
            {/* File Selection */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Files to Encrypt</h2>
              <div className="flex items-center gap-4 mb-4">
                <FileSelectionButton
                  onSelectionChange={handleFileSelection}
                  onError={handleError}
                  multiple
                  buttonText="Choose Files"
                />
                <span className="text-sm text-gray-600">Select one or more files to encrypt</span>
              </div>
              {selectedFiles.length > 0 && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Files ({selectedFiles.length}):
                  </p>
                  <ul className="text-sm text-gray-600 font-mono space-y-1 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="break-all">
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Folder Selection */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Or Select a Folder</h2>
              <div className="flex items-center gap-4 mb-4">
                <FileSelectionButton
                  onSelectionChange={handleFolderSelection}
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

            {/* Encryption Options */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Encryption Options</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Selected Key:</span>
                  <span className="text-sm text-gray-600">Default Key (placeholder)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Output Format:</span>
                  <span className="text-sm text-gray-600">Age-encrypted archive</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Compression:</span>
                  <span className="text-sm text-gray-600">Enabled</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={selectedFiles.length === 0 && selectedFolder.length === 0}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedFiles.length === 0 && selectedFolder.length === 0}
              >
                Encrypt Files
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Encryption Tips</h2>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              • <strong>File Selection:</strong> You can select multiple files by holding Ctrl
              (Windows) or Cmd (Mac)
            </p>
            <p>
              • <strong>Folder Encryption:</strong> All files in the selected folder will be
              encrypted together
            </p>
            <p>
              • <strong>Output:</strong> Encrypted files will be saved as a single archive with .age
              extension
            </p>
            <p>
              • <strong>Security:</strong> Files are encrypted using the age encryption standard for
              maximum security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptPage;
