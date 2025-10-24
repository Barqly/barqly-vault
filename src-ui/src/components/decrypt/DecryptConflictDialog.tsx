import React from 'react';
import { AlertTriangle, X, FolderOpen, Copy } from 'lucide-react';

export type ConflictAction = 'replace' | 'keep-both' | 'cancel';

interface DecryptConflictDialogProps {
  isOpen: boolean;
  vaultName: string;
  outputPath: string;
  onAction: (action: ConflictAction) => void;
}

/**
 * Dialog shown when decrypting to a folder that already exists
 * Offers: Replace, Keep Both, or Cancel
 */
const DecryptConflictDialog: React.FC<DecryptConflictDialogProps> = ({
  isOpen,
  vaultName,
  outputPath,
  onAction,
}) => {
  if (!isOpen) return null;

  const formatPath = (path: string): string => {
    if (path.startsWith('/Users/')) {
      return path.replace(/^\/Users\/[^/]+/, '~');
    }
    return path;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onAction('cancel')} />

      {/* Dialog */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 border border-slate-600">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100">Folder Already Exists</h2>
          </div>
          <button
            onClick={() => onAction('cancel')}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-slate-300 mb-3">
            The folder for <span className="font-semibold text-white">"{vaultName}"</span> already exists:
          </p>

          {/* Path display */}
          <div className="mb-5 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Location:</span>
            </div>
            <p className="font-mono text-xs text-slate-300 break-all">{formatPath(outputPath)}</p>
          </div>

          <p className="text-sm text-slate-400">
            Choose an action:
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-600 flex flex-col gap-3">
          {/* Replace */}
          <button
            onClick={() => onAction('replace')}
            className="
              w-full flex items-center justify-between px-4 py-3 rounded-lg
              bg-orange-600 hover:bg-orange-700
              text-white font-medium text-sm transition-colors
              focus:outline-none focus:ring-2 focus:ring-orange-500
            "
          >
            <span>Replace Existing</span>
            <span className="text-xs text-orange-200">Overwrites files</span>
          </button>

          {/* Keep Both */}
          <button
            onClick={() => onAction('keep-both')}
            className="
              w-full flex items-center justify-between px-4 py-3 rounded-lg
              bg-slate-700 hover:bg-slate-600 border border-slate-600
              text-slate-200 font-medium text-sm transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            <span>Keep Both</span>
            <span className="text-xs text-slate-400">Creates new folder with timestamp</span>
          </button>

          {/* Cancel */}
          <button
            onClick={() => onAction('cancel')}
            className="
              w-full px-4 py-2.5 rounded-lg
              bg-transparent border border-slate-600
              text-slate-400 font-medium text-sm transition-colors
              hover:bg-slate-700 hover:text-slate-300
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecryptConflictDialog;
