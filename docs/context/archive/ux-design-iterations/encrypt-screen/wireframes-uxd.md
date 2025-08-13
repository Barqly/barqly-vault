# Encrypt Screen Wireframes

> **Version**: 1.0  
> **Status**: Implementation Ready  
> **Designer**: UX Designer, ZenAI Team  
> **Last Updated**: January 2025  
> **Related**: Design Specification, Component Specifications

## Overview

These wireframes provide visual blueprints for the Encrypt screen implementation, showing all states and responsive variations. Each wireframe focuses on layout, hierarchy, and user flow while maintaining consistency with the established Barqly Vault design system.

## Desktop Wireframes (1280px+)

### 1. Initial State - Empty

```
┌──────────────────────────────────────────────────────────────────────┐
│ Barqly Vault                                            [S] [E] [D]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│     🔐 Encrypt Your Bitcoin Vault                                    │
│     Transform sensitive files into military-grade encrypted          │
│     archives · 90 seconds to complete                                │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 🛡️ Military-grade | 🔒 Local-only | ⚡ Zero network access      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ [1] Select Files → [2] Choose Key → [3] Set Destination         │ │
│  │  ● Active          ○ Disabled      ○ Disabled                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  Step 1: Select What to Encrypt                                 │ │
│  │  ─────────────────────────────────────────────                  │ │
│  │                                                                  │ │
│  │  Choose mode:  [📄 Files]  [📁 Folder]                         │ │
│  │               Select specific  Encrypt entire                   │ │
│  │                documents      folder structure                  │ │
│  │                                                                  │ │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │ │
│  │                                                                  │ │
│  │  │         🔐 Drop files here to encrypt                    │   │ │
│  │                                                                  │ │
│  │  │                   - or -                                 │   │ │
│  │                                                                  │ │
│  │  │      [ Browse Files ]    [ Browse Folder ]              │   │ │
│  │                                                                  │ │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  💡 Quick Tips                                           [Show] │ │
│  │  • Drag multiple files or an entire folder                      │ │
│  │  • Common Bitcoin files: wallet.dat, descriptors, seeds         │ │
│  │  • Maximum recommended size: 100MB for optimal performance      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 2. Files Selected State

```
┌──────────────────────────────────────────────────────────────────────┐
│ Barqly Vault                                            [S] [E] [D]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│     🔐 Encrypt Your Bitcoin Vault                                    │
│     Transform sensitive files into military-grade encrypted archives │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ [1] Select Files → [2] Choose Key → [3] Set Destination         │ │
│  │  ✓ Complete       ● Active        ○ Disabled                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Step 1: Files Selected                              [Clear] │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │ Selected: 3 files, 2.4 MB                                 │ │ │
│  │  │ ┌─────────────────────────────────────────────────────┐   │ │ │
│  │  │ │ 📄 wallet-descriptor.json              1.2 MB    ✕ │   │ │ │
│  │  │ │ 📄 seed-phrase-backup.txt              0.8 MB    ✕ │   │ │ │
│  │  │ │ 📄 xpub-keys.txt                       0.4 MB    ✕ │   │ │ │
│  │  │ └─────────────────────────────────────────────────────┘   │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 2: Choose Your Encryption Key                             │ │
│  │  ─────────────────────────────────────────────                  │ │
│  │                                                                  │ │
│  │  Select key: ┌───────────────────────────────────────────┐     │ │
│  │              │ 🔑 Choose an encryption key...        ▼   │     │ │
│  │              └───────────────────────────────────────────┘     │ │
│  │                                                                  │ │
│  │  ℹ️ You'll need the private key to decrypt these files later   │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 3: Set Output Destination (Disabled)                      │ │
│  │  ─────────────────────────────────────────────                  │ │
│  │  Complete previous steps first                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 3. Ready to Encrypt State

