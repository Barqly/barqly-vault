# Desktop App Debugging Guide

## Overview
This guide documents the comprehensive logging and debugging infrastructure implemented to troubleshoot desktop app issues in Barqly Vault.

## Implemented Solutions

### 1. Comprehensive Logging Infrastructure (`src-ui/src/lib/logger.ts`)
- **Structured Logging**: Implemented a robust logger with different log levels (debug, info, warn, error)
- **Contextual Information**: Each log entry includes timestamp, context, and structured data
- **Memory Storage**: Logs are stored in memory for real-time debugging
- **Browser Console Integration**: Logs appear in the browser console with appropriate styling

Key features:
```typescript
logger.info('Context', 'Message', { data });
logger.error('Context', 'Error message', error, { additionalData });
logger.logHook('HookName', 'Action', { data });
logger.logComponentLifecycle('ComponentName', 'Event', { data });
```

### 2. Enhanced SafeInvoke with Logging (`src-ui/src/lib/utils.ts`)
- **Detailed Error Tracking**: Logs every step of the Tauri invocation process
- **Performance Metrics**: Tracks command execution time
- **Error Context**: Captures detailed error information including stack traces
- **Environment Validation**: Checks for Tauri availability before attempting commands

### 3. Debug Console Component (`src-ui/src/components/ui/DebugConsole.tsx`)
- **Real-time Log Display**: Shows logs in a floating console at the bottom of the screen
- **Log Level Filtering**: Filter logs by level (debug, info, warn, error)
- **Export Functionality**: Copy all logs to clipboard for sharing
- **Clear Logs**: Reset the log buffer
- **Development Only**: Only appears in development mode

### 4. Tauri Diagnostics Component (`src-ui/src/components/ui/TauriDiagnostics.tsx`)
- **Environment Testing**: Tests Tauri API availability
- **Command Testing**: Directly tests Tauri commands
- **API Structure Inspection**: Shows available Tauri modules and functions
- **Visual Results**: Shows test results with clear pass/fail indicators

### 5. Automated Debug Script (`src-ui/src/lib/debug-tauri.ts`)
- **Auto-runs on Load**: Automatically performs diagnostics in development
- **Window Object Inspection**: Logs all Tauri-related window properties
- **Import Testing**: Tests both direct and dynamic imports
- **Command Validation**: Tests actual command invocation

## Using the Debug Tools

### 1. Enable Debug Mode
The logging is automatically enabled in development mode. To manually control it:

```javascript
// In browser console
__barqlyLogger.setEnabled(true);
__barqlyLogger.setLogLevel('debug');
```

### 2. View Debug Console
- Look for the "Debug Console" button at the bottom-right of the screen
- Click to expand and view real-time logs
- Use the log level dropdown to filter messages
- Click the copy button to export logs

### 3. Run Tauri Diagnostics
- Look for the "Tauri Diagnostics" panel in the top-right corner
- Click "Run Diagnostics" to test the Tauri environment
- Review the results to identify issues

### 4. Check Console Logs
Open the browser DevTools console to see:
- Platform detection results
- Tauri API availability
- Command invocation details
- Error stack traces

## Common Issues and Solutions

### Issue: "Tauri API not available"
**Cause**: The app is running in a browser instead of the desktop app
**Solution**: Ensure you're running `npm run app` or `make app`

### Issue: "Internal Error - An unexpected error occurred"
**Debug Steps**:
1. Check the Debug Console for detailed error logs
2. Look for the actual error message and stack trace
3. Check if the command parameters match the backend expectations
4. Verify the Tauri command is registered in `src-tauri/src/lib.rs`

### Issue: Command parameters mismatch
**Debug Steps**:
1. Check the exact parameter structure in the Rust command definition
2. Verify the TypeScript types match the Rust structs
3. Look for serialization errors in the logs

## Configuration Changes

### Tauri Configuration (`src-tauri/tauri.conf.json`)
Added `"withGlobalTauri": true` to expose the global `window.__TAURI__` object:

```json
"app": {
  "withGlobalTauri": true,
  ...
}
```

## Backend Command Structure

The `generate_key` command expects:
```rust
pub struct GenerateKeyInput {
    pub label: String,
    pub passphrase: String,
}
```

And returns:
```rust
pub struct GenerateKeyResponse {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: String,
}
```

## Best Practices for Future Debugging

1. **Always Log Command Invocations**: Use the logger to track all Tauri commands
2. **Include Context**: Pass context strings to help identify where errors occur
3. **Log Data Structures**: Log input parameters and response structures
4. **Check Type Compatibility**: Ensure TypeScript types match Rust structs exactly
5. **Use Debug Tools**: Leverage the Debug Console and Diagnostics panel during development

## Removing Debug Tools for Production

Before building for production:
1. The Debug Console and Diagnostics components only render in development mode
2. Logging can be disabled by setting `enabled: false` in the logger
3. Remove or comment out the debug script import in `App.tsx` if needed