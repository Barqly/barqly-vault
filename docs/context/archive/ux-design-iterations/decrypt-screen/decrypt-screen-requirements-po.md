# Decrypt Screen Product Requirements

> **Date**: January 2025  
> **Status**: Implementation Requirements  
> **Product Owner**: ZenAI Product SubAgent  
> **Priority**: High - Critical Recovery Capability
> **Context**: Task 4.2.4.3 - Decrypt Page Implementation

## Executive Summary

The Decrypt screen is the moment of truth for Barqly Vault—where users recover their Bitcoin custody data when it matters most. This could be during an emergency, inheritance event, or routine access to secured information. The experience must be flawless under pressure, providing confidence that valuable data can be reliably recovered even years after encryption. Every interaction must reinforce trust while minimizing cognitive load during potentially stressful situations.

## Problem Statement

Bitcoin custody recovery scenarios are inherently high-stakes. Users attempting decryption might be:

- Family members accessing inheritance after loss of a loved one
- Users recovering from hardware failures or disasters
- Professionals helping clients in urgent situations
- HODLers accessing long-term cold storage after years

Current decryption tools fail users when they need them most by:

- Requiring technical knowledge during emotional stress
- Providing cryptic error messages that increase anxiety
- Lacking clear progress indication for large files
- Not preserving critical folder structures for wallet recovery
- Offering no guidance when passphrases are forgotten

Users need a decryption workflow that:

- Works reliably even under emotional stress
- Provides clear, calming guidance at every step
- Preserves exact file structures critical for wallet restoration
- Offers helpful recovery paths when issues arise
- Completes quickly with full transparency

## Success Criteria

### Primary Metrics

- **Decryption Success Rate**: >98% successful recovery on valid attempts
- **Time to Recovery**: <60 seconds for typical custody files
- **Error Recovery Rate**: >85% successful resolution after initial failure
- **User Confidence Score**: 9+ rating on recovery confidence
- **Zero Data Loss**: 100% preservation of original file structures

### Secondary Metrics

- **File Selection Accuracy**: <3% re-selection rate
- **Passphrase Success**: >90% correct on first attempt (with hints)
- **Output Path Clarity**: >95% understand where files were saved
- **Progress Understanding**: 100% users know current operation status
- **Help Utilization**: <10% need external support

### Business Impact

- **Trust Building**: Successful recovery creates lifetime advocates
- **Emergency Readiness**: Users confident in crisis recovery capability
- **Support Cost**: 80% reduction in decryption-related support
- **Reputation**: Recovery reliability drives professional recommendations
- **Retention**: Users who successfully decrypt remain active 5x longer

## User Stories & Acceptance Criteria

### Story 1: Widow Accessing Bitcoin Inheritance

**As** a surviving spouse with limited technical knowledge  
**I want** to decrypt my late partner's Bitcoin custody vault  
**So that** I can access family funds during a difficult time

**Acceptance Criteria:**

- File selection uses familiar interface patterns
- Clear indication of what will be recovered
- Passphrase field provides helpful context/hints
- Success provides immediate access to needed files
- Process works without technical understanding
- Emotional tone is supportive, not clinical

### Story 2: Bitcoin HODLer After Years of Storage

**As** a long-term Bitcoin holder accessing cold storage  
**I want** to decrypt vaults created years ago  
**So that** I can access my accumulated wealth

**Acceptance Criteria:**

- Clear compatibility with older vault versions
- File integrity verification before decryption
- Memory aids for passphrase recovery
- Preservation of original wallet file structures
- Confidence that no data will be corrupted
- Success confirmation with file locations

### Story 3: Professional Custody Manager

**As** a Bitcoin custody professional helping clients  
**I want** efficient batch decryption capabilities  
**So that** I can quickly restore client access

**Acceptance Criteria:**

- Support for multiple file decryption
- Clear progress tracking per file
- Professional error reporting
- Audit trail of operations
- Predictable, reliable behavior
- Client-appropriate visual presentation