```
┌──────────────────────────────────────────────────────────────────────┐
│ Barqly Vault                                            [S] [E] [D]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│     🔐 Encrypt Your Bitcoin Vault                                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ [1] Select Files → [2] Choose Key → [3] Set Destination         │ │
│  │  ✓ Complete       ✓ Complete      ✓ Complete                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Files Selected: 3 files, 2.4 MB                    [Change]│ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Encryption Key: My Bitcoin Vault Key               [Change]│ │
│  │  Public key: age1qyqszqgpqyqszqgpqyq...x7x8m                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Output Configuration                               [Change]│ │
│  │  Location: /Users/bitcoin/Documents/Barqly-Vaults/              │ │
│  │  Name: family-bitcoin-backup-2025-01-15.age                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Ready to Create Your Encrypted Vault                           │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │ ✓ 3 files selected (2.4 MB)                               │ │ │
│  │  │ ✓ Encryption key verified                                 │ │ │
│  │  │ ✓ Output location has sufficient space (45 GB available)  │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                                                                  │ │
│  │        [ Reset ]            [ 🔐 Create Encrypted Vault → ]    │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 4. Encryption Progress State

```
┌──────────────────────────────────────────────────────────────────────┐
│ Barqly Vault                                            [S] [E] [D]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│     🔐 Creating Your Encrypted Vault                                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │              🔒 Encryption in Progress                          │ │
│  │                                                                  │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │                                                           │ │ │
│  │  │  Stage 2 of 4: Creating secure archive                   │ │ │
│  │  │                                                           │ │ │
│  │  │  ┌─────────────────────────────────────────────────────┐ │ │ │
│  │  │  │████████████████████████░░░░░░░░░░░░░  65%          │ │ │ │
│  │  │  └─────────────────────────────────────────────────────┘ │ │ │
│  │  │                                                           │ │ │
│  │  │  Processing: seed-phrase-backup.txt                      │ │ │
│  │  │                                                           │ │ │
│  │  │  ┌───────────────────────────────────────────────────┐ │ │ │
│  │  │  │ ✓ Preparing files (3 items)                        │ │ │ │
│  │  │  │ ⏳ Creating secure archive                         │ │ │ │
│  │  │  │ ○ Applying encryption                             │ │ │ │
│  │  │  │ ○ Finalizing vault                                │ │ │ │
│  │  │  └───────────────────────────────────────────────────┘ │ │ │
│  │  │                                                           │ │ │
│  │  │  Time elapsed: 8 seconds · Remaining: ~4 seconds        │ │ │
│  │  │                                                           │ │ │
│  │  │                    [ Cancel Operation ]                  │ │ │
│  │  │                                                           │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 5. Success State

```
┌──────────────────────────────────────────────────────────────────────┐
│ Barqly Vault                                            [S] [E] [D]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │                 ✅ Vault Successfully Created!                  │ │
│  │                                                                  │ │
│  │     Your files are now protected with military-grade           │ │
│  │     encryption and ready for long-term storage.                │ │
│  │                                                                  │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │                                                           │ │ │
│  │  │  📍 Vault Location:                                      │ │ │
│  │  │  ┌─────────────────────────────────────────────────────┐ │ │ │
│  │  │  │ /Users/bitcoin/Documents/Barqly-Vaults/             │ │ │ │
│  │  │  │ family-bitcoin-backup-2025-01-15.age                │ │ │ │
│  │  │  └─────────────────────────────────────────────────────┘ │ │ │
│  │  │                                                           │ │ │
│  │  │  [ Copy Path ]  [ Open Folder ]  [ Show in Finder ]     │ │ │
│  │  │                                                           │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                                                                  │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │ 📊 Encryption Summary                                     │ │ │
│  │  │                                                           │ │ │
│  │  │ Files encrypted:     3 files                             │ │ │
│  │  │ Original size:       2.4 MB                              │ │ │
│  │  │ Encrypted size:      1.8 MB (25% compression)            │ │ │
│  │  │ Encryption time:     12 seconds                          │ │ │
│  │  │ Encryption key:      My Bitcoin Vault Key                │ │ │
│  │  │ Algorithm:           age v1.0 (X25519, ChaCha20Poly1305) │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  │                                                                  │ │
│  │  What would you like to do next?                               │ │
│  │                                                                  │ │
│  │     [ Encrypt More Files ]    [ View Decryption Guide ]       │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 6. Error State Examples

```
┌──────────────────────────────────────────────────────────────────────┐
│ Barqly Vault                                            [S] [E] [D]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ⚠️ Encryption Failed                                           │ │
│  │                                                                  │ │
│  │  Unable to read file: seed-phrase-backup.txt                   │ │
│  │                                                                  │ │
│  │  This might happen if:                                          │ │
│  │  • The file is open in another program                          │ │
│  │  • You don't have permission to read the file                  │ │
│  │  • The file was moved or deleted                               │ │
│  │                                                                  │ │
│  │  What you can do:                                               │ │
│  │  1. Close any programs that might be using the file             │ │
│  │  2. Check that the file still exists                           │ │
│  │  3. Try selecting the file again                               │ │
│  │                                                                  │ │
│  │     [ Remove File and Continue ]    [ Try Again ]    [ Cancel ] │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile/Tablet Wireframes (768px and below)

