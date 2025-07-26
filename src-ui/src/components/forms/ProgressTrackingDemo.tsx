import React, { useState } from 'react';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { Play, RefreshCw, Activity, Square } from 'lucide-react';

const ProgressTrackingDemo: React.FC = () => {
  const [operationId, setOperationId] = useState('');
  const [operationType, setOperationType] = useState<
    'encryption' | 'decryption' | 'key-generation'
  >('encryption');

  const { startTracking, stopTracking, progress, error, reset } =
    useProgressTracking('demo-progress');

  const [isActive, setIsActive] = useState(false);

  const handleStartTracking = async () => {
    try {
      const id = operationId || `demo-${operationType}-${Date.now()}`;
      await startTracking(id);
      setIsActive(true);
    } catch (_error) {
      // Error is handled by the hook
    }
  };

  const handleStopTracking = async () => {
    try {
      stopTracking();
      setIsActive(false);
    } catch (_error) {
      // Error is handled by the hook
    }
  };

  const handleReset = () => {
    setOperationId('');
    setOperationType('encryption');
    reset();
  };

  const generateMockOperationId = () => {
    const id = `demo-${operationType}-${Date.now()}`;
    setOperationId(id);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4">
        <a href="/demo" className="text-blue-600 hover:text-blue-800">
          ← Back to Demos
        </a>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Progress Tracking Hook Demo</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Interactive demonstration of the useProgressTracking hook showing progress monitoring,
          control functions, and error handling for long-running operations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demo Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Progress Tracking Demo
            </h3>
            <p className="text-gray-600 text-sm">
              Test progress tracking with different operation types and control functions
            </p>
          </div>
          <div className="space-y-6">
            {/* Configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operation Type
                </label>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value as any)}
                  disabled={isActive}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="encryption">File Encryption</option>
                  <option value="decryption">File Decryption</option>
                  <option value="key-generation">Key Generation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operation ID (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={operationId}
                    onChange={(e) => setOperationId(e.target.value)}
                    placeholder="Enter operation ID or leave empty for auto-generated"
                    disabled={isActive}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateMockOperationId}
                    disabled={isActive}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={handleStartTracking}
                  disabled={isActive}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isActive ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      Tracking...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2 inline" />
                      Start Tracking
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isActive}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {isActive && (
                <div className="flex gap-2">
                  <button
                    onClick={handleStopTracking}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Square className="w-4 h-4 mr-2 inline" />
                    Stop
                  </button>
                </div>
              )}
            </div>

            {/* Status Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Status</span>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  )}
                  <span className="text-sm text-gray-600">{isActive ? 'Tracking' : 'Idle'}</span>
                </div>
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{progress.message}</p>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                  <button onClick={reset} className="text-red-400 hover:text-red-600">
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documentation Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Hook Features</h3>
            <p className="text-gray-600 text-sm">
              Key capabilities of the useProgressTracking hook
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Operation Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Start and stop progress tracking for any operation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Real-time Updates</h4>
                  <p className="text-sm text-gray-600">
                    Receive real-time progress updates with detailed messages
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Timing Information</h4>
                  <p className="text-sm text-gray-600">
                    Track operation start and end times for performance analysis
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Error Handling</h4>
                  <p className="text-sm text-gray-600">
                    Automatic error detection and handling with recovery options
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Test Scenarios</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Start tracking to see progress updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Stop tracking to see cleanup behavior</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Try different operation types</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Reset to clear all state</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">State Management</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  • <strong>isActive</strong>: Whether tracking is active
                </div>
                <div>
                  • <strong>progress</strong>: Current progress data
                </div>
                <div>
                  • <strong>error</strong>: Error state with details
                </div>
                <div>
                  • <strong>startTime</strong>: When tracking started
                </div>
                <div>
                  • <strong>endTime</strong>: When tracking ended
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Control Functions</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  • <strong>startTracking</strong>: Begin tracking an operation
                </div>
                <div>
                  • <strong>stopTracking</strong>: Stop and cleanup tracking
                </div>
                <div>
                  • <strong>reset</strong>: Reset all state
                </div>
                <div>
                  • <strong>clearError</strong>: Clear error state
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTrackingDemo;
