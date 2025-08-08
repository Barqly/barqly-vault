import React from 'react';
import { ProgressBar } from '../ui/progress-bar';
import ProgressContext from '../ui/ProgressContext';

interface SetupProgressPanelProps {
  progress: {
    progress: number;
    message: string;
  };
}

/**
 * Progress panel for key generation
 * Shows progress bar and status message
 */
const SetupProgressPanel: React.FC<SetupProgressPanelProps> = ({ progress }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <ProgressContext variant="secure" customMessage="Generating strong encryption keys..." />
      <div className="mt-4">
        <ProgressBar
          value={progress.progress}
          statusMessage={progress.message}
          showPercentage={true}
          showStatus={true}
        />
      </div>
    </div>
  );
};

export default SetupProgressPanel;