### 1. Mobile Initial State

```
┌────────────────────┐
│ ☰  Barqly Vault    │
├────────────────────┤
│                    │
│  🔐 Encrypt Your   │
│  Bitcoin Vault     │
│                    │
│  90 seconds to     │
│  complete          │
│                    │
│ ┌────────────────┐ │
│ │ 🛡️ Military-   │ │
│ │ grade security  │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │ Step 1 of 3    │ │
│ │ Select Files   │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │   📄 Files     │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │   📁 Folder    │ │
│ └────────────────┘ │
│                    │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ┐ │
│                    │
│ │ 🔐 Drop files  │ │
│   here or browse   │
│ │                │ │
│   [ Browse ]       │
│ └ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                    │
└────────────────────┘
```

### 2. Mobile Files Selected

```
┌────────────────────┐
│ ☰  Barqly Vault    │
├────────────────────┤
│                    │
│ ┌────────────────┐ │
│ │ ✓ Step 1       │ │
│ │ Files Selected │ │
│ │                │ │
│ │ 3 files, 2.4MB │ │
│ │ [View] [Clear] │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │ Step 2 of 3    │ │
│ │ Choose Key     │ │
│ └────────────────┘ │
│                    │
│ Select key:        │
│ ┌────────────────┐ │
│ │ Choose key... ▼│ │
│ └────────────────┘ │
│                    │
│ ℹ️ You'll need the │
│ private key to     │
│ decrypt later      │
│                    │
│ ┌────────────────┐ │
│ │ Step 3         │ │
│ │ (Complete      │ │
│ │ step 2 first)  │ │
│ └────────────────┘ │
│                    │
└────────────────────┘
```

### 3. Mobile Ready State

```
┌────────────────────┐
│ ☰  Barqly Vault    │
├────────────────────┤
│                    │
│ All steps complete!│
│                    │
│ ┌────────────────┐ │
│ │ Ready to       │ │
│ │ Encrypt        │ │
│ │                │ │
│ │ ✓ 3 files      │ │
│ │ ✓ Key selected │ │
│ │ ✓ Path set     │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │   🔐 Create    │ │
│ │ Encrypted      │ │
│ │    Vault →     │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │    Reset       │ │
│ └────────────────┘ │
│                    │
│ Tap to review:     │
│ • Files (3)        │
│ • Key: My Bitcoin  │
│ • Save to: Docs    │
│                    │
└────────────────────┘
```

### 4. Mobile Progress

```
┌────────────────────┐
│ ☰  Barqly Vault    │
├────────────────────┤
│                    │
│   🔒 Encrypting... │
│                    │
│ ┌────────────────┐ │
│ │████████░░ 65%  │ │
│ └────────────────┘ │
│                    │
│ Creating secure    │
│ archive...         │
│                    │
│ ✓ Files prepared   │
│ ⏳ Archiving       │
│ ○ Encrypting       │
│ ○ Finalizing       │
│                    │
│ 8 seconds elapsed  │
│ ~4 seconds left    │
│                    │
│ ┌────────────────┐ │
│ │    Cancel      │ │
│ └────────────────┘ │
│                    │
└────────────────────┘
```

