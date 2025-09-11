# Streamlined YubiKey API Design Requirements

## Executive Summary

The current YubiKey implementation works technically but creates terrible UX by exposing PIV internals to users. We need intelligent state detection and simplified workflows based on expert UX analysis.

## Current Issues

### ❌ Poor UX Problems
- Users overwhelmed with PIV slot selection (9A, 9C, 9D, 9E)
- Redundant PIN entry even when YubiKey already configured
- App shows "Initialize" screen even for already-configured YubiKeys
- Complex PIV management exposed to end users

### ✅ What Works (Keep This)
- YubiKey detection (no crashes)
- Parameter passing and API integration
- Backend command registration and type generation
- Error handling infrastructure

## Expert UX Design Specification

**Source**: Expert UX analysis in `/tbd/chatgpt3.md`

### Three YubiKey States
The backend must intelligently classify any YubiKey into:

1. **Brand-new YubiKey**
   - PIV applet present, default PIN (123456)
   - No age recipient generated
   - Flow: Force PIN change + generate recipient

2. **Reused YubiKey** 
   - Custom PIN already set (not default)
   - No Barqly age recipient found
   - Flow: Generate recipient in available slot

3. **Already Registered**
   - Custom PIN set
   - Valid age recipient present
   - Flow: Return metadata, ready to use

## Required Backend API Commands

### 1. Enhanced list_yubikeys()

**Replace current yubikey_list_devices with intelligent detection:**

```rust
#[derive(Serialize)]
pub struct YubiKeyStateInfo {
    pub serial: String,
    pub state: YubiKeyState,
    pub slot: Option<String>,
    pub recipient: Option<String>,
    pub label: Option<String>, 
    pub pin_status: PinStatus,
}

#[derive(Serialize)]
pub enum YubiKeyState {
    New,        // Default PIN, no age recipient
    Reused,     // Custom PIN, no Barqly recipient
    Registered, // Has age recipient, ready to use
}

#[derive(Serialize)] 
pub enum PinStatus {
    Default,    // Still using 123456
    Set,        // Custom PIN configured
}

#[command]
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError>
```

**Detection Logic:**
1. Run `age-plugin-yubikey --list-all` to find existing recipients
2. For each YubiKey: classify state based on age recipient presence and PIN status
3. Return structured state info (not raw device info)

### 2. init_yubikey() - For Brand New YubiKeys

```rust
#[command]
pub async fn init_yubikey(
    serial: String, 
    new_pin: String, 
    label: String
) -> Result<YubiKeySetupResult, CommandError>
```

**Flow:**
1. Change management key: `ykman piv access change-management-key -a TDES --protect`
2. Change default PIN to user's PIN
3. Generate age identity: `age-plugin-yubikey --generate --name {label} --serial {serial}`
4. Return setup metadata

### 3. register_yubikey() - For Reused YubiKeys

```rust
#[command]
pub async fn register_yubikey(
    serial: String,
    label: String
) -> Result<YubiKeySetupResult, CommandError>
```

**Flow:**
1. Generate age identity in first available supported slot
2. Default to slot 9c (Digital Signature)
3. Return setup metadata

### 4. get_identities() - For Decryption

```rust
#[command]
pub async fn get_identities(serial: String) -> Result<Vec<String>, CommandError>
```

**Flow:**
1. Run `age-plugin-yubikey --identity --serial {serial}`
2. Return recipient list for vault matching

## File Organization Requirements

### ✅ Proper File Structure
- Backend files: `/src-tauri/src/commands/yubikey_commands/`
- Frontend types: `/src-ui/src/lib/api-types.ts` (SINGLE FILE ONLY)
- Type generation: Follow documented process in `/docs/architecture/frontend/ux-engineer-onboarding.md`

### ❌ Prohibited Practices
- NO multiple api-types files (api-types-new.ts, api-types-generated.ts, etc.)
- NO files in wrong directories (`/src/lib/` instead of `/src-ui/src/lib/`)
- NO redundant or backup files cluttering the codebase

## Implementation Guidelines

### Code Quality Standards
1. **Follow existing patterns** in `/src-tauri/src/commands/yubikey_commands/`
2. **Use established error types** and recovery guidance
3. **Maintain backward compatibility** with existing commands
4. **Follow Rust best practices** for error handling

### Type Generation Process
**CRITICAL**: After implementation you MUST:
1. Run `cargo build --features generate-types`
2. Update SINGLE `src-ui/src/lib/api-types.ts` file (following documented process)
3. Update `src-ui/src/lib/tauri-safe.ts` command mapping
4. Test all commands end-to-end

### Testing Requirements
1. **Test all three YubiKey states** (new, reused, registered)
2. **Verify intelligent detection** works correctly
3. **Ensure clean error handling** for all edge cases
4. **Test type generation** produces correct interfaces

## Current User Context

The user has:
- YubiKey serial: 31310420
- Generated age identity: age1yubikey1q03uh7v81zrq3jn7rqhmwfpejqxdqx0jq3dcvz9qrdv8ekprqkqu70ujtd2
- Name: "Nauman-Key"
- Should be detected as "registered" state

## Success Criteria

After implementation:
1. **App detects user's YubiKey as "registered"** 
2. **Shows "Connected: Nauman-Key ✅"** instead of complex initialization
3. **Create Key button works immediately** 
4. **Zero PIV complexity** shown to users
5. **Clean, professional codebase** with proper file organization

## Professional Standards Expected

- **Clean implementation** following existing codebase patterns
- **Proper file organization** (no mess of duplicate files)
- **Complete type generation** with updated frontend interfaces
- **Comprehensive testing** of all scenarios
- **Documentation** of any architectural decisions

This is a high-priority UX improvement that will transform the YubiKey experience from confusing to professional-grade seamless operation.