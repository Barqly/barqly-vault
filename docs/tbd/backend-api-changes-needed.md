# Backend API Changes Needed for Encrypt Page

## 1. encrypt_files Command Enhancement

**Current Interface:**
```typescript
interface EncryptDataInput {
  keyId: string;
  filePaths: string[];
  outputName?: string;  // Only the name, not the full path
}
```

**Issue:**
The frontend Encrypt Page allows users to select an output directory for the encrypted file, but the backend `encrypt_files` command doesn't accept an output path parameter. This means encrypted files are always saved to a default location.

**Proposed Change:**
Add an optional `outputPath` parameter to the `EncryptDataInput`:

```typescript
interface EncryptDataInput {
  keyId: string;
  filePaths: string[];
  outputName?: string;   // Optional custom name for the output file
  outputPath?: string;   // Optional directory path where the encrypted file should be saved
}
```

**Backend Implementation Notes:**
- If `outputPath` is not provided, use the current default behavior
- If `outputPath` is provided, validate that:
  - The directory exists
  - The user has write permissions
  - There's sufficient disk space
- The final output file path would be: `${outputPath}/${outputName || generated_name}.age`

## 2. File Selection Via Drag and Drop

**Current Limitation:**
Due to web security restrictions in Tauri, drag-and-drop file operations cannot provide full file paths through the browser's drag API. Currently, dropping files triggers the native file dialog as a workaround.

**Possible Enhancement:**
Consider implementing a Tauri plugin or custom protocol handler that can:
1. Accept file drops at the native level
2. Extract full file paths securely
3. Pass them to the frontend through a secure channel

This would provide a more seamless drag-and-drop experience without requiring the file dialog.

## 3. Progress Event Naming

**Current:**
The progress event is named `encryption-progress`

**Consideration:**
Ensure this event name is consistently used and documented in the backend. The frontend expects updates on this event channel during encryption operations.

## Temporary Frontend Workaround

Until the backend changes are implemented, the frontend will:
1. Store the selected output path in component state but not send it to the backend
2. Display a note to users that files will be saved to the default location
3. Show the actual save location after encryption completes (returned by the backend)