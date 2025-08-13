# Encrypt Screen Product Requirements

> **Date**: January 2025  
> **Status**: Implementation Requirements  
> **Product Owner**: ZenAI Product SubAgent  
> **Priority**: High - Core Value Delivery
> **Context**: Task 4.2.4.2 - Encrypt Page Implementation

## Executive Summary

The Encrypt screen represents the core value delivery moment for Barqly Vault users. This is where Bitcoin holders transform their critical custody documents—seed phrases, wallet descriptors, access keys—into military-grade encrypted vaults that can survive decades. The experience must balance professional security with approachable simplicity, ensuring users feel confident they're properly protecting their family's financial legacy.

## Problem Statement

Bitcoin custody requires securing extremely valuable, irreplaceable information. Current solutions either overwhelm users with technical complexity or oversimplify to the point of compromising security. Users need a encryption workflow that:

- Feels as trustworthy as a bank vault but as simple as saving a file
- Provides clear visual confirmation at every step
- Prevents common errors that could lead to data loss
- Maintains folder structures critical for wallet restoration
- Completes the entire process in under 90 seconds

## Success Criteria

### Primary Metrics

- **Encryption Success Rate**: >95% successful first attempts
- **Time to Completion**: <90 seconds for typical Bitcoin custody files
- **Error Recovery Rate**: >90% successful recovery from errors
- **User Confidence Score**: 9+ rating on security perception

### Secondary Metrics

- **File Selection Accuracy**: <5% re-selection rate
- **Key Selection Confidence**: <2% wrong key selection
- **Output Path Success**: >98% valid path on first try
- **Progress Clarity**: 100% users understand current status

### Business Impact

- **Customer Retention**: Users who successfully encrypt are 3x more likely to become regular users
- **Word-of-Mouth**: Successful encryption leads to 2.5x higher recommendation rate
- **Support Reduction**: Clear UX reduces encryption-related support tickets by 70%

## User Stories & Acceptance Criteria

### Story 1: Bitcoin HODLer Securing Seed Phrase

**As** a Bitcoin holder with significant holdings  
**I want** to quickly encrypt my seed phrase and wallet files  
**So that** I can store them safely for my family's future access

**Acceptance Criteria:**

- Can select specific wallet files without technical knowledge
- Visual confirmation shows exactly what will be encrypted
- Clear indication of encryption strength and standards
- Completion provides immediate peace of mind
- Process takes less than 90 seconds end-to-end

### Story 2: Family Financial Planner

**As** a parent planning Bitcoin inheritance  
**I want** to create encrypted backups my spouse could decrypt  
**So that** our family wealth is protected but accessible in emergencies

**Acceptance Criteria:**

- Can select entire folders of financial documents
- Clear guidance on which key to use for encryption
- Understandable output naming for future identification
- Confidence that folder structure is preserved
- Visual confirmation of successful family protection

### Story 3: Professional Bitcoin Advisor

**As** a Bitcoin custody professional  
**I want** a streamlined encryption workflow I can demonstrate to clients  
**So that** I can recommend Barqly Vault with confidence

**Acceptance Criteria:**

- Professional appearance suitable for client demonstrations
- Clear security indicators visible to observers
- Efficient workflow without unnecessary steps
- Batch operations for multiple client files
- Verifiable encryption completion

### Story 4: Non-Technical User First Encryption

**As** someone new to encryption but holding Bitcoin  
**I want** clear guidance through my first encryption  
**So that** I don't make mistakes with my valuable data

**Acceptance Criteria:**

- Step-by-step visual progression
- Clear explanations without jargon
- Error prevention through input validation
- Recovery guidance if something goes wrong
- Success confirmation I can understand

## Functional Requirements

### 1. Page Header & Trust Building

#### Visual Identity

- **Title**: "Encrypt Your Bitcoin Vault" (conveys action and purpose)
- **Subtitle**: "Transform sensitive files into military-grade encrypted archives"
- **Trust Indicators**:
  - Age encryption badge with "Military-grade encryption" tooltip
  - "Local-only processing" security indicator
  - "Zero network access" privacy badge
- **Visual Weight**: Maximum 10% of viewport

#### Emotional Connection

