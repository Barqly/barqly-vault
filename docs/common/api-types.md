# Backend-Frontend API Synchronization

## Overview

We use `tauri-specta` to automatically generate TypeScript bindings from Rust commands. Rust types are the single source of truth - TypeScript is generated, never manually written.

## Backend Engineer Workflow

### Adding/Modifying a Tauri Command

1. **Annotate your command:**
   - Add `#[derive(specta::Type)]` to all command structs
   - Add `#[tauri::command]` and `#[specta::specta]` to the function
   - Ensure return types also implement `specta::Type`

2. **Register in `src-tauri/src/lib.rs`:**
   - Add command to `collect_commands!` macro in `generate_typescript_bindings()`
   - Also add to `tauri::generate_handler!` for runtime registration

3. **Generate TypeScript bindings:**
   ```bash
   make generate-bindings
   ```

4. **Commit both files:**
   - Your Rust changes
   - Updated `src-ui/src/bindings.ts`

## Frontend Engineer Workflow

### Using Generated Commands

1. Pull latest code - bindings are already committed
2. Import from generated bindings:
   ```typescript
   import { commands } from '../bindings';
   ```
3. Use commands with full type safety - TypeScript knows all types

## Automatic Generation

Bindings also auto-generate during:
- `npm run dev` (via `beforeDevCommand` hook in `tauri.conf.json`)
- `npm run build` (via `beforeBuildCommand` hook)
- CI/CD pipelines

This ensures bindings never get out of sync.

## Key Files

| File | Purpose | Edit? |
|------|---------|-------|
| `src-tauri/src/lib.rs` | Command registration | Yes - add new commands |
| `src-ui/src/bindings.ts` | Generated TypeScript | Never - auto-generated |
| `src-tauri/tauri.conf.json` | Build hooks | Already configured |
| `Makefile` | `generate-bindings` command | Already configured |

## Quick Checklist

**Backend Engineer:**
- [ ] Add `specta::Type` and `#[specta::specta]` annotations
- [ ] Register command in `lib.rs` (two places)
- [ ] Run `make generate-bindings`
- [ ] Commit Rust code + `bindings.ts`

**Frontend Engineer:**
- [ ] Pull latest code
- [ ] Import from `bindings.ts`
- [ ] Use typed commands