### 5. Mobile Success

```
┌────────────────────┐
│ ☰  Barqly Vault    │
├────────────────────┤
│                    │
│   ✅ Success!      │
│                    │
│ Your vault is      │
│ ready!             │
│                    │
│ ┌────────────────┐ │
│ │ 📍 Saved to:   │ │
│ │ .../Barqly-    │ │
│ │ Vaults/family- │ │
│ │ bitcoin-backup │ │
│ │ -2025-01-15    │ │
│ │ .age           │ │
│ │                │ │
│ │ [Copy] [Open]  │ │
│ └────────────────┘ │
│                    │
│ 📊 Summary:        │
│ • 3 files secured  │
│ • 2.4MB → 1.8MB   │
│ • 12 seconds       │
│                    │
│ ┌────────────────┐ │
│ │ Encrypt More   │ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │ How to Decrypt │ │
│ └────────────────┘ │
│                    │
└────────────────────┘
```

## Interaction Flow Diagrams

### File Selection Flow

```
Start
  │
  ├─→ Choose Mode
  │     ├─→ Files Mode
  │     │     ├─→ Click Browse
  │     │     ├─→ Drag & Drop
  │     │     └─→ Files Selected → Show List
  │     │
  │     └─→ Folder Mode
  │           ├─→ Click Browse
  │           ├─→ Drag & Drop
  │           └─→ Folder Selected → Show Contents
  │
  └─→ Validation
        ├─→ Valid Files → Enable Step 2
        └─→ Invalid Files → Show Error → Allow Correction
```

### Encryption Flow

```
Files Selected
  │
  ├─→ Select Key
  │     ├─→ Dropdown Opens
  │     ├─→ Key Selected
  │     └─→ Show Key Preview → Enable Step 3
  │
  ├─→ Configure Output
  │     ├─→ Set Path (or use default)
  │     ├─→ Set Name (optional)
  │     └─→ Validate Path → Enable Encrypt Button
  │
  └─→ Start Encryption
        ├─→ Show Progress
        ├─→ Update Stages
        ├─→ Allow Cancel (until 90%)
        └─→ Complete
              ├─→ Show Success
              ├─→ Display Summary
              └─→ Offer Next Actions
```

### Error Recovery Flow

```
Error Occurs
  │
  ├─→ Identify Error Type
  │     ├─→ File Access Error
  │     │     ├─→ Show Specific Message
  │     │     ├─→ Suggest Solutions
  │     │     └─→ Offer Actions (Retry/Remove/Cancel)
  │     │
  │     ├─→ Permission Error
  │     │     ├─→ Explain Issue
  │     │     └─→ Guide to Resolution
  │     │
  │     └─→ Space Error
  │           ├─→ Show Required vs Available
  │           └─→ Suggest Alternative Location
  │
  └─→ User Action
        ├─→ Retry → Attempt Again
        ├─→ Modify → Update Selection
        └─→ Cancel → Reset Form
```

## Component State Matrix

| Component       | Initial           | Active             | Complete               | Error            | Disabled       |
| --------------- | ----------------- | ------------------ | ---------------------- | ---------------- | -------------- |
| File Selection  | Empty drop zone   | Highlight on hover | Show file list         | Red border       | N/A            |
| Mode Toggle     | Neither selected  | One highlighted    | Mode locked            | N/A              | N/A            |
| Key Dropdown    | Placeholder       | Open with options  | Shows selection        | Red border       | Grayed out     |
| Path Input      | Default path      | Editable           | Valid path shown       | Red with message | Grayed out     |
| Name Input      | Empty/placeholder | Typing             | Name set               | N/A              | Grayed out     |
| Encrypt Button  | Disabled          | Hover effect       | Loading state          | N/A              | Gray, no hover |
| Progress Bar    | Hidden            | Animating          | 100% filled            | N/A              | N/A            |
| Success Message | Hidden            | N/A                | Visible with animation | N/A              | N/A            |