### Story 4: Disaster Recovery Scenario

**As** someone recovering from hardware failure or theft  
**I want** to decrypt my backup vaults on new hardware  
**So that** I can restore access to my Bitcoin

**Acceptance Criteria:**

- Works immediately on fresh system install
- No dependency on previous configuration
- Clear guidance for first-time setup
- Handles various backup media types
- Robust error handling for damaged files
- Recovery options for partial corruption

### Story 5: Family Member Testing Access

**As** a family member given emergency access instructions  
**I want** to verify I can decrypt the family vault  
**So that** I'm prepared for actual emergencies

**Acceptance Criteria:**

- Non-destructive test mode available
- Clear indication of test vs. real decryption
- Verification without modifying original files
- Success builds confidence for real scenario
- Educational hints improve understanding

## Functional Requirements

### 1. Page Header & Context Setting

#### Visual Identity

- **Title**: "Decrypt Your Vault" (action-oriented, clear purpose)
- **Subtitle**: "Recover your encrypted Bitcoin custody files"
- **Context Indicators**:
  - Shield icon with unlock symbol (security with access)
  - "Military-grade decryption" trust badge
  - "Your files remain local" privacy indicator
- **Emergency Support**: Subtle link to "Having trouble? Get help"
- **Visual Weight**: Maximum 8% of viewport

#### Emotional Design

- **Reassuring Tone**: "Your data is safe and recoverable"
- **Time Expectation**: "Recovery typically takes under 60 seconds"
- **Trust Building**: "Age encryption standard - proven since 2019"
- **Support Message**: "We're here to help you recover your files"

### 2. Streamlined Recovery Workflow

#### Three-Step Recovery Process

```
[1. Select Vault] → [2. Enter Passphrase] → [3. Choose Destination] → [Decrypt]
       ↓                     ↓                        ↓
 (File validation)    (Secure input)          (Safe location)
```

#### Step 1: Vault File Selection

**File Selection Interface:**

- **Primary Method**: Large, clear "Select Encrypted Vault" button
- **Alternative Method**: Drag-and-drop zone with visual feedback
- **File Validation**:
  - Automatic `.age` format verification
  - File integrity pre-check
  - Size and metadata display
  - Creation date for identification

**Selection Feedback:**

- **File Information Panel**:
  - Filename with icon
  - Size: "2.4 MB encrypted vault"
  - Created: "January 15, 2024"
  - Status: "✓ Valid encryption format"
- **Multiple File Support**: List view for batch operations
- **Remove Option**: Clear × button for each file

**Validation & Guidance:**

- **Format Check**: "✓ Valid Age encrypted file"
- **Integrity Status**: "File integrity verified"
- **Warning States**:
  - "File may be corrupted - proceed with caution"
  - "Unknown encryption format - ensure this is a Barqly vault"

#### Step 2: Secure Passphrase Entry

**Passphrase Input Design:**

- **Field Label**: "Enter your vault passphrase"
- **Helper Text**: "The passphrase you used when creating this vault"
- **Security Features**:
  - Show/hide toggle with 500ms delay
  - Clear button for quick reset
  - No autocomplete or suggestion
  - Secure input masking

**Memory Aids & Recovery:**

- **Contextual Hints** (if metadata available):
  - "Vault created on [date]"
  - "You named this vault: [custom name]"
  - "This vault used key: [key label]"
- **Passphrase Tips**: Expandable section
  - "Check your password manager"
  - "Look for backup notes"
  - "Try variations of common passphrases"
- **Failed Attempt Guidance**:
  - First failure: "Please check your passphrase and try again"
  - Second failure: "Hint: Passphrases are case-sensitive"
  - Third failure: "Need help? View passphrase recovery guide"

#### Step 3: Output Destination

**Smart Destination Selection:**

