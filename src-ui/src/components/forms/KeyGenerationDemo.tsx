import React, { useState } from 'react';
import { useKeyGeneration } from '@/hooks/useKeyGeneration';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorMessage } from '@/components/ui/error-message';
import { SuccessMessage } from '@/components/ui/success-message';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Key, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import BackToDemos from '@/components/ui/back-to-demos';

const KeyGenerationDemo: React.FC = () => {
  const [label, setLabel] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');

  const { generateKey, isLoading, error, success, progress, reset, clearError } =
    useKeyGeneration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passphrase !== confirmPassphrase) {
      return;
    }

    try {
      await generateKey();
    } catch (_error) {
      // Error is handled by the hook
    }
  };

  const handleReset = () => {
    setLabel('');
    setPassphrase('');
    setConfirmPassphrase('');
    reset();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <BackToDemos />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Key Generation Hook Demo</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Interactive demonstration of the useKeyGeneration hook showing key generation workflow,
          validation, progress tracking, and error handling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demo Section */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Key className="w-5 h-5" />
              Key Generation Demo
            </h3>
            <p className="text-gray-600 text-sm">
              Test the key generation workflow with form validation and progress tracking
            </p>
          </div>
          <div className="space-y-6">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
                  Key Label
                </label>
                <input
                  id="label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter a label for your key"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="passphrase"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Passphrase
                </label>
                <input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter a secure passphrase"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassphrase"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Passphrase
                </label>
                <input
                  id="confirmPassphrase"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Confirm your passphrase"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {passphrase && confirmPassphrase && passphrase !== confirmPassphrase && (
                  <p className="text-sm text-red-600 mt-1">Passphrases do not match</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading || !label || !passphrase || passphrase !== confirmPassphrase}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Generating Key...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Generate Key
                    </>
                  )}
                </Button>

                <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {/* Progress */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress.progress * 100)}%</span>
                </div>
                <ProgressBar value={progress.progress} />
                <p className="text-sm text-gray-600">{progress.message}</p>
              </div>
            )}

            {/* Error Display */}
            {error && <ErrorMessage error={error} onClose={clearError} showCloseButton />}

            {/* Success Display */}
            {success && (
              <div className="space-y-4">
                <SuccessMessage
                  title="Key Generated Successfully!"
                  message={`Key "${success.key_id}" has been created and saved.`}
                  showCloseButton
                />

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Generated Key Details
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Key ID</label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1">
                          {success.key_id}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(success.key_id)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Public Key</label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1 font-mono text-xs">
                          {success.public_key.substring(0, 50)}...
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(success.public_key)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Saved Location</label>
                      <code className="text-sm bg-white px-2 py-1 rounded border block">
                        {success.saved_path}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documentation Section */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="mb-4">
            <h3 className="text-xl font-semibold">Hook Features</h3>
            <p className="text-gray-600 text-sm">Key capabilities of the useKeyGeneration hook</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Input Validation</h4>
                  <p className="text-sm text-gray-600">
                    Validates key label format, passphrase strength, and required fields
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Progress Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Real-time progress updates during key generation process
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Error Handling</h4>
                  <p className="text-sm text-gray-600">
                    Structured error messages with recovery guidance
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">State Management</h4>
                  <p className="text-sm text-gray-600">
                    Loading states, success handling, and state reset functionality
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Test Scenarios</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Try empty fields to see validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Use weak passphrase to test strength validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Mismatch passphrases to see confirmation validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Generate key to see progress and success states</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyGenerationDemo;
