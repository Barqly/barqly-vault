/**
 * Comprehensive logging system for Barqly Vault
 * Provides structured logging with different levels and desktop/web compatibility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private enabled: boolean = true;
  private logLevel: LogLevel = 'debug';
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private constructor() {
    // Check if debug mode is enabled via localStorage or environment
    if (typeof window !== 'undefined') {
      const debugMode = localStorage.getItem('barqly-debug-mode');
      this.enabled = debugMode === 'true' || import.meta.env.DEV;

      const storedLevel = localStorage.getItem('barqly-log-level') as LogLevel;
      if (storedLevel) {
        this.logLevel = storedLevel;
      }
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabled && this.levelPriority[level] >= this.levelPriority[this.logLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, context, message, data } = entry;
    let formatted = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;

    if (data !== undefined) {
      formatted += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }

    return formatted;
  }

  private log(level: LogLevel, context: string, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
      error,
    };

    // Store in memory for later retrieval
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const formattedMessage = this.formatMessage(entry);

    // Console output with appropriate styling
    switch (level) {
      case 'debug':
        console.log('%c' + formattedMessage, 'color: #888');
        break;
      case 'info':
        console.info('%c' + formattedMessage, 'color: #0066cc');
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        if (error) {
          console.error('Stack trace:', error.stack);
        }
        break;
    }

    // Log data object separately for better inspection
    if (data !== undefined && level !== 'debug') {
      console.log('Additional data:', data);
    }
  }

  debug(context: string, message: string, data?: any): void {
    this.log('debug', context, message, data);
  }

  info(context: string, message: string, data?: any): void {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: any): void {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, error?: Error, data?: any): void {
    this.log('error', context, message, data, error);
  }

  // Utility methods
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('barqly-debug-mode', enabled.toString());
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    if (typeof window !== 'undefined') {
      localStorage.setItem('barqly-log-level', level);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return this.logs.map((entry) => this.formatMessage(entry)).join('\n');
  }

  // Helper to log Tauri API calls
  logTauriCall(command: string, args: any, response?: any, error?: Error): void {
    const context = 'TauriAPI';

    if (error) {
      this.error(context, `Command failed: ${command}`, error, { args, response });
    } else {
      this.info(context, `Command executed: ${command}`, { args, response });
    }
  }

  // Helper to log React component lifecycle
  logComponentLifecycle(componentName: string, event: string, data?: any): void {
    this.debug(`Component:${componentName}`, event, data);
  }

  // Helper to log hook execution
  logHook(hookName: string, action: string, data?: any): void {
    this.debug(`Hook:${hookName}`, action, data);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (context: string, message: string, data?: any) =>
  logger.debug(context, message, data);

export const logInfo = (context: string, message: string, data?: any) =>
  logger.info(context, message, data);

export const logWarn = (context: string, message: string, data?: any) =>
  logger.warn(context, message, data);

export const logError = (context: string, message: string, error?: Error, data?: any) =>
  logger.error(context, message, error, data);

// Development helpers
if (import.meta.env.DEV) {
  // Expose logger to window for debugging
  (window as any).__barqlyLogger = logger;
  console.log('Barqly Logger available at window.__barqlyLogger');
}