- **Default Location**: Desktop/Barqly-Recovery-[date]/
- **Custom Path**: Browse button for folder selection
- **Safety Checks**:
  - Write permission validation
  - Sufficient space verification
  - Existing file conflict detection
- **Recent Locations**: Quick-select last 3 destinations

**Output Options:**

- **Folder Creation**: "Create new folder for recovered files"
- **Overwrite Policy**:
  - "Keep both" (default - rename with number)
  - "Replace existing"
  - "Skip duplicates"
- **Preview**: Show where files will be saved

### 3. Decryption Execution

#### Pre-Decryption Confirmation

- **Summary Panel**:
  - Files to decrypt: [count and size]
  - Destination: [full path]
  - Space required: [calculated size]
  - Estimated time: [based on size]
- **Final Check**: "Ready to decrypt your vault?"
- **Start Button**: "Begin Decryption" (prominent, reassuring color)

#### Progress Tracking

**Multi-Phase Progress Display:**

1. **Validation Phase** (0-10%):
   - "Verifying vault integrity..."
   - "Checking passphrase..."
2. **Decryption Phase** (10-70%):
   - "Decrypting your files..."
   - "Processing [current file]..."
3. **Extraction Phase** (70-90%):
   - "Extracting files..."
   - "Preserving folder structure..."
4. **Finalization Phase** (90-100%):
   - "Verifying recovered files..."
   - "Cleanup and optimization..."

**Progress Indicators:**

- **Visual Progress Bar**: Smooth, animated progression
- **Percentage Display**: Clear numerical progress
- **Time Remaining**: "About X seconds remaining"
- **Current Operation**: Specific file being processed
- **Cancel Option**: Available until 90% complete

#### Success State

**Recovery Celebration:**

- **Visual Confirmation**: Professional success animation
- **Clear Summary**:
  - "✓ Successfully recovered X files"
  - "Files saved to: [path with open button]"
  - "Total size: X MB recovered"
- **File List**: Expandable list of recovered files
- **Immediate Actions**:
  - "Open Folder" - navigate to recovered files
  - "Decrypt Another" - reset for new operation
  - "Verify Files" - optional integrity check

**Recovery Report:**

- **Detailed Summary** (optional view):
  - Files recovered with original names
  - Folder structure preservation status
  - Any warnings or notes
  - Timestamp of recovery
- **Print/Save Option**: For record keeping

### 4. Error Handling & Recovery

#### Critical Error Scenarios

**Wrong Passphrase:**

- **Message**: "Unable to decrypt - passphrase may be incorrect"
- **Guidance**: "Passphrases are case-sensitive and must match exactly"
- **Recovery Options**:
  - "Try Again" - clear field and retry
  - "View Passphrase Tips" - expansion panel
  - "Contact Support" - last resort option
- **Attempt Tracking**: Show attempt count (without lockout)

**Corrupted File:**

- **Message**: "File appears to be damaged or incomplete"
- **Details**: "The vault file may have been corrupted during storage"
- **Recovery Options**:
  - "Try Another Copy" - select different file
  - "Partial Recovery" - attempt to recover what's possible
  - "File Repair Guide" - advanced recovery steps

**Insufficient Space:**

- **Message**: "Not enough space to recover files"
- **Details**: "Need X MB, only Y MB available at destination"
- **Recovery Options**:
  - "Choose Different Location" - select new path
  - "Free Up Space" - guidance on clearing space
  - "Calculate Space" - show detailed breakdown

**Permission Denied:**

- **Message**: "Cannot write to selected location"
- **Details**: "You don't have permission to save files here"
- **Recovery Options**:
  - "Choose Another Folder" - new selection
  - "Fix Permissions" - OS-specific guidance
  - "Use Default Location" - fallback to Desktop

**Partial Failure:**

- **Message**: "Some files could not be recovered"
- **Details**: List of successful and failed files
- **Recovery Options**:
  - "Save Report" - detailed failure log
  - "Retry Failed Files" - attempt again
  - "Continue Anyway" - proceed with successful files

