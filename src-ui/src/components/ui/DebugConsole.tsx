import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Bug, X, Copy, Trash2 } from 'lucide-react';
import { logger } from '../../lib/logger';

interface DebugConsoleProps {
  enabled?: boolean;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ enabled = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState(logger.getLogs());
  const [logLevel, setLogLevel] = useState<'debug' | 'info' | 'warn' | 'error'>('debug');

  useEffect(() => {
    if (!enabled) return;

    // Update logs every 500ms
    const interval = setInterval(() => {
      setLogs([...logger.getLogs()]);
    }, 500);

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled || !import.meta.env.DEV) {
    return null;
  }

  const handleCopyLogs = () => {
    const logText = logger.exportLogs();
    navigator.clipboard.writeText(logText);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const handleLogLevelChange = (level: 'debug' | 'info' | 'warn' | 'error') => {
    setLogLevel(level);
    logger.setLogLevel(level);
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'debug':
        return 'text-gray-500';
      case 'info':
        return 'text-blue-600';
      case 'warn':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full max-w-4xl">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -top-10 right-4 bg-gray-900 text-white px-4 py-2 rounded-t-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
        aria-label={isOpen ? 'Close debug console' : 'Open debug console'}
      >
        <Bug className="w-4 h-4" />
        <span className="text-sm font-medium">Debug Console</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Console Panel */}
      {isOpen && (
        <div className="bg-gray-900 text-gray-100 shadow-2xl border-t border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Debug Logs ({logs.length})</span>

              {/* Log Level Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Level:</span>
                <select
                  value={logLevel}
                  onChange={(e) => handleLogLevelChange(e.target.value as any)}
                  className="bg-gray-700 text-gray-100 text-xs px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                aria-label="Copy logs"
                title="Copy logs"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearLogs}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                aria-label="Clear logs"
                title="Clear logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                aria-label="Close console"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Log Content */}
          <div className="h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No logs yet...</div>
            ) : (
              <div className="p-2 space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-800 rounded transition-colors break-all"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`flex-shrink-0 font-semibold ${getLogColor(log.level)}`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-purple-400 flex-shrink-0">[{log.context}]</span>
                      <span className="text-gray-100 flex-1">{log.message}</span>
                    </div>

                    {log.data && (
                      <div className="mt-1 ml-4 text-gray-400 text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.error && (
                      <div className="mt-1 ml-4 text-red-400 text-xs">
                        <div>Error: {log.error.message}</div>
                        {log.error.stack && (
                          <pre className="mt-1 text-gray-500 whitespace-pre-wrap">
                            {log.error.stack}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugConsole;
