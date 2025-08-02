import React, { useState } from 'react';
import { logger } from '../../lib/logger';

const TauriDiagnostics: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults((prev) => [...prev, result]);
    logger.info('TauriDiagnostics', result);
  };

  const runDiagnostics = async () => {
    setTestResults([]);
    addResult('Starting Tauri diagnostics...');

    // Test 1: Check window.__TAURI__
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      addResult('✅ window.__TAURI__ is available');
      const tauriKeys = Object.keys((window as any).__TAURI__);
      addResult(`   Keys: ${tauriKeys.join(', ')}`);

      // Check core
      if ((window as any).__TAURI__.core) {
        addResult('✅ window.__TAURI__.core is available');
        const coreKeys = Object.keys((window as any).__TAURI__.core);
        addResult(`   Core keys: ${coreKeys.join(', ')}`);

        // Test direct invoke
        if ((window as any).__TAURI__.core.invoke) {
          addResult('✅ invoke function found');

          // Test validate_passphrase command
          try {
            addResult('📡 Testing validate_passphrase command...');
            const result = await (window as any).__TAURI__.core.invoke('validate_passphrase', {
              input: { passphrase: 'TestPassword123!' },
            });
            addResult(`✅ validate_passphrase succeeded: ${JSON.stringify(result)}`);
          } catch (error) {
            addResult(`❌ validate_passphrase failed: ${error}`);
          }

          // Test generate_key command with exact structure
          try {
            addResult('📡 Testing generate_key command structure...');
            const testInput = {
              input: {
                label: 'test-key',
                passphrase: 'TestPassword123!',
              },
            };
            addResult(`   Input: ${JSON.stringify(testInput)}`);

            const result = await (window as any).__TAURI__.core.invoke('generate_key', testInput);
            addResult(`✅ generate_key succeeded: ${JSON.stringify(result)}`);
          } catch (error: any) {
            addResult(`❌ generate_key failed: ${error}`);
            if (error && typeof error === 'object') {
              addResult(`   Error details: ${JSON.stringify(error)}`);
            }
          }
        } else {
          addResult('❌ invoke function not found in core');
        }
      } else {
        addResult('❌ window.__TAURI__.core not available');
      }
    } else {
      addResult('❌ window.__TAURI__ not available');
    }

    // Test dynamic imports
    try {
      addResult('📡 Testing dynamic import @tauri-apps/api/core...');
      const { invoke } = await import('@tauri-apps/api/core');
      addResult('✅ Dynamic import successful');

      // Test with dynamic import
      try {
        const result = await invoke('validate_passphrase', {
          input: { passphrase: 'TestPassword123!' },
        });
        addResult(`✅ Dynamic invoke succeeded: ${JSON.stringify(result)}`);
      } catch (error) {
        addResult(`❌ Dynamic invoke failed: ${error}`);
      }
    } catch (error) {
      addResult(`❌ Dynamic import failed: ${error}`);
    }

    addResult('Diagnostics complete!');
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto z-50">
      <h3 className="font-semibold mb-2">Tauri Diagnostics</h3>
      <button
        onClick={runDiagnostics}
        className="mb-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Run Diagnostics
      </button>
      <div className="space-y-1 text-xs font-mono">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={
              result.includes('❌')
                ? 'text-red-600'
                : result.includes('✅')
                  ? 'text-green-600'
                  : 'text-gray-700'
            }
          >
            {result}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TauriDiagnostics;
