# API Quick Reference for UX Engineer

> **New to the team?** Start with the [UX Engineer Onboarding Guide](./UX-Engineer-Onboarding.md) for a complete introduction.

## 🚀 **Getting Started**

### **1. Generate TypeScript Definitions**
```bash
cd src-tauri
cargo build --features generate-types
```

### **2. Import in Frontend**
```typescript
import { invokeCommand, CommandError, ErrorCode } from './generated/types';
```

### **3. Basic Usage Pattern**
```typescript
try {
  const result = await invokeCommand<ResponseType>('command_name', input);
  // Handle success
} catch (error) {
  if (error instanceof CommandError) {
    // Handle structured error
  }
}
```

## 📋 **Available Commands**

### **🔐 Crypto Operations**

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `generate_key` | Create encryption keypair | `{ label, passphrase }` | `{ public_key, key_id, saved_path }` |
| `validate_passphrase` | Check passphrase strength | `{ passphrase }` | `{ is_valid, message }` |
| `encrypt_files` | Encrypt files | `{ key_id, file_paths, output_name? }` | `string` (operation_id) |
| `decrypt_data` | Decrypt files | `{ encrypted_file, key_id, passphrase, output_dir }` | `{ extracted_files, output_dir, manifest_verified }` |
| `get_encryption_status` | Check encryption progress | `{ operation_id }` | `{ status, progress_percentage, ... }` |
| `get_progress` | Get operation progress | `{ operation_id }` | `{ progress, message, is_complete, ... }` |
| `verify_manifest` | Verify extracted files | `{ manifest_path, extracted_files_dir }` | `{ is_valid, message, file_count, total_size }` |

### **💾 Storage Operations**

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `list_keys` | List all keys | `none` | `KeyMetadata[]` |
| `delete_key` | Delete a key | `key_id` | `void` |
| `get_config` | Get app config | `none` | `AppConfig` |
| `update_config` | Update app config | `AppConfigUpdate` | `AppConfig` |

### **📁 File Operations**

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `select_files` | Select files/folders | `SelectionType` | `FileSelection` |
| `get_file_info` | Get file details | `file_path` | `FileInfo` |
| `create_manifest` | Create file manifest | `file_paths[]` | `Manifest` |

## 🎯 **Common Workflows**

### **🔐 Complete Encryption Workflow**
```typescript
async function encryptFiles() {
  try {
    // 1. Generate key
    const key = await invokeCommand('generate_key', {
      label: 'My Key',
      passphrase: 'secure-passphrase'
    });
    
    // 2. Select files
    const selection = await invokeCommand('select_files', 'Files');
    
    // 3. Encrypt
    const operationId = await invokeCommand('encrypt_files', {
      key_id: key.key_id,
      file_paths: selection.paths
    });
    
    // 4. Track progress
    trackProgress(operationId);
    
  } catch (error) {
    handleError(error);
  }
}
```

### **🔓 Complete Decryption Workflow**
```typescript
async function decryptFiles() {
  try {
    // 1. Select encrypted file
    const encryptedFile = await selectFile();
    
    // 2. Choose key
    const keys = await invokeCommand('list_keys');
    const selectedKey = await selectKey(keys);
    
    // 3. Enter passphrase
    const passphrase = await getPassphrase();
    
    // 4. Decrypt
    const result = await invokeCommand('decrypt_data', {
      encrypted_file: encryptedFile,
      key_id: selectedKey.key_id,
      passphrase: passphrase,
      output_dir: await selectOutputDir()
    });
    
    // 5. Verify manifest
    if (result.manifest_verified) {
      showSuccess('Files decrypted successfully!');
    } else {
      showWarning('Files decrypted but manifest verification failed');
    }
    
  } catch (error) {
    handleError(error);
  }
}
```

## ⚠️ **Error Handling**

### **Error Types**
```typescript
// All errors are CommandError instances
interface CommandError {
  code: ErrorCode;           // Use for programmatic handling
  message: string;           // Show to user
  recovery_guidance?: string; // Suggested actions
  user_actionable: boolean;  // Can user fix this?
}
```

### **Common Error Codes**
```typescript
// Validation errors (user can fix)
'INVALID_INPUT' | 'MISSING_PARAMETER' | 'INVALID_PATH' | 'WEAK_PASSPHRASE'

// Permission errors (need user action)
'PERMISSION_DENIED' | 'PATH_NOT_ALLOWED'

// Not found errors (guide user)
'KEY_NOT_FOUND' | 'FILE_NOT_FOUND'

// Security errors (critical)
'INVALID_KEY' | 'WRONG_PASSPHRASE' | 'TAMPERED_DATA'

// Operation errors (retry or contact support)
'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'STORAGE_FAILED'
```

