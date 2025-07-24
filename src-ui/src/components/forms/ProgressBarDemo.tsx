import React, { useState } from 'react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Loader2 } from 'lucide-react';
import BackToDemos from '@/components/ui/back-to-demos';
import { ProgressUpdate } from '@/lib/api-types';

const ProgressBarDemo: React.FC = () => {
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string>('');

  const demoScenarios = [
    {
      name: 'File Encryption Progress',
      description: 'Simulates file encryption with progress updates',
      progressUpdate: {
        operation_id: 'demo-encryption-001',
        progress: 0,
        message: 'Starting encryption...',
        timestamp: new Date().toISOString(),
      } as ProgressUpdate,
      duration: 5000,
    },
    {
      name: 'Key Generation Progress',
      description: 'Shows key generation with indeterminate progress',
      progressUpdate: {
        operation_id: 'demo-keygen-001',
        progress: 0,
        message: 'Generating secure key pair...',
        timestamp: new Date().toISOString(),
      } as ProgressUpdate,
      duration: 4000,
    },
    {
      name: 'File Upload Progress',
      description: 'Simulates file upload with detailed progress',
      progressUpdate: {
        operation_id: 'demo-upload-001',
        progress: 0,
        message: 'Preparing files for upload...',
        timestamp: new Date().toISOString(),
      } as ProgressUpdate,
      duration: 6000,
    },
    {
      name: 'System Check Progress',
      description: 'Shows system validation with progress',
      progressUpdate: {
        operation_id: 'demo-system-check-001',
        progress: 0,
        message: 'Validating system requirements...',
        timestamp: new Date().toISOString(),
      } as ProgressUpdate,
      duration: 3500,
    },
  ];

  const handleStartScenario = (scenario: (typeof demoScenarios)[0]) => {
    setCurrentScenario(scenario.name);
    setCurrentProgress(scenario.progressUpdate);
    setIsRunning(true);

    // For determinate progress, update both progress and message
    const messages = [
      'Starting operation...',
      'Processing files...',
      'Applying encryption...',
      'Finalizing...',
      'Operation complete!',
    ];

    let progress = 0;
    let messageIndex = 0;
    const interval = setInterval(() => {
      if (progress < 100) {
        progress += 100 / (scenario.duration / 100);
        messageIndex = Math.floor((progress / 100) * (messages.length - 1));

        setCurrentProgress({
          operation_id: scenario.progressUpdate.operation_id,
          progress: Math.min(progress, 100) / 100, // Convert to 0.0-1.0 range
          message: messages[Math.min(messageIndex, messages.length - 1)],
          timestamp: new Date().toISOString(),
        });
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 100);
  };

  const handleStop = () => {
    setIsRunning(false);
    setCurrentProgress(null);
    setCurrentScenario('');
  };

  const handleReset = () => {
    setCurrentProgress(null);
    setCurrentScenario('');
    setIsRunning(false);
  };

  return (
    <div className="space-y-6 p-6">
      <BackToDemos className="mb-4" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">ProgressBar Component Demo</h2>
            <p className="text-gray-600">
              Interactive demonstration of the ProgressBar component with various progress
              scenarios.
            </p>
          </div>
          <div className="text-sm text-gray-500 font-mono">Task 4.2.2.1</div>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Demo Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoScenarios.map((scenario, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{scenario.name}</h4>
                <Button
                  onClick={() => handleStartScenario(scenario)}
                  disabled={isRunning}
                  size="sm"
                  className="inline-flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start</span>
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3" />
                <span>Determinate • {scenario.duration / 1000}s duration</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={handleStop}
          disabled={!isRunning}
          variant="outline"
          className="inline-flex items-center space-x-2"
        >
          <Pause className="w-4 h-4" />
          <span>Stop</span>
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="inline-flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </Button>
      </div>

      {/* Current Progress Display */}
      {currentProgress && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Progress: {currentScenario}</h3>
            <div className="text-sm text-gray-500">
              {`${Math.round(currentProgress.progress * 100)}%`}
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
            <ProgressBar progressUpdate={currentProgress} />
          </div>

          <div className="text-sm text-gray-600">
            <strong>Message:</strong> {currentProgress.message}
          </div>
        </div>
      )}

      {/* Component Features */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Component Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Progress Types</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Determinate - Shows exact progress percentage</li>
              <li>• Indeterminate - Animated loading for unknown duration</li>
              <li>• Status messages - Dynamic text updates</li>
              <li>• Progress clamping - Handles out-of-range values</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Visual Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Smooth progress animations</li>
              <li>• Loading spinner for indeterminate mode</li>
              <li>• Success checkmark on completion</li>
              <li>• Responsive design</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Accessibility</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ARIA progressbar role</li>
              <li>• aria-valuenow, aria-valuemin, aria-valuemax</li>
              <li>• aria-label for screen readers</li>
              <li>• Keyboard navigation support</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Integration</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Tauri command integration</li>
              <li>• ProgressUpdate interface</li>
              <li>• Real-time progress updates</li>
              <li>• Error state handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBarDemo;
