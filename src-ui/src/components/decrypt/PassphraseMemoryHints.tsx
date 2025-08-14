import React, { useState } from 'react';
import { Info, Key, Calendar, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface PassphraseMemoryHintsProps {
  vaultPath?: string;
  creationDate?: string;
  keyLabel?: string;
  attemptCount?: number;
  onNeedHelp?: () => void;
}

const PassphraseMemoryHints: React.FC<PassphraseMemoryHintsProps> = ({
  vaultPath,
  creationDate,
  keyLabel,
  attemptCount = 0,
  onNeedHelp,
}) => {
  const [isExpanded, setIsExpanded] = useState(attemptCount > 0);

  // Extract vault name from path
  const vaultName = vaultPath ? vaultPath.split('/').pop()?.replace('.age', '') : null;

  // Progressive hints based on attempt count
  const getHints = () => {
    const hints = [];

    // Always show these if available
    if (creationDate) {
      hints.push({
        icon: <Calendar className="w-3 h-3" />,
        text: `Vault created on ${creationDate}`,
      });
    }

    if (keyLabel) {
      hints.push({
        icon: <Key className="w-3 h-3" />,
        text: `You used the key: "${keyLabel}"`,
      });
    }

    if (vaultName) {
      hints.push({
        icon: <Info className="w-3 h-3" />,
        text: `Vault name: ${vaultName}`,
      });
    }

    // Progressive hints based on attempts
    if (attemptCount >= 1) {
      hints.push({
        icon: <Lightbulb className="w-3 h-3" />,
        text: 'Remember: Passphrases are case-sensitive',
      });
    }

    if (attemptCount >= 2) {
      hints.push({
        icon: <Lightbulb className="w-3 h-3" />,
        text: 'Check your password manager for saved passphrases',
      });
    }

    if (attemptCount >= 3) {
      hints.push({
        icon: <Lightbulb className="w-3 h-3" />,
        text: 'Look for backup notes or documentation',
      });
      hints.push({
        icon: <Lightbulb className="w-3 h-3" />,
        text: 'Try variations of your commonly used passphrases',
      });
    }

    return hints;
  };

  const hints = getHints();

  if (hints.length === 0 && attemptCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50/60 border border-blue-200 rounded-lg overflow-hidden transition-all duration-150 ease-in-out">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
        aria-expanded={isExpanded}
        aria-label="Toggle memory hints"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-slate-700">
            Memory Hints
            {attemptCount > 0 && (
              <span className="ml-2 text-blue-700">
                ({attemptCount} attempt{attemptCount !== 1 ? 's' : ''})
              </span>
            )}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-blue-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {hints.map((hint, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">{hint.icon}</span>
              <span
                className={
                  hint.text.includes('key:')
                    ? 'text-blue-700 cursor-pointer hover:underline'
                    : 'text-slate-700'
                }
              >
                {hint.text}
              </span>
            </div>
          ))}

          {attemptCount >= 3 && onNeedHelp && (
            <div className="pt-2 mt-2 border-t border-blue-200">
              <button
                onClick={onNeedHelp}
                className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
              >
                Need help recovering your passphrase? →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PassphraseMemoryHints;