- **Bitcoin Context**: "Protecting your family's financial future"
- **Time Estimate**: "Complete in under 90 seconds"
- **Security Assurance**: "Your files never leave your device"

### 2. Progressive Workflow Design

#### Three-Step Visual Flow

```
[1. Select Files] → [2. Choose Security Key] → [3. Set Destination] → [Encrypt]
     ↓                      ↓                        ↓
  (Visual list)      (Key with metadata)      (Path with preview)
```

#### Step 1: Intelligent File Selection

**Dual-Mode Selection Interface:**

- **Mode Toggle**: Clear visual switch between Files/Folder modes
- **Mode Descriptions**:
  - Files: "Select specific documents to encrypt together"
  - Folder: "Encrypt an entire folder maintaining structure"

**Selection Methods:**

- **Button Selection**: Large, clear buttons for each mode
- **Drag & Drop Zone**: Visual drop area with mode indication
- **Keyboard Shortcut**: Cmd/Ctrl+O for power users

**Selection Feedback:**

- **Immediate Visual List**: Show selected items with icons
- **Size Calculation**: "3 files, 2.4 MB total"
- **Path Preview**: Truncated paths with full path on hover
- **Remove Option**: Individual × buttons for each item

**Bitcoin-Specific Helpers:**

- **Common Files Detection**: Highlight wallet.dat, descriptor files
- **Size Warnings**: Alert if files exceed 100MB (unusual for custody)
- **Type Validation**: Warn about executable files

#### Step 2: Security Key Selection

**Key Presentation:**

- **Dropdown Design**: Show key labels with creation dates
- **Selected Key Display**: Full public key preview when selected
- **Key Metadata**: Show when key was created, last used
- **Visual Distinction**: Different icon for each key

**Key Guidance:**

- **Self vs Others**: Clear indication of encrypting for self or recipient
- **Key Purpose Reminder**: "Files can only be decrypted with this key's private pair"
- **No Key Fallback**: "Need to create a key? Go to Setup"

#### Step 3: Output Configuration

**Smart Destination Selection:**

- **Default Path**: Pre-populate with Documents/Barqly-Vaults/
- **Path Validation**: Real-time checking for write permissions
- **Browse Button**: Native folder picker integration
- **Recent Locations**: Quick-select from last 3 used paths

**Archive Naming:**

- **Auto-Generation**: `barqly-vault-[date]-[time].age`
- **Custom Override**: Optional field for meaningful names
- **Name Preview**: Show final filename before encryption
- **Extension Note**: Clear indication of .age extension

### 3. Execution & Progress

#### Pre-Encryption Validation

- **Checklist Review**: Visual confirmation of all inputs
- **Space Check**: Ensure sufficient disk space
- **Permission Check**: Verify write access to destination
- **Final Confirmation**: "Ready to create your encrypted vault"

#### Progress Indication

- **Multi-Stage Progress**:
  1. "Preparing files..." (0-10%)
  2. "Creating secure archive..." (10-40%)
  3. "Applying encryption..." (40-90%)
  4. "Finalizing vault..." (90-100%)
- **Time Estimate**: Dynamic based on file size
- **Cancel Option**: Available until 90% complete

#### Success State

- **Visual Celebration**: Professional success animation
- **Clear Output**: "Vault created: [full path with copy button]"
- **Size Report**: "2.4 MB encrypted to 1.8 MB"
- **Next Actions**:
  - "Open folder" button
  - "Encrypt more files" button
  - "View decryption guide" link

### 4. Error Handling & Recovery

#### Common Error Scenarios

**Insufficient Space:**

- Message: "Not enough space. Need X MB, have Y MB available"
- Recovery: "Free up space or choose different location"
- Action: "Choose new location" button

**Permission Denied:**

- Message: "Cannot write to selected folder"
- Recovery: "Choose a folder you have permission to write to"
- Action: "Select different folder" button

**File Access Error:**

- Message: "Cannot read file: [filename]"
- Recovery: "Ensure file is not open in another program"
- Action: "Retry" or "Remove file" buttons

**Key Not Found:**

- Message: "Selected key no longer available"
- Recovery: "Key may have been deleted. Select different key"
- Action: "Refresh keys" button

### 5. Visual Design Requirements

#### Layout Structure