### 5. Visual Design Requirements

#### Layout Structure

```
┌─────────────────────────────────────┐
│ Header (Trust + Purpose)            │ 8%
├─────────────────────────────────────┤
│                                     │
│  Step 1: Vault Selection            │ 25%
│  [File info + validation status]    │
│                                     │
├─────────────────────────────────────┤
│  Step 2: Passphrase Entry          │ 25%
│  [Secure input + memory aids]      │
├─────────────────────────────────────┤
│  Step 3: Destination               │ 20%
│  [Path selector + options]         │
├─────────────────────────────────────┤
│  [Action Button Area]              │ 10%
├─────────────────────────────────────┤
│  Status/Progress Area              │ 12%
└─────────────────────────────────────┘
```

#### Visual Hierarchy

- **Primary Focus**: Current active step (highlighted)
- **Completed Steps**: Check mark with muted styling
- **Pending Steps**: Grayed out until available
- **Action Button**: Prominent when all requirements met
- **Errors**: Immediate attention without panic

#### Color Psychology

- **Calming Blue**: Primary actions and progress
- **Success Green**: Successful recovery confirmation
- **Soft Warning**: Amber for caution without alarm
- **Error Red**: Used sparingly, with solution focus
- **Neutral Grays**: Background and inactive elements

### 6. Interaction Design

#### Cognitive Load Reduction

- **Progressive Activation**: Only show relevant options
- **Smart Defaults**: Logical pre-selections
- **Inline Validation**: Immediate feedback
- **Clear CTAs**: Obvious next steps
- **Minimal Decisions**: Reduce choice paralysis

#### Keyboard Support

- **Tab Navigation**: Logical flow through controls
- **Enter Key**: Submit when form valid
- **Escape Key**: Cancel current operation
- **Shortcuts**:
  - Cmd/Ctrl+O: Open file selector
  - Cmd/Ctrl+V: Paste passphrase
  - Cmd/Ctrl+D: Start decryption

#### Responsive Behavior

- **Desktop**: Full three-panel layout
- **Tablet**: Stacked steps with larger targets
- **Window Resize**: Graceful reflow
- **Scroll Behavior**: Keep action button visible

### 7. Content & Messaging

#### Step Instructions

- **File Selection**: "Select your encrypted vault file"
- **Passphrase**: "Enter the passphrase used for encryption"
- **Destination**: "Choose where to save recovered files"
- **Ready**: "Everything ready - decrypt your vault"

#### Helpful Context (Collapsible)

- **About Vaults**: "Barqly vaults are Age-encrypted archives"
- **Passphrase Help**: "The exact phrase used during encryption"
- **Recovery Tips**: "Files are restored with original names"
- **Security Note**: "Decryption happens entirely on your device"

#### Success Messages

- **Immediate**: "Success! Your files are recovered"
- **Specific**: "X files restored to [location]"
- **Actionable**: "Open folder to access your files"
- **Reassuring**: "All files recovered with original structure intact"

### 8. Performance Requirements

#### Speed Targets

- **Page Load**: <150ms
- **File Validation**: <500ms
- **Passphrase Check**: <1 second
- **Decryption Start**: <500ms after confirmation
- **Progress Updates**: Every 100ms
- **Small Files (<10MB)**: <5 seconds total
- **Medium Files (10-100MB)**: <30 seconds total
- **Large Files (>100MB)**: Show accurate time estimate

#### Resource Management

