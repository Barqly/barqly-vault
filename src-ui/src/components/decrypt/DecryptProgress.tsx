import React from 'react';
import { Shield, Lock, FolderOpen, CheckCircle, Loader2 } from 'lucide-react';
import { ProgressBar } from '../ui/progress-bar';
import { ProgressUpdate } from '../../bindings';

interface DecryptProgressProps {
  progress: ProgressUpdate;
  onCancel?: () => void;
}

interface Phase {
  name: string;
  icon: React.ReactNode;
  progressRange: [number, number];
  status: 'pending' | 'active' | 'completed';
}

const DecryptProgress: React.FC<DecryptProgressProps> = ({ progress, onCancel }) => {
  // Show initial loading animation for smooth transition
  const [isInitializing, setIsInitializing] = React.useState(progress.progress === 0);

  React.useEffect(() => {
    if (progress.progress > 0) {
      setIsInitializing(false);
    }
  }, [progress.progress]);

  const getPhases = (currentProgress: number): Phase[] => {
    return [
      {
        name: 'Validating vault integrity',
        icon: <Shield className="w-4 h-4" />,
        progressRange: [0, 10],
        status: currentProgress >= 10 ? 'completed' : currentProgress > 0 ? 'active' : 'pending',
      },
      {
        name: 'Verifying passphrase',
        icon: <Lock className="w-4 h-4" />,
        progressRange: [10, 20],
        status: currentProgress >= 20 ? 'completed' : currentProgress >= 10 ? 'active' : 'pending',
      },
      {
        name: 'Decrypting files',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        progressRange: [20, 70],
        status: currentProgress >= 70 ? 'completed' : currentProgress >= 20 ? 'active' : 'pending',
      },
      {
        name: 'Extracting and preserving structure',
        icon: <FolderOpen className="w-4 h-4" />,
        progressRange: [70, 90],
        status: currentProgress >= 90 ? 'completed' : currentProgress >= 70 ? 'active' : 'pending',
      },
      {
        name: 'Finalizing recovery',
        icon: <CheckCircle className="w-4 h-4" />,
        progressRange: [90, 100],
        status: currentProgress >= 100 ? 'completed' : currentProgress >= 90 ? 'active' : 'pending',
      },
    ];
  };

  const phases = getPhases(progress.progress);
  const estimatedTimeRemaining = Math.max(0, Math.round((100 - progress.progress) * 0.3)); // Rough estimate

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Decrypting Your Vault
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your files are being securely recovered. This process typically takes under 60 seconds.
        </p>
      </div>

      {/* Main progress bar with smooth initialization */}
      <div className="mb-6">
        <ProgressBar
          value={isInitializing ? 0.02 : progress.progress / 100}
          showPercentage={!isInitializing}
          showStatus={false}
          className={`h-3 ${isInitializing ? 'animate-pulse' : ''}`}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isInitializing
              ? 'Starting decryption process...'
              : progress.message || 'Processing...'}
          </span>
          {!isInitializing && estimatedTimeRemaining > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              About {estimatedTimeRemaining} seconds remaining
            </span>
          )}
        </div>
      </div>

      {/* Phase indicators */}
      <div className="space-y-3 mb-6">
        {phases.map((phase, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 text-sm transition-all duration-300 ${
              phase.status === 'completed'
                ? 'text-green-600 dark:text-green-400'
                : phase.status === 'active'
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <div className="flex-shrink-0">
              {phase.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                phase.icon
              )}
            </div>
            <span className={phase.status === 'active' ? 'animate-pulse' : ''}>{phase.name}</span>
          </div>
        ))}
      </div>

      {/* Cancel button - only available before 90% */}
      {onCancel && progress.progress < 90 && (
        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default DecryptProgress;