```
┌─────────────────────────────────────┐
│ Header (Trust + Value Proposition)  │ 10%
├─────────────────────────────────────┤
│                                     │
│  Step 1: File Selection            │ 30%
│  [Visual file list or drop zone]   │
│                                     │
├─────────────────────────────────────┤
│  Step 2: Key Selection             │ 20%
│  [Dropdown with key preview]       │
├─────────────────────────────────────┤
│  Step 3: Output Configuration      │ 20%
│  [Path selector + name field]      │
├─────────────────────────────────────┤
│  [Action Buttons]                  │ 10%
├─────────────────────────────────────┤
│  Help/Tips (Collapsible)           │ 10%
└─────────────────────────────────────┘
```

#### Visual Hierarchy

- **Primary Focus**: Current active step
- **Secondary Elements**: Completed steps (checked)
- **Disabled State**: Future steps (grayed out)
- **Action Emphasis**: Encrypt button prominent when ready

#### Color Psychology

- **Trust Blue**: Primary actions and security indicators
- **Success Green**: Completion and valid states
- **Warning Amber**: Size warnings or unusual selections
- **Error Red**: Failures and critical issues
- **Neutral Grays**: Inactive elements and backgrounds

### 6. Interaction Design

#### Progressive Disclosure

- **Step Activation**: Only show relevant controls
- **Smart Defaults**: Pre-fill logical values
- **Contextual Help**: Tooltips on hover, not cluttering
- **Advanced Options**: Hidden by default, expandable

#### Keyboard Navigation

- **Tab Order**: Logical flow through all controls
- **Enter Key**: Advances to next step when valid
- **Escape Key**: Cancels current operation
- **Shortcuts**: Cmd/Ctrl+E for encrypt action

#### Responsive Behavior

- **Desktop**: Full three-column step layout
- **Tablet**: Stacked steps with larger touch targets
- **Resize**: Graceful reflow maintaining usability
- **Scroll**: Minimize need, keep action visible

### 7. Content & Messaging

#### Step Descriptions

- **File Selection**: "Choose the files you want to protect"
- **Key Selection**: "Select your encryption identity"
- **Output Setup**: "Where should your vault be saved?"
- **Ready State**: "Ready to create your encrypted vault"

#### Help Content (Collapsible)

- **File Tips**: "Include wallet files, seed phrases, and access documents"
- **Folder Benefits**: "Preserves structure for easier restoration"
- **Key Reminder**: "Only this key can decrypt these files"
- **Backup Advice**: "Store encrypted vaults in multiple locations"

#### Success Messaging

- **Immediate**: "Success! Your vault is ready"
- **Informative**: "3 files secured in encrypted vault"
- **Actionable**: "Your encrypted vault is saved at: [path]"
- **Educational**: "Remember: Only your chosen key can open this vault"

### 8. Performance Requirements

#### Speed Targets

- **Page Load**: <200ms
- **File Selection Dialog**: <500ms to open
- **Validation Feedback**: <100ms
- **Encryption Start**: <1 second after click
- **Progress Updates**: Every 100ms minimum

#### File Size Handling

- **Optimal**: 0-10MB (instant feeling)
- **Standard**: 10-100MB (clear progress)
- **Large**: 100MB+ (time estimates shown)
- **Warning**: >500MB (unusual for custody)

### 9. Security Considerations

#### Input Validation

- **Path Traversal**: Prevent directory escape attempts
- **File Type Checking**: Warn on suspicious extensions
- **Size Limits**: Reasonable maximums to prevent abuse
- **Name Sanitization**: Clean special characters

#### User Privacy

- **No Logging**: Don't record file names or contents
- **No Analytics**: Don't track what's being encrypted
- **Clear Memory**: Wipe sensitive data after use
- **Local Only**: Emphasize no network transmission

### 10. Testing Requirements

#### Functional Testing

- All three selection modes work correctly
- Validation prevents invalid inputs
- Error messages are helpful and accurate
- Success flow completes reliably

#### Usability Testing

- New users complete encryption in <90 seconds
- Error recovery succeeds >90% of time
- All controls are discoverable
- Help content actually helps

#### Edge Cases

- Empty folder selection
- Very long file paths
- Special characters in names
- Concurrent file access
- Insufficient permissions
- Disk space exhaustion

