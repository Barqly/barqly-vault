 Issue 1: Confused Visibility & Purpose

  The old #[tauri::command] functions are being kept as "internal implementation" but this creates
  confusion:
  - Visibility: They're pub async fn (public) when they should be private/internal
  - Purpose: Unclear whether they're API endpoints or implementation details
  - Security: Public functions in command modules suggest they might be exposed
  - Maintainability: Future developers might accidentally re-enable them as commands

  Issue 2: Scattered & Inconsistent Naming

  The current structure is indeed confusing:

  commands/
  ├── yubikey_commands/           # 📁 Folder (old implementation)
  │   ├── mod.rs
  │   ├── smart_decryption.rs
  │   └── streamlined.rs
  ├── yubikey_device_commands.rs  # 📄 File (new consolidated)
  ├── yubikey_crypto_commands.rs  # 📄 File (new consolidated)
  ├── vault_yubikey_commands.rs   # 📄 File (new consolidated)
  └── vault_yubikey_helpers.rs    # 📄 File (helpers)

  Problems:
  - Naming collision: yubikey_commands (folder) vs *_yubikey_commands.rs (files)
  - Inconsistent patterns: Some files, some folders
  - Unclear hierarchy: Hard to know what's new vs old architecture
  - Scattered locations: YubiKey code in multiple places

  💡 Proposed Solution:

  Phase 1: Restructure File Organization

  commands/
  ├── yubikey/                    # 📁 All YubiKey commands in one place
  │   ├── mod.rs                  # Re-exports public commands only
  │   ├── device_commands.rs      # Device operations (public commands)
  │   ├── vault_commands.rs       # Vault integration (public commands)
  │   ├── crypto_commands.rs      # Crypto operations (public commands)
  │   └── internal/               # 📁 Private implementation (not exported)
  │       ├── mod.rs              # Internal-only re-exports
  │       ├── device_impl.rs      # Private implementation (was streamlined.rs)
  │       ├── crypto_impl.rs      # Private implementation (was smart_decryption.rs)
  │       └── helpers.rs          # Private helpers (was vault_yubikey_helpers.rs)
  ├── vault_commands/             # 📁 Existing vault commands
  └── storage_commands.rs         # 📄 Other commands...

  Phase 2: Fix Visibility & Naming

  // commands/yubikey/mod.rs
  pub mod device_commands;    // ✅ Public API
  pub mod vault_commands;     // ✅ Public API  
  pub mod crypto_commands;    // ✅ Public API

  mod internal;               // ❌ Private implementation

  // Re-export only public commands
  pub use device_commands::*;
  pub use vault_commands::*;
  pub use crypto_commands::*;

  // commands/yubikey/internal/mod.rs
  pub(super) mod device_impl;     // ✅ Visible only to parent yubikey module
  pub(super) mod crypto_impl;     // ✅ Visible only to parent yubikey module
  pub(super) mod helpers;         // ✅ Visible only to parent yubikey module

  // commands/yubikey/internal/device_impl.rs
  pub(super) async fn register_yubikey_impl(...) -> Result<...> {
      // ✅ Private implementation - can only be called from yubikey module
  }

  🎯 Benefits of This Approach:

  1. Clear Separation of Concerns

  - Public API: commands/yubikey/*.rs - Only command functions
  - Private Implementation: commands/yubikey/internal/*.rs - Business logic
  - Clear Boundaries: No confusion about what's public vs private

  2. Cohesive Organization

  - All YubiKey code in one place: commands/yubikey/
  - Consistent naming: No more collision between folder/file names
  - Logical hierarchy: API → Implementation pattern is clear

  3. Security & Maintainability

  - Proper encapsulation: Implementation details are truly private
  - No accidental exposure: Can't accidentally re-enable internal functions
  - Clean public interface: Only intended commands are visible

  4. Developer Experience

  - Intuitive navigation: Easy to find YubiKey code
  - Clear intent: Obvious what's API vs implementation
  - Future-proof: Easy to add new YubiKey features