- **Memory**: Stream large files (don't load entirely)
- **CPU**: Single-threaded decryption (predictable)
- **Disk I/O**: Buffered writes for performance
- **UI Responsiveness**: Never block interface

### 9. Security Considerations

#### Passphrase Handling

- **No Persistence**: Clear from memory immediately after use
- **No Logging**: Never write passphrase to logs
- **Secure Input**: Protected against screen capture
- **Clear Option**: Explicit user control to clear
- **No History**: Disable browser/OS history

#### File Safety

- **Validation First**: Check file integrity before processing
- **Safe Extraction**: Prevent path traversal attacks
- **Preserve Permissions**: Maintain original file permissions
- **No Modification**: Never alter original encrypted file
- **Atomic Operations**: All-or-nothing file recovery

#### Privacy Protection

- **Local Only**: All operations on user's device
- **No Analytics**: Don't track decryption operations
- **No Filenames**: Never log or transmit filenames
- **Memory Cleanup**: Zero sensitive memory after use

### 10. Accessibility Requirements

#### Visual Accessibility

- **High Contrast**: Clear visual separation
- **Focus Indicators**: Visible keyboard focus
- **Error Colors**: Not solely color-dependent
- **Text Size**: Minimum 14px, scalable
- **Icons**: Always paired with text labels

#### Screen Reader Support

- **Semantic HTML**: Proper heading structure
- **ARIA Labels**: Descriptive labels for all controls
- **Live Regions**: Announce progress updates
- **Error Announcements**: Immediate error notification
- **Success Confirmation**: Clear completion announcement

#### Interaction Accessibility

- **Keyboard Only**: Full keyboard navigation
- **Focus Management**: Logical tab order
- **Skip Links**: Jump to main content
- **Time Limits**: No automatic timeouts
- **Help Access**: Keyboard-accessible help

### 11. Testing Requirements

#### Functional Testing

- **File Format Support**: Various .age file versions
- **Passphrase Variations**: Special characters, lengths
- **File Sizes**: From bytes to gigabytes
- **Batch Operations**: Multiple file handling
- **Error Conditions**: All error scenarios

#### Usability Testing

- **Emergency Scenarios**: Test under stress conditions
- **Non-Technical Users**: Complete without help
- **Time Pressure**: Maintain accuracy when rushed
- **Error Recovery**: Successfully recover from mistakes
- **Help Effectiveness**: Help content actually helps

#### Edge Cases

- **Empty Archives**: Handle gracefully
- **Huge Files**: Gigabyte+ smooth handling
- **Long Paths**: OS path limit handling
- **Special Characters**: Unicode in filenames
- **Concurrent Access**: File locked scenarios
- **Disk Full**: Mid-operation space exhaustion
- **Power Loss**: Recovery from interruption

### 12. Integration Requirements

#### Setup Screen Integration

- **Key Recognition**: Auto-detect keys from Setup
- **Passphrase Hints**: Reference key labels
- **Consistent UI**: Matching visual patterns
- **Shared Components**: Reuse UI elements

#### Encrypt Screen Integration

- **Format Compatibility**: Decrypt any encrypted vault
- **Metadata Usage**: Use custom names if available
- **Progress Patterns**: Consistent progress display
- **Error Handling**: Unified error approach

#### System Integration

- **File Manager**: Native file selection dialogs
- **OS Permissions**: Handle OS security prompts
- **Clipboard**: Secure passphrase paste
- **Notifications**: Optional completion notifications

## Implementation Priorities

### Phase 1: Core Functionality (MVP)

1. Basic file selection and validation
2. Passphrase input with show/hide
3. Simple destination selection
4. Basic decryption with progress
5. Success/error states
6. File list display

### Phase 2: Enhanced Recovery

1. Memory aids and hints
2. Batch file support
3. Advanced progress tracking
4. Detailed error recovery
5. File integrity verification
6. Recovery reports

### Phase 3: Polish & Optimization

1. Animations and transitions
2. Drag-and-drop support
3. Keyboard shortcuts
4. Performance optimization
5. Accessibility enhancements
6. Help system integration

## Success Metrics & KPIs

### User Behavior Metrics

- **First-Attempt Success**: >90% successful decryption
- **Recovery Time**: <60 seconds average
- **Error Resolution**: >85% self-resolve errors
- **Help Usage**: <10% need external help
- **Completion Rate**: >98% started operations complete

### Technical Metrics

- **Decryption Speed**: >20MB/s
- **Memory Usage**: <150MB for typical files
- **UI Responsiveness**: <100ms interaction delay
- **File Integrity**: 100% successful recovery
- **Format Support**: All .age versions supported

### Business Metrics

- **Trust Score**: 9+ user confidence rating
- **Support Reduction**: 80% fewer support tickets
- **User Retention**: 5x higher for successful users
- **Recommendations**: 3x more likely to recommend
- **Emergency Success**: >95% emergency recovery success

## Competitive Differentiation

### vs. Command Line Tools

- **Visual Interface**: No terminal knowledge required
- **Progress Feedback**: Clear operation status
- **Error Recovery**: Guided problem resolution
- **Memory Aids**: Helpful context and hints

### vs. Generic Encryption Tools

- **Bitcoin Optimized**: Understands custody workflows
- **Folder Preservation**: Maintains wallet structures
- **Emergency Ready**: Designed for stress scenarios
- **Family Friendly**: Non-technical family members succeed

### vs. Cloud Services

- **Fully Local**: Complete privacy and control
- **No Account**: Works without registration
- **Offline Capable**: No internet required
- **Open Source**: Auditable security

## Risk Mitigation

### Technical Risks

- **File Corruption**: Implement recovery modes
- **Memory Limits**: Stream processing for large files
- **Compatibility**: Support all .age versions
- **Performance**: Optimize for large archives

### User Experience Risks

- **Panic Scenarios**: Calming, clear interface
- **Forgotten Passphrases**: Maximum recovery help
- **Technical Barriers**: Eliminate jargon
- **Stress Errors**: Prevent mistakes through design

### Security Risks

- **Passphrase Exposure**: Multiple protection layers
- **File Tampering**: Integrity verification
- **Memory Attacks**: Secure memory handling
- **Social Engineering**: Clear security indicators

## Future Enhancements

### Version 2.0 Possibilities

- **Partial Recovery**: Recover from damaged vaults
- **Cloud Vault Support**: Decrypt from cloud storage
- **Multi-Key Support**: Try multiple keys automatically
- **Recovery Assistant**: AI-guided troubleshooting
- **Audit Logging**: Optional operation history

### Advanced Features

- **Preview Mode**: See file list before full decrypt
- **Selective Recovery**: Choose specific files
- **Format Conversion**: Export to other formats
- **Integrity Verification**: Deep file validation
- **Recovery Attestation**: Proof of successful recovery

## Conclusion

The Decrypt screen is where Barqly Vault proves its worth—when users need their Bitcoin custody data most. Whether it's a widow accessing inheritance, a HODLer retrieving cold storage, or a family testing emergency procedures, this screen must deliver flawless recovery with compassionate design.

Success means more than technical decryption; it means providing confidence during uncertainty, clarity during stress, and reliability when failure isn't an option. Every design decision must consider the emotional and practical context of recovery scenarios.

When users successfully decrypt their first vault, they should feel the relief and confidence that comes from knowing their Bitcoin wealth is both secure and accessible—protected for the future but available when needed. This balance of security and accessibility is what makes Barqly Vault essential for serious Bitcoin custody.

---

_Related Documents:_

- [Project Plan - Section 4.2.4.3](../../../project-plan.md#milestone-4-frontend-foundation)
- [Setup Screen Requirements](../setup-screen/setup-screen-requirements-po.md)
- [Encrypt Screen Requirements](../encrypt-screen/encrypt-screen-requirements-po.md)
- [User Journey Map](../../user-journey.md)
- [Security Foundations](../../../common/security-foundations.md)

_Next Steps:_

1. UX Designer to create visual design specifications
2. System Architect to review technical feasibility
3. Engineering team to implement Phase 1 MVP
4. QA to develop test scenarios
5. Customer Advocate to validate user stories
6. Product Owner to prioritize edge cases