## Responsive Breakpoints

### Layout Adaptations

```
Desktop (1280px+)
├─ 3-column step layout
├─ Side-by-side buttons
├─ Full path display
└─ Expanded help text

Tablet (768-1279px)
├─ 2-column step layout
├─ Stacked sections
├─ Truncated paths
└─ Collapsible help

Mobile (<768px)
├─ Single column
├─ Full-width buttons
├─ Abbreviated text
├─ Step-by-step flow
└─ Bottom sheet modals
```

### Touch Target Sizes

- **Mobile**: Minimum 44×44px
- **Tablet**: Minimum 40×40px
- **Desktop**: Minimum 32×32px (mouse)

## Animation Specifications

### Transition Timings

```css
/* Micro-interactions */
--transition-instant: 0ms;
--transition-fast: 150ms;
--transition-base: 250ms;
--transition-slow: 350ms;
--transition-slower: 500ms;

/* Easing Functions */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Key Animations

1. **File Drop**
   - Duration: 400ms
   - Easing: ease-bounce
   - Effect: Scale from 1.1 to 1.0

2. **Step Completion**
   - Duration: 350ms
   - Easing: ease-out
   - Effect: Check mark scales in

3. **Progress Bar**
   - Duration: Continuous
   - Easing: linear
   - Effect: Smooth fill

4. **Success State**
   - Duration: 500ms
   - Easing: ease-out
   - Effect: Fade and slide up

## Accessibility Annotations

### Focus Order

```
1. Skip to main content (hidden)
2. Navigation menu
3. Page title
4. Trust indicators
5. Step indicator
6. File selection mode toggle
7. Browse files button
8. Browse folder button
9. File list (if present)
10. Remove file buttons
11. Clear all button
12. Key selection dropdown
13. Output path input
14. Browse path button
15. Archive name input
16. Reset button
17. Encrypt button
18. Help section toggle
19. Success message actions
```

### ARIA Labels

```html
<!-- File Selection -->
<div role="region" aria-label="File selection">
  <button aria-label="Select individual files">Files</button>
  <button aria-label="Select entire folder">Folder</button>
  <div role="status" aria-live="polite">3 files selected</div>
</div>

<!-- Progress -->
<div
  role="progressbar"
  aria-valuenow="65"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Encryption progress"
>
  <span aria-live="polite">Creating secure archive, 65% complete</span>
</div>

<!-- Success -->
<div role="alert" aria-live="assertive">Vault successfully created</div>
```

## Implementation Notes

### Component Hierarchy

```
EncryptPage
├── PageHeader
│   ├── Title
│   ├── Subtitle
│   └── TrustIndicators
├── StepIndicator
│   └── Step × 3
├── FileSelection
│   ├── ModeToggle
│   ├── DropZone
│   └── FileList
├── KeySelection
│   └── KeyDropdown
├── OutputConfig
│   ├── PathInput
│   └── NameInput
├── ActionArea
│   ├── ValidationList
│   └── ActionButtons
├── ProgressOverlay
│   ├── ProgressBar
│   └── StageList
└── SuccessMessage
    ├── Summary
    └── NextActions
```

### State Management

```javascript
// Core states
const [step, setStep] = useState(1);
const [files, setFiles] = useState(null);
const [selectedKey, setSelectedKey] = useState("");
const [outputPath, setOutputPath] = useState(defaultPath);
const [archiveName, setArchiveName] = useState("");
const [isEncrypting, setIsEncrypting] = useState(false);
const [progress, setProgress] = useState(0);
const [success, setSuccess] = useState(null);
const [error, setError] = useState(null);

// Derived states
const canProceedToStep2 = files && files.length > 0;
const canProceedToStep3 = canProceedToStep2 && selectedKey;
const canEncrypt = canProceedToStep3 && outputPath;
```

---

_These wireframes provide the visual foundation for implementing the Encrypt screen. They should be used in conjunction with the Design Specification and Component Specifications for complete implementation guidance._
