import React from 'react';
import { Shield, Lock, FolderOpen, CheckCircle, Loader2 } from 'lucide-react';
import { ProgressBar } from '../ui/progress-bar';
import { ProgressUpdate } from '../../lib/api-types';

interface EncryptionProgressProps {
  progress: ProgressUpdate;
  onCancel?: () => void;
}

interface Phase {
  name: string;
  icon: React.ReactNode;
  progressRange: [number, number];
  status: 'pending' | 'active' | 'completed';
}

const EncryptionProgress: React.FC<EncryptionProgressProps> = ({ progress, onCancel }) => {
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
        name: 'Preparing files for encryption',
        icon: <Shield className="w-4 h-4" />,
        progressRange: [0, 10],
        status: currentProgress >= 10 ? 'completed' : currentProgress > 0 ? 'active' : 'pending',
      },
      {
        name: 'Creating secure archive',
        icon: <Lock className="w-4 h-4" />,
        progressRange: [10, 20],
        status: currentProgress >= 20 ? 'completed' : currentProgress >= 10 ? 'active' : 'pending',
      },
      {
        name: 'Applying military-grade encryption',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        progressRange: [20, 70],
        status: currentProgress >= 70 ? 'completed' : currentProgress >= 20 ? 'active' : 'pending',
      },
      {
        name: 'Finalizing vault structure',
        icon: <FolderOpen className="w-4 h-4" />,
        progressRange: [70, 90],
        status: currentProgress >= 90 ? 'completed' : currentProgress >= 70 ? 'active' : 'pending',
      },
      {
        name: 'Securing final vault',
        icon: <CheckCircle className="w-4 h-4" />,
        progressRange: [90, 100],
        status: currentProgress >= 100 ? 'completed' : currentProgress >= 90 ? 'active' : 'pending',
      },
    ];
  };

  const phases = getPhases(progress.progress);
  const estimatedTimeRemaining = Math.max(0, Math.round((100 - progress.progress) * 0.3)); // Rough estimate

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-6"
      data-testid="encryption-progress"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Your Encrypted Vault</h3>
        <p className="text-sm text-gray-600">
          Your files are being securely encrypted. This process typically takes under 60 seconds.
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
          <span className="text-sm text-gray-500">
            {isInitializing
              ? 'Starting encryption process...'
              : progress.message || 'Processing...'}
          </span>
          {!isInitializing && estimatedTimeRemaining > 0 && (
            <span className="text-sm text-gray-500">
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
                ? 'text-green-600'
                : phase.status === 'active'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-400'
            }`}
          >
            <div className="flex-shrink-0">
              {phase.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
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
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default EncryptionProgress;
