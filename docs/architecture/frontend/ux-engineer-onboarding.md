# UX Engineer Onboarding Guide

## 🎯 **What You Need to Know**

As a UX engineer working on **Module 4 and above**, you only need to focus on the **public interfaces** that the frontend can use. You don't need to understand the internal Rust implementation details.

## 📚 **Documentation Flow**

### **🎯 Start Here: This Onboarding Guide**
**File**: `UX-Engineer-Onboarding.md` (this file)
- **Purpose**: Your complete guide to getting started
- **Contains**: Everything you need to know, with references to other docs
- **Use when**: First time joining the team, need to understand the approach

### **📋 Quick Reference (After Onboarding)**
**File**: `API-Quick-Reference.md`
- **Purpose**: Fast lookup for commands and patterns
- **Contains**: Command tables, common workflows, error handling patterns
- **Use when**: Daily development, looking up specific commands

### **📖 Complete API Documentation (When You Need Details)**
**File**: `API-Interfaces-Backend.md`
- **Purpose**: Comprehensive reference for all available interfaces
- **Contains**: Detailed type definitions, usage examples, security guidelines
- **Use when**: Need detailed information about specific interfaces

## 🔧 **Generated TypeScript Types**

### **Location**
```
src-tauri/target/debug/build/barqly-vault-*/out/generated/types.ts
```

### **How to Generate**
```bash
cd src-tauri
cargo build --features generate-types
```

### **What This Contains**
- **All TypeScript interfaces** for commands
- **Error handling types** and enums
- **Progress tracking types**
- **Helper functions** like `invokeCommand` and `CommandError`

## 🚀 **Getting Started (3 Steps)**

### **Step 1: Read the Quick Reference**
Start with `API-Quick-Reference.md` to understand the available commands and basic patterns.

### **Step 2: Generate TypeScript Definitions**
```bash
# From project root
cargo build --features generate-types

# Or from src-tauri directory
cd src-tauri
cargo build --features generate-types
```

### **Step 3: Start Building**
```typescript
// Import the generated types (copy from generated file to src-ui/src/lib/api-types.ts)
import { invokeCommand, CommandError, ErrorCode } from '@/lib/api-types';

// Or import directly from generated file
import { invokeCommand, CommandError, ErrorCode } from '../../../src-tauri/target/debug/build/barqly-vault-*/out/generated/types';
```

// Example: Generate a key
try {
  const key = await invokeCommand('generate_key', {
    label: 'My Key',
    passphrase: 'secure-passphrase'
  });
  console.log('Key generated:', key.key_id);
} catch (error) {
  if (error instanceof CommandError) {
    console.error('Error:', error.message);
  }
}
```

## 📋 **Available Commands Summary**

### **🔐 Crypto Operations (7 commands)**
- `generate_key` - Create encryption keypair
- `validate_passphrase` - Check passphrase strength
- `encrypt_files` - Encrypt files with public key
- `decrypt_data` - Decrypt files with private key
- `get_encryption_status` - Check encryption progress
- `get_progress` - Get operation progress
- `verify_manifest` - Verify extracted files

### **💾 Storage Operations (4 commands)**
- `list_keys` - List all available keys
- `delete_key` - Delete a key
- `get_config` - Get application configuration
- `update_config` - Update application configuration

### **📁 File Operations (3 commands)**
- `select_files` - Select files or folders
- `get_file_info` - Get file details
- `create_manifest` - Create file manifest

## 🎯 **What You DON'T Need to Know**

### **❌ Internal Implementation Details**
- Rust source code in `src-tauri/src/`
- Module structure and organization
- Internal error handling mechanisms
- File system operations
- Cryptographic implementations

### **❌ Backend Architecture**
- Tauri command implementations
- Storage mechanisms
- Logging systems
- Performance optimizations

## ✅ **What You DO Need to Know**

### **✅ Public Interfaces**
- Command names and parameters
- Response types and structures
- Error codes and messages
- Progress tracking patterns

### **✅ Type Safety**
- Using generated TypeScript types
- Handling structured errors
- Implementing progress tracking
- Following security guidelines

### **✅ User Experience**
- Error handling patterns
- Progress indication
- Security best practices
- Input validation

## 🔄 **Development Workflow**

### **1. Planning Phase**
1. Read `API-Quick-Reference.md` for command overview
2. Check `API-Interfaces-Backend.md` for detailed specifications
3. Plan your UI components and workflows

### **2. Implementation Phase**
1. Generate TypeScript definitions
2. Import types in your frontend
3. Implement commands using `invokeCommand`
4. Handle errors with `CommandError` class
5. Add progress tracking for long operations

### **3. Testing Phase**
1. Test all command interfaces
2. Verify error handling
3. Test progress tracking
4. Validate security measures

## 📖 **Documentation Structure**

```
barqly-vault.wiki/Architecture/
├── API-Quick-Reference.md          # Start here - quick overview
├── API-Interfaces-Backend.md       # Complete API documentation
└── UX-Engineer-Onboarding.md       # This file - onboarding guide
```

## 🎯 **Key Principles**

### **1. Interface-First Development**
- Focus on what the interface provides, not how it's implemented
- Use generated types for type safety
- Follow established patterns for consistency

### **2. Error Handling**
- Always wrap commands in try-catch
- Use structured error handling with `CommandError`
- Provide user-friendly error messages

### **3. Progress Tracking**
- Implement progress tracking for long operations
- Show meaningful progress messages
- Handle operation cancellation gracefully

### **4. Security**
- Never log sensitive data (passphrases, keys)
- Clear sensitive data from memory after use
- Follow security guidelines in documentation

## 🚀 **Ready to Start?**

1. **Read** `API-Quick-Reference.md` for the command overview
2. **Generate** TypeScript definitions
3. **Start building** your UI components
4. **Reference** `API-Interfaces-Backend.md` for detailed specifications

You have everything you need to build a great user experience without worrying about backend implementation details!

---

*This guide is designed to get you up and running quickly. For detailed API information, see the other documentation files.* 