## Implementation Priorities

### Phase 1: Core Functionality (MVP)

1. Basic file/folder selection with visual feedback
2. Key selection with simple dropdown
3. Output path with validation
4. Basic progress indication
5. Success/error states

### Phase 2: Enhanced UX

1. Drag-and-drop support
2. Advanced progress with stages
3. Smart defaults and recent paths
4. Improved error recovery
5. Help content integration

### Phase 3: Polish & Optimization

1. Animation and transitions
2. Keyboard navigation
3. Performance optimization
4. Advanced validation
5. A/B testing variations

## Success Metrics & KPIs

### User Behavior Metrics

- **First-Try Success Rate**: Target >95%
- **Average Time to Encrypt**: Target <90 seconds
- **Error Rate**: Target <5%
- **Re-encryption Rate**: Measure satisfaction

### Technical Metrics

- **Page Load Time**: <200ms
- **Encryption Speed**: >10MB/s
- **Memory Usage**: <100MB
- **CPU Usage**: <50% single core

### Business Metrics

- **Feature Adoption**: >80% of users encrypt files
- **Repeat Usage**: >60% encrypt multiple times
- **Support Tickets**: <2% users need help
- **User Satisfaction**: >9/10 rating

## Competitive Differentiation

### vs. GPG/Command Line Tools

- **Visual Interface**: No terminal required
- **Guided Process**: Step-by-step workflow
- **Error Prevention**: Validation before execution
- **Progress Feedback**: Know what's happening

### vs. Cloud Encryption Services

- **Local Processing**: Complete privacy
- **No Account Required**: Instant usage
- **Open Source**: Auditable security
- **Bitcoin Optimized**: Custody-specific features

### vs. Generic Encryption Tools

- **Bitcoin Focus**: Understands custody needs
- **Folder Preservation**: Maintains wallet structures
- **Age Standard**: Modern, audited encryption
- **Family Friendly**: Non-technical users succeed

## Risk Mitigation

### Technical Risks

- **Large Files**: Implement streaming encryption
- **Memory Issues**: Process files in chunks
- **Disk Space**: Pre-check available space
- **Permissions**: Graceful handling of access denied

### User Experience Risks

- **Confusion**: Clear labeling and help text
- **Mistakes**: Confirmation before destructive actions
- **Lost Files**: Clear indication of what happens
- **Wrong Key**: Visual confirmation of selection

### Security Risks

- **Weak Paths**: Validate and sanitize all inputs
- **File Exposure**: Never log sensitive information
- **Memory Leaks**: Clear buffers after use
- **Side Channels**: Constant-time operations

## Future Enhancements

### Version 2.0 Possibilities

- Batch encryption queues
- Encryption profiles/templates
- Cloud storage integration
- Scheduled encryption tasks
- Multi-recipient encryption

### Advanced Features

- File preview before encryption
- Compression options
- Metadata stripping
- Secure deletion of originals
- Encryption verification

## Conclusion

The Encrypt screen is where Barqly Vault delivers its core value proposition: transforming vulnerable Bitcoin custody documents into military-grade encrypted vaults. Success requires balancing professional security with approachable simplicity, ensuring every user—from Bitcoin veterans to concerned family members—can confidently protect their financial legacy in under 90 seconds.

This screen must inspire trust through design, prevent errors through validation, and celebrate success through clear feedback. When users complete their first encryption, they should feel the same satisfaction and security as placing valuables in a bank vault, knowing their family's Bitcoin inheritance is protected for generations.

---

_Related Documents:_

- [Project Plan - Section 4.2.4.2](../../../project-plan.md#milestone-4-frontend-foundation)
- [Setup Screen Requirements](../setup-screen/setup-screen-requirements-po.md)
- [User Journey Map](../../user-journey.md)
- [Security Foundations](../../../common/security-foundations.md)
- [Decrypt Screen Requirements](../decrypt-screen/decrypt-screen-requirements-po.md) (to be created)

_Next Steps:_

1. UX Designer to create visual design specifications
2. System Architect to review technical feasibility
3. Engineering team to implement Phase 1 MVP
4. QA to develop test scenarios
5. Product Owner to define A/B test variations
