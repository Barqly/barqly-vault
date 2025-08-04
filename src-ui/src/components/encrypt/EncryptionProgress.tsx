import React, { useEffect, useState } from 'react';
import { Lock, CheckCircle, Circle, Loader2 } from 'lucide-react';
import { ProgressUpdate } from '../../lib/api-types';

interface EncryptionProgressProps {
  progress: ProgressUpdate | null;
  onCancel?: () => void;
  showCancel?: boolean;
}

interface Stage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
}

const EncryptionProgress: React.FC<EncryptionProgressProps> = ({
  progress,
  onCancel,
  showCancel = true,
}) => {
  const [stages, setStages] = useState<Stage[]>([
    { id: 'preparing', label: 'Preparing files', status: 'pending' },
    { id: 'archiving', label: 'Creating secure archive', status: 'pending' },
    { id: 'encrypting', label: 'Applying encryption', status: 'pending' },
    { id: 'finalizing', label: 'Finalizing vault', status: 'pending' },
  ]);

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  // Update stages based on progress
  useEffect(() => {
    if (!progress) return;

    const progressPercent = progress.progress;
    let updatedStages = [...stages];

    if (progressPercent < 10) {
      updatedStages[0].status = 'active';
    } else if (progressPercent < 40) {
      updatedStages[0].status = 'complete';
      updatedStages[1].status = 'active';
    } else if (progressPercent < 90) {
      updatedStages[0].status = 'complete';
      updatedStages[1].status = 'complete';
      updatedStages[2].status = 'active';
    } else {
      updatedStages[0].status = 'complete';
      updatedStages[1].status = 'complete';
      updatedStages[2].status = 'complete';
      updatedStages[3].status = 'active';
    }

    setStages(updatedStages);
  }, [progress]);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const estimateTimeRemaining = (): string => {
    if (!progress || progress.progress === 0) return 'Calculating...';
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = progress.progress / elapsed;
    const remaining = (100 - progress.progress) / rate;
    return `~${Math.ceil(remaining)} seconds`;
  };

  const canCancel = showCancel && progress && progress.progress < 90;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <Lock className="w-16 h-16 text-blue-600" />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Creating Your Encrypted Vault
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Your files are being secured with military-grade encryption
        </p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{progress?.message || 'Initializing...'}</span>
            <span>{progress ? `${Math.round(progress.progress)}%` : '0%'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress?.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Stage List */}
        <div className="space-y-3 mb-6">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-3">
              {stage.status === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : stage.status === 'active' ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  stage.status === 'complete'
                    ? 'text-green-600 font-medium'
                    : stage.status === 'active'
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        {/* Time Information */}
        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>Time elapsed: {formatTime(timeElapsed)}</span>
          <span>Remaining: {estimateTimeRemaining()}</span>
        </div>

        {/* Cancel Button */}
        {canCancel && (
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel Operation
            </button>
          </div>
        )}

        {!canCancel && progress && progress.progress >= 90 && (
          <p className="text-xs text-gray-500 text-center">Finalizing... Please wait</p>
        )}
      </div>
    </div>
  );
};

export default EncryptionProgress;