### **Error Handling Pattern**
```typescript
function handleError(error: CommandError) {
  switch (error.code) {
    case 'INVALID_INPUT':
    case 'MISSING_PARAMETER':
      showValidationError(error.message);
      break;
      
    case 'PERMISSION_DENIED':
      requestPermissions();
      break;
      
    case 'KEY_NOT_FOUND':
      showKeyNotFoundDialog();
      break;
      
    case 'WEAK_PASSPHRASE':
      showPassphraseRequirements();
      break;
      
    case 'WRONG_PASSPHRASE':
      showIncorrectPassphraseDialog();
      break;
      
    default:
      showGenericError(error.message, error.recovery_guidance);
  }
}
```

## 📊 **Progress Tracking**

### **Progress Update Structure**
```typescript
interface ProgressUpdate {
  operation_id: string;
  progress: number;          // 0.0 to 1.0
  message: string;           // "Encrypting file 3 of 10..."
  details?: ProgressDetails; // Operation-specific info
  estimated_time_remaining?: number; // seconds
}
```

### **Progress Tracking Implementation**
```typescript
function trackProgress(operationId: string) {
  const interval = setInterval(async () => {
    try {
      const progress = await invokeCommand('get_progress', { operation_id: operationId });
      
      // Update UI
      updateProgressBar(progress.progress);
      updateStatusMessage(progress.message);
      
      if (progress.is_complete) {
        clearInterval(interval);
        showCompletion();
      }
      
    } catch (error) {
      clearInterval(interval);
      handleError(error);
    }
  }, 1000);
}
```

## 🎨 **UI Integration Examples**

### **Key Generation Form**
```typescript
async function handleKeyGeneration(formData: FormData) {
  const label = formData.get('label') as string;
  const passphrase = formData.get('passphrase') as string;
  
  try {
    // Validate passphrase first
    const validation = await invokeCommand('validate_passphrase', { passphrase });
    if (!validation.is_valid) {
      showError(validation.message);
      return;
    }
    
    // Generate key
    const key = await invokeCommand('generate_key', { label, passphrase });
    
    // Show success with public key
    showSuccess(`Key "${key.key_id}" generated successfully!`);
    showPublicKey(key.public_key);
    
  } catch (error) {
    handleError(error);
  }
}
```

### **File Selection Dialog**
```typescript
async function handleFileSelection(type: 'Files' | 'Folder') {
  try {
    const selection = await invokeCommand('select_files', type);
    
    // Update UI with selection info
    updateFileList(selection.paths);
    updateFileCount(selection.file_count);
    updateTotalSize(formatBytes(selection.total_size));
    
  } catch (error) {
    handleError(error);
  }
}
```

### **Configuration Management**
```typescript
async function loadConfiguration() {
  try {
    const config = await invokeCommand('get_config');
    
    // Populate UI with current config
    setDefaultKeyLabel(config.default_key_label);
    setRememberLastFolder(config.remember_last_folder);
    setMaxRecentFiles(config.max_recent_files);
    
  } catch (error) {
    handleError(error);
  }
}

async function saveConfiguration(updates: AppConfigUpdate) {
  try {
    const newConfig = await invokeCommand('update_config', updates);
    showSuccess('Configuration saved successfully!');
    
  } catch (error) {
    handleError(error);
  }
}
```

## 🔧 **Development Tips**

### **1. Type Safety**
- Always use generated types
- Let TypeScript catch errors at compile time
- Don't define interfaces manually

### **2. Error Handling**
- Always wrap commands in try-catch
- Use structured error handling
- Provide user-friendly messages

### **3. Progress Tracking**
- Implement for all long-running operations
- Show meaningful progress messages
- Handle cancellation gracefully

### **4. Security**
- Never log sensitive data
- Clear sensitive data from memory
- Use secure input methods

### **5. Testing**
- Test all error scenarios
- Verify progress tracking
- Test with large files

## 📚 **Additional Resources**

- **Full API Documentation**: [API-Interfaces-Backend.md](./API-Interfaces-Backend.md)
- **Generated Types**: `src-tauri/target/debug/build/barqly-vault-*/out/generated/types.ts`
- **Rust Source**: `src-tauri/src/commands/`
- **Test Examples**: `src-tauri/tests/integration/`

---

*This quick reference is designed for UX engineers implementing the frontend. For detailed API documentation, see the full Backend-API-Interfaces.md document.* 