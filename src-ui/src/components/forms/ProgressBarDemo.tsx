import React, { useState, useEffect } from 'react';
import { ProgressBar } from '../ui/progress-bar';
import { Button } from '../ui/button';
import { ProgressUpdate } from '../../lib/api-types';

const ProgressBarDemo: React.FC = () => {
  const [determinateProgress, setDeterminateProgress] = useState(0);
  const [indeterminateActive, setIndeterminateActive] = useState(false);
  const [apiProgress, setApiProgress] = useState<ProgressUpdate | null>(null);
  const [demoMode, setDemoMode] = useState<'determinate' | 'indeterminate' | 'api'>('determinate');

  // Simulate determinate progress
  useEffect(() => {
    if (demoMode === 'determinate' && determinateProgress < 1) {
      const timer = setTimeout(() => {
        setDeterminateProgress((prev) => Math.min(prev + 0.1, 1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [determinateProgress, demoMode]);

  // Simulate indeterminate progress
  useEffect(() => {
    if (demoMode === 'indeterminate' && indeterminateActive) {
      const timer = setTimeout(() => {
        setIndeterminateActive(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [indeterminateActive, demoMode]);

  // Simulate API progress updates
  useEffect(() => {
    if (demoMode === 'api') {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.1;
        if (progress <= 1) {
          const mockProgressUpdate: ProgressUpdate = {
            operation_id: 'demo-op-123',
            progress,
            message: progress >= 1 ? 'Encryption complete!' : 'Encrypting wallet files...',
            timestamp: new Date().toISOString(),
            estimated_time_remaining: progress >= 1 ? undefined : Math.max(0, (1 - progress) * 10),
            details: {
              type: 'FileOperation',
              current_file:
                progress < 0.3
                  ? 'wallet.dat'
                  : progress < 0.6
                    ? 'output_descriptors.json'
                    : 'backup_keys.txt',
              total_files: 3,
              current_file_progress: Math.floor(progress * 3) + 1,
              current_file_size: 1024 * 1024,
              total_size: 3 * 1024 * 1024,
            },
          };
          setApiProgress(mockProgressUpdate);
        } else {
          clearInterval(interval);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [demoMode]);

  const resetDemo = () => {
    setDeterminateProgress(0);
    setIndeterminateActive(false);
    setApiProgress(null);
  };

  const startIndeterminate = () => {
    setIndeterminateActive(true);
  };

  return (
    <div className="space-y-8 p-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">ProgressBar Component Demo</h2>
        <p className="text-muted-foreground">
          Demonstrating different progress bar modes and API integration
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={demoMode === 'determinate' ? 'default' : 'outline'}
          onClick={() => setDemoMode('determinate')}
        >
          Determinate
        </Button>
        <Button
          variant={demoMode === 'indeterminate' ? 'default' : 'outline'}
          onClick={() => setDemoMode('indeterminate')}
        >
          Indeterminate
        </Button>
        <Button
          variant={demoMode === 'api' ? 'default' : 'outline'}
          onClick={() => setDemoMode('api')}
        >
          API Integration
        </Button>
        <Button variant="outline" onClick={resetDemo}>
          Reset
        </Button>
      </div>

      {/* Determinate Progress Demo */}
      {demoMode === 'determinate' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Determinate Progress</h3>
          <ProgressBar
            value={determinateProgress}
            showPercentage
            showStatus
            onComplete={() => console.log('Progress complete!')}
          />
          <div className="text-sm text-muted-foreground">
            Progress: {Math.round(determinateProgress * 100)}%
          </div>
        </div>
      )}

      {/* Indeterminate Progress Demo */}
      {demoMode === 'indeterminate' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Indeterminate Progress</h3>
          <ProgressBar
            indeterminate={indeterminateActive}
            showStatus
            statusMessage={indeterminateActive ? 'Processing...' : 'Ready to start'}
          />
          <div className="flex gap-2">
            <Button onClick={startIndeterminate} disabled={indeterminateActive}>
              Start Processing
            </Button>
          </div>
        </div>
      )}

      {/* API Integration Demo */}
      {demoMode === 'api' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">API Integration Demo</h3>
          <ProgressBar
            progressUpdate={apiProgress}
            showPercentage
            showStatus
            onComplete={() => console.log('API operation complete!')}
          />
          {apiProgress && (
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Operation ID: {apiProgress.operation_id}</div>
              <div>Progress: {Math.round(apiProgress.progress * 100)}%</div>
              <div>Message: {apiProgress.message}</div>
              {apiProgress.estimated_time_remaining && (
                <div>Time Remaining: {apiProgress.estimated_time_remaining}s</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Size Variants Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Size Variants</h3>
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Small</label>
            <ProgressBar value={0.6} size="sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Default</label>
            <ProgressBar value={0.6} />
          </div>
          <div>
            <label className="text-sm font-medium">Large</label>
            <ProgressBar value={0.6} size="lg" />
          </div>
        </div>
      </div>

      {/* Color Variants Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Color Variants</h3>
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Default</label>
            <ProgressBar value={0.7} />
          </div>
          <div>
            <label className="text-sm font-medium">Success</label>
            <ProgressBar value={1.0} variant="success" />
          </div>
          <div>
            <label className="text-sm font-medium">Warning</label>
            <ProgressBar value={0.8} variant="warning" />
          </div>
          <div>
            <label className="text-sm font-medium">Error</label>
            <ProgressBar value={0.3} variant="error" />
          </div>
        </div>
      </div>

      {/* Accessibility Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Accessibility Features</h3>
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">With Status (Screen Reader Friendly)</label>
            <ProgressBar value={0.45} showStatus statusMessage="Encrypting wallet backup files" />
          </div>
          <div>
            <label className="text-sm font-medium">Without Status (Minimal)</label>
            <ProgressBar value={0.45} showStatus={false} showPercentage={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBarDemo;
