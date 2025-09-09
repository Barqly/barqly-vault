# YubiKey Integration Requirements - Product Owner Analysis

_Comprehensive user requirements analysis for YubiKey hardware authentication integration in Barqly Vault_

**Created**: January 2025  
**Version**: 1.0  
**Status**: Requirements Definition  
**Author**: Product Owner

## Executive Summary

This document translates the YubiKey integration vision into actionable user requirements, focused on delivering real customer value while preserving the core Barqly Vault experience. Our analysis reveals that YubiKey integration addresses three critical user pain points: single point of failure (passphrase-only), hardware compromise resistance, and institutional-grade security for high-value Bitcoin custody.

**Key Insight**: Users don't want complexity - they want confidence. YubiKey integration must feel like a natural evolution of existing security, not a technical burden.

## Customer Problem Analysis

### Primary Pain Points Addressed

#### 1. Single Point of Failure Risk
**Current State**: v0.1.0 users rely solely on passphrase protection  
**Pain Point**: "What if I forget my passphrase or someone compromises it?"  
**Solution**: Hybrid protection mode providing redundant unlock methods

#### 2. Advanced Threat Model Coverage  
**Current State**: Software-based key protection only  
**Pain Point**: "I need hardware-level security for large Bitcoin holdings"  
**Solution**: YubiKey-only mode with hardware-bound private keys

#### 3. Institutional/Professional Requirements
**Current State**: Limited compliance with enterprise security standards  
**Pain Point**: "My company requires hardware authentication for Bitcoin custody"  
**Solution**: FIDO2/PIV compliance through YubiKey integration

## User Persona Impact Analysis

### The Bitcoin Family (70% of users) - PRIMARY IMPACT

**Current Behavior**: Creates backup, hopes passphrase is memorable but secure  
**New Capability**: Can set up hybrid protection - YubiKey + memorable passphrase  
**Value Proposition**: "Even if you forget your passphrase, your YubiKey can still protect your family's Bitcoin"  

**Journey Enhancement**:
- **Setup**: Choose "Both YubiKey and Passphrase (Recommended)" 
- **Daily Use**: Encrypt still requires no hardware (convenience preserved)
- **Emergency Recovery**: Multiple unlock paths reduce family stress during inheritance situations

### The Bitcoin Professional (20% of users) - STRONG SECONDARY IMPACT  

**Current Behavior**: Uses Barqly Vault for client work, worries about enterprise security standards  
**New Capability**: YubiKey-only mode meets institutional requirements  
**Value Proposition**: "Provide clients with hardware-grade Bitcoin custody backup security"

**Journey Enhancement**:
- **Setup**: "YubiKey Only" mode for maximum security
- **Client Trust**: Hardware authentication visible during demonstrations
- **Compliance**: Meets enterprise security requirements

### The Bitcoin Newcomer (10% of users) - NEUTRAL IMPACT

**Current Behavior**: Follows recommended settings, wants simplicity  
**New Capability**: Can safely ignore YubiKey features initially  
**Value Proposition**: "Start simple, add hardware security later when ready"

**Journey Protection**:
- **Setup**: "Passphrase Only" remains default, prominent option
- **Education**: Clear explanation that YubiKey is optional enhancement
- **Growth Path**: Can upgrade protection mode as confidence grows

## Complete User Journey Mapping

### Journey 1: Hybrid Protection Mode Setup (Recommended Path)

#### Discovery & Decision
**User State**: "I want the best of both worlds - convenient passphrase plus hardware backup"

**Touchpoints**:
- Setup screen: Protection mode selection with clear recommendations
- Educational content explaining hybrid benefits
- YubiKey detection and verification

**User Actions**:
1. Opens Setup tab, sees three protection mode options
2. Reads "Both (Recommended for Families)" description
3. Plugs in YubiKey, sees device detected confirmation
4. Proceeds with hybrid setup

**Success Criteria**:
- User understands hybrid mode provides redundancy without complexity
- YubiKey detection works seamlessly across all supported devices
- Clear explanation of when each method will be used

#### YubiKey Initialization Flow
**User State**: "I need to set up my YubiKey for Bitcoin protection"

**Critical Moments**:
1. **YubiKey Detection**: "Connect your YubiKey" → System finds device → "YubiKey 5 NFC detected ✓"
2. **PIN Setup**: Clear explanation of PIV PIN requirement with security rationale
3. **Key Generation**: "Generating hardware-bound encryption key..." with progress indication
4. **Touch Confirmation**: Clear instruction for YubiKey touch requirement

**Error Scenarios & Recovery**:
- **No YubiKey Present**: Clear guidance, option to switch to passphrase-only
- **YubiKey Already Initialized**: Detection of existing PIV setup, migration options
- **PIN Lockout**: Clear explanation of PUK recovery process
- **Touch Timeout**: Retry mechanism with clear instructions

#### Passphrase Creation (Same as v0.1.0)
**User State**: "Now I'll create my memorable passphrase as backup method"

**Flow**: Identical to current v0.1.0 experience
**Value**: User comfort with familiar process, no complexity increase

#### Completion & Verification
**User State**: "I want confidence both protection methods work"

**Success Confirmation**:
- "Your vault is now protected by both YubiKey and passphrase"
- Clear explanation: "Files can be decrypted using either method"
- Next steps: "Ready to encrypt your first files"

### Journey 2: YubiKey-Only Protection Setup (Security-First Path)

#### Discovery & Decision
**User State**: "I need maximum security, hardware-only protection"

**Target User**: Bitcoin Professional with institutional requirements
**Selection Trigger**: "YubiKey Only (Maximum Security)" option

#### Simplified Setup Flow
**Advantages**:
- No passphrase creation required
- Faster setup process
- Clear security model

**YubiKey Initialization**: Same as hybrid mode
**Completion**: "Your vault requires YubiKey for all operations"
**Warning**: Clear explanation of recovery implications if YubiKey is lost

### Journey 3: Migration from v0.1.0 Passphrase-Only

#### Discovery Trigger
**User State**: "I have existing encrypted vaults, want to add YubiKey protection"

**Entry Points**:
- Application update notification: "New: Add YubiKey protection to existing vaults"
- Settings menu: "Upgrade Protection Mode"
- Decrypt screen: "Enhance security with YubiKey"

#### Migration Decision Flow
**Critical Questions**:
1. "Keep existing passphrase method?" (Recommended: Yes)
2. "Add YubiKey as additional protection?" (Creates hybrid mode)
3. "Which existing vaults to upgrade?" (Selective migration)

#### Vault Re-encryption Process
**User Understanding**: "Adding YubiKey protection requires re-encrypting your vaults"

**Process Flow**:
1. Select vaults to upgrade
2. Decrypt with current passphrase
3. Re-encrypt with new protection mode (hybrid or YubiKey-only)
4. Verify new protection mode works
5. Option to keep original vaults as backup during transition

**Success Criteria**:
- Zero data loss during migration
- Clear progress indication for large vaults
- Rollback option if migration fails
- Verification that both old and new protection methods work

## Daily Usage Workflows

### Encryption Flow (No Changes)
**Key Insight**: Encryption uses public keys only - no hardware interaction required

**User Experience**: Identical to v0.1.0 for all protection modes
**Value**: No friction added to primary workflow
**Implementation**: Age multi-recipient encryption handles protection mode abstraction

### Smart Decryption Flow (New Intelligence)

#### Automatic Method Detection
**User State**: "I want to decrypt this vault with the easiest available method"

**Smart Selection Logic**:
1. **YubiKey Present + Hybrid Mode**: "Decrypt with YubiKey (no passphrase required)"
2. **YubiKey Missing + Hybrid Mode**: "Decrypt with passphrase"
3. **YubiKey-Only Mode**: "Connect YubiKey to decrypt"
4. **Passphrase-Only**: Current v0.1.0 behavior

#### Manual Override Options
**User Control**: "Let me choose my unlock method"

**Interface**:
- Primary button: Smart suggestion
- Secondary option: Alternative method (when available)
- Clear indication of why each method is/isn't available

#### YubiKey Unlock Experience
**Process Flow**:
1. Click "Decrypt with YubiKey"
2. Enter PIV PIN (if required)
3. Touch YubiKey when prompted
4. Files decrypt automatically

**Success Indicators**:
- Clear visual feedback for each step
- Progress indication during decryption
- Success confirmation with next steps

## Error Scenarios & Recovery Paths

### Category 1: Hardware Availability Issues

#### YubiKey Not Present (Hybrid Mode)
**Error State**: User wants to decrypt but YubiKey not connected
**Recovery Path**: Automatic fallback to passphrase method
**User Guidance**: "YubiKey not detected. Use your passphrase instead?"

#### YubiKey Not Present (YubiKey-Only Mode)
**Error State**: Cannot decrypt without hardware
**Recovery Path**: Clear instructions to connect YubiKey
**User Guidance**: "This vault requires your YubiKey to decrypt. Please connect it."

#### Wrong YubiKey Connected
**Error State**: Different YubiKey than originally used
**Recovery Path**: Detection and clear error message
**User Guidance**: "This YubiKey doesn't match your vault. Connect the original device."

### Category 2: Authentication Issues

#### PIV PIN Required
**User State**: YubiKey connected but needs PIN
**User Experience**: Clear PIN entry dialog with security explanation
**Error Handling**: PIN retry with attempt counter display

#### PIN Lockout
**Error State**: Too many failed PIN attempts
**Recovery Guidance**: 
- Explanation of PUK recovery process
- Links to YubiKey reset procedures
- Option to use passphrase method (hybrid mode only)

#### Touch Required But Not Completed
**Error State**: User must touch YubiKey but doesn't
**User Experience**: 
- Clear visual indication of touch requirement
- Timeout with retry option
- Animation showing YubiKey touch location

### Category 3: Setup Issues

#### YubiKey Already Has PIV Key
**Discovery**: During setup, PIV slot already occupied
**Options**:
1. Overwrite existing key (with clear warning)
2. Use existing key (if compatible)
3. Choose different protection mode

#### Unsupported YubiKey Model
**Error State**: Connected YubiKey doesn't support required features
**Recovery Path**: 
- Clear compatibility information
- List of supported models
- Option to continue with passphrase-only

## Success Metrics & Validation Criteria

### User Experience Metrics

#### Setup Success Rates
- **90-Second Goal Maintenance**: All protection modes must complete setup within 90 seconds
  - Passphrase-only: <60 seconds (baseline)
  - YubiKey-only: <75 seconds (target)
  - Hybrid mode: <90 seconds (maximum)

#### User Comprehension
- **Protection Mode Understanding**: 95% of users correctly explain their chosen protection mode
- **Recovery Path Awareness**: 90% of hybrid-mode users know they have two unlock methods
- **Security Model Confidence**: 85% of YubiKey users express confidence in hardware security

### Technical Performance Metrics

#### Hardware Integration
- **YubiKey Detection Time**: <2 seconds across all supported operating systems
- **Touch Response Time**: <3 seconds from touch to decryption start
- **Multi-recipient Encryption Impact**: <15% performance degradation from single recipient

#### Error Recovery Success
- **Fallback Success Rate**: 95% of hybrid-mode users successfully use passphrase when YubiKey unavailable  
- **PIN Recovery Success**: 80% of PIN-locked users successfully regain access through guided recovery
- **Migration Success Rate**: 99.9% of v0.1.0 vault upgrades complete without data loss

### Adoption & Business Metrics

#### Feature Adoption
- **YubiKey Mode Selection**: 40% of new users choose YubiKey-enabled protection modes
- **Migration Rate**: 25% of v0.1.0 users upgrade to YubiKey protection within 6 months
- **Professional Recommendation**: 60% of Bitcoin Professional persona users recommend to clients

## Risk Assessment & Mitigation

### User Experience Risks

#### Risk: Complexity Creep
**Description**: Additional options confuse users, reducing setup completion rates  
**Probability**: Medium  
**Impact**: High (threatens core 90-second goal)

**Mitigation Strategies**:
- Progressive disclosure: Simple default with advanced options hidden
- Smart defaults: "Both (Recommended)" prominently positioned
- Clear explanations: Plain language benefits, not technical features
- User testing: Validate decision flow with target personas

#### Risk: Hardware Lock-out Scenarios
**Description**: Users lose YubiKey or forget PIN, cannot access vaults  
**Probability**: Low  
**Impact**: Critical (complete data loss for YubiKey-only users)

**Mitigation Strategies**:
- Hybrid mode as default recommendation
- Mandatory backup method education during setup
- Clear recovery documentation
- PUK recovery process guidance
- Professional mode warnings for YubiKey-only selection

#### Risk: Setup Friction Increase
**Description**: YubiKey initialization adds complexity that discourages adoption  
**Probability**: Medium  
**Impact**: Medium (reduced new user conversion)

**Mitigation Strategies**:
- Maintain passphrase-only as simple default option
- Streamlined YubiKey setup flow with clear progress indication
- Option to add YubiKey protection later (post-setup enhancement)
- Clear time expectations: "This takes about 30 seconds"

### Technical Risks

#### Risk: Cross-Platform Compatibility Issues
**Description**: YubiKey integration works inconsistently across operating systems  
**Probability**: High  
**Impact**: High (fragmented user experience)

**Mitigation Strategies**:
- Comprehensive testing matrix across OS versions
- Platform-specific documentation and troubleshooting
- Graceful degradation when hardware features unavailable
- Clear system requirement communication

#### Risk: age-plugin-yubikey Dependencies
**Description**: External plugin creates deployment and maintenance complexity  
**Probability**: Medium  
**Impact**: Medium (deployment issues, update coordination)

**Mitigation Strategies**:
- Plugin bundling strategy with application distribution
- Version compatibility testing and documentation
- Fallback mechanisms when plugin unavailable
- Clear error messages for plugin-related issues

### Business Risks

#### Risk: Feature Scope Expansion
**Description**: YubiKey integration opens requests for other hardware wallet types  
**Probability**: High  
**Impact**: Medium (resource allocation pressure, focus dilution)

**Mitigation Strategy**:
- Clear YubiKey-first messaging emphasizing security industry standards
- Evaluation framework for future hardware integration requests
- Focus on perfecting YubiKey experience before expanding

## Implementation Priorities

### Must-Have (MVP Features)

1. **Three Protection Modes**: Passphrase-only, YubiKey-only, Hybrid
2. **Smart Decryption**: Automatic method selection with manual override
3. **v0.1.0 Compatibility**: Existing vaults continue working unchanged
4. **Cross-Platform Support**: macOS, Windows, Linux YubiKey operation
5. **90-Second Setup Goal**: Maintained across all protection modes

### Should-Have (Phase 2 Enhancements)

1. **Migration Tools**: In-app upgrade from passphrase-only to hybrid mode
2. **Multiple YubiKey Support**: Register multiple devices for redundancy
3. **Enhanced Error Recovery**: Guided troubleshooting for common issues
4. **Usage Analytics**: Understanding of protection mode adoption rates

### Could-Have (Future Consideration)

1. **YubiKey Management**: Advanced PIV slot management and configuration
2. **Compliance Reporting**: Audit logs for institutional users
3. **Family Sharing**: Multiple YubiKeys protecting same vault
4. **Backup YubiKey Registration**: Easy setup of redundant hardware devices

## Documentation Requirements

### User-Facing Documentation

1. **Protection Mode Selection Guide**: Helping users choose the right security model
2. **YubiKey Setup Tutorial**: Step-by-step hardware initialization process
3. **Recovery Procedures**: What to do when YubiKey is lost, PIN forgotten, etc.
4. **Migration Guide**: Upgrading existing v0.1.0 vaults to YubiKey protection
5. **Troubleshooting Guide**: Common issues and resolution steps

### Technical Documentation

1. **YubiKey Compatibility Matrix**: Supported models and features
2. **System Requirements**: Platform-specific setup requirements
3. **Security Architecture**: How YubiKey integration affects the threat model
4. **API Changes**: Impact on Tauri command structure and TypeScript types

## Integration with Product Roadmap

### Immediate Value (Phase 2 - Q1 2026)
YubiKey integration directly supports the "Enhanced Security" theme:
- Addresses professional user needs for institutional-grade security
- Provides family users with redundant protection against single points of failure
- Maintains backward compatibility preserving existing user base

### Future Synergies
- **Multi-recipient encryption**: YubiKey integration enables family member key distribution
- **Bitcoin wallet integration**: Hardware authentication extends naturally to wallet key protection
- **Digital signatures**: YubiKey PIV capabilities support manifest signing for authenticity verification

## Definition of Success

### Quantitative Success Criteria
- **85% setup completion rate** maintained across all protection modes
- **25% YubiKey adoption rate** within 6 months of release
- **Zero data loss incidents** during protection mode migration
- **<5% support requests** related to YubiKey functionality

### Qualitative Success Indicators
- Users express **increased confidence** in their Bitcoin backup security
- Bitcoin professionals **recommend Barqly Vault** to institutional clients
- Community discussions show **positive sentiment** about hardware authentication
- No user reports of **confused or frustrating** YubiKey experiences

### Success Measurement Timeline
- **Week 1**: Technical functionality validation
- **Month 1**: User experience metrics and early adoption feedback
- **Month 3**: Protection mode selection patterns and user satisfaction surveys
- **Month 6**: Migration rates and professional recommendation tracking

## Detailed User Stories with Acceptance Criteria

### Epic 1: Protection Mode Selection

#### Story 1.1: As a Bitcoin Family user, I want to choose my vault protection method so that I can balance security with usability

**Acceptance Criteria**:
- [ ] Setup screen displays three protection mode options with clear descriptions
- [ ] "Both YubiKey and Passphrase (Recommended)" option is visually prominent
- [ ] Each option includes benefits explanation in plain language
- [ ] Selection enables/disables appropriate setup flows
- [ ] User can change protection mode during setup process
- [ ] Protection mode choice is clearly confirmed before proceeding
- [ ] Setup time remains under 90 seconds for all protection modes

**Definition of Ready**:
- UX mockups approved for protection mode selection interface
- Technical architecture confirmed for multi-recipient support
- Copy approved for protection mode descriptions

**Definition of Done**:
- All protection modes selectable and functional
- User testing validates 95% comprehension of protection mode differences
- Setup completion rates maintained at 85% or higher
- No accessibility violations (WCAG 2.1 AA compliance)

#### Story 1.2: As a Bitcoin Professional, I want YubiKey-only protection so that I can meet institutional security requirements

**Acceptance Criteria**:
- [ ] "YubiKey Only (Maximum Security)" option clearly available
- [ ] Selection bypasses passphrase creation flow entirely
- [ ] Clear warning about recovery implications if YubiKey lost
- [ ] Professional users understand this choice requires hardware for all operations
- [ ] Setup completes in under 75 seconds
- [ ] Generated vault metadata indicates YubiKey-only protection mode

**Definition of Ready**:
- Professional persona requirements validated through user interviews
- YubiKey-only technical implementation confirmed feasible
- Warning language approved by security team

**Definition of Done**:
- YubiKey-only vaults encrypt and decrypt successfully
- Professional user testing shows 100% understanding of security model
- No fallback to passphrase methods possible (as designed)
- Clear error messages when YubiKey unavailable

### Epic 2: YubiKey Detection and Setup

#### Story 2.1: As a user, I want the system to detect my YubiKey automatically so that setup feels seamless

**Acceptance Criteria**:
- [ ] YubiKey detection occurs within 2 seconds of connection
- [ ] System recognizes YubiKey 5 series, YubiKey 5C, YubiKey 5 NFC models
- [ ] Clear visual confirmation: "YubiKey 5 NFC detected ✓"
- [ ] Detection works across macOS, Windows, Linux
- [ ] Graceful handling when no YubiKey present
- [ ] Multiple YubiKeys connected shows selection interface

**Definition of Ready**:
- YubiKey compatibility matrix defined and tested
- Cross-platform detection library integrated
- Error handling specifications approved

**Definition of Done**:
- Detection success rate >95% across supported platforms
- Average detection time <2 seconds
- Clear error messages for unsupported devices
- No false positive detections

#### Story 2.2: As a user, I want to initialize my YubiKey for vault protection so that my private key is hardware-bound

**Acceptance Criteria**:
- [ ] PIV slot initialization process clearly explained
- [ ] PIN setup required with secure PIN generation guidance
- [ ] Touch confirmation required for key generation
- [ ] Progress indication during key generation (15-30 seconds)
- [ ] Success confirmation with next steps
- [ ] Handle existing PIV keys appropriately (overwrite warning)

**Definition of Ready**:
- PIV slot management strategy defined
- PIN requirements and security guidelines established
- Key generation process tested with multiple YubiKey models

**Definition of Done**:
- Key generation success rate >99%
- Clear user understanding of PIN requirements
- Appropriate handling of all YubiKey states (new, initialized, locked)
- Touch requirement clearly communicated and successful

### Epic 3: Smart Decryption Experience

#### Story 3.1: As a hybrid protection user, I want automatic unlock method selection so that decryption is convenient but secure

**Acceptance Criteria**:
- [ ] When YubiKey present: "Decrypt with YubiKey" is primary option
- [ ] When YubiKey missing: "Decrypt with passphrase" is primary option  
- [ ] Manual override always available: "Try different method"
- [ ] Clear explanation of why each method is/isn't available
- [ ] Smooth transition between methods if first attempt fails
- [ ] Decryption success rate maintained at >95%

**Definition of Ready**:
- Smart selection logic algorithm defined and tested
- UI flows approved for all unlock scenarios
- Error handling specifications complete

**Definition of Done**:
- Users successfully decrypt with both methods
- Method selection logic works correctly 100% of time
- Manual override accessible and functional
- Clear user feedback for all method availability states

#### Story 3.2: As a YubiKey user, I want clear guidance through the touch-and-PIN process so that hardware unlock feels reliable

**Acceptance Criteria**:
- [ ] PIN entry dialog appears when required with clear instructions
- [ ] Touch requirement clearly indicated with visual cues
- [ ] Timeout handling with retry options
- [ ] Progress indication during YubiKey operations
- [ ] Success feedback with smooth transition to file selection
- [ ] Error recovery for common issues (wrong PIN, no touch, etc.)

**Definition of Ready**:
- YubiKey interaction flows defined and tested
- Error scenarios identified and solutions designed
- Visual design approved for PIN entry and touch indication

**Definition of Done**:
- Hardware unlock success rate >90%
- Users understand each step of the process
- Appropriate error messages for all failure scenarios
- Touch requirement response time <3 seconds

### Epic 4: Migration and Backward Compatibility

#### Story 4.1: As a v0.1.0 user, I want to upgrade my existing vaults with YubiKey protection so that I can improve security without losing data

**Acceptance Criteria**:
- [ ] Migration option available in settings or vault management
- [ ] Clear explanation of re-encryption process required
- [ ] Backup creation strongly recommended before migration
- [ ] Progress indication for large vault migrations
- [ ] Rollback option if migration fails
- [ ] Original vault preservation until migration confirmed successful
- [ ] Zero data loss during migration process

**Definition of Ready**:
- Migration process technically validated with test data
- Backup and rollback procedures defined
- User education materials prepared

**Definition of Done**:
- Migration success rate >99.9%
- No reported data loss incidents
- Users understand migration implications
- Rollback process tested and functional

#### Story 4.2: As a user, I want my v0.1.0 vaults to continue working unchanged so that YubiKey integration doesn't break existing functionality

**Acceptance Criteria**:
- [ ] All existing v0.1.0 vaults decrypt without modification
- [ ] Passphrase-only protection mode identical to v0.1.0 experience
- [ ] No performance degradation for non-YubiKey operations
- [ ] Existing UI flows unchanged for passphrase-only users
- [ ] Metadata compatibility maintained
- [ ] Zero regression bugs introduced

**Definition of Ready**:
- Backward compatibility testing plan defined
- Regression test suite prepared
- Performance benchmarks established

**Definition of Done**:
- 100% of v0.1.0 vaults continue working
- No performance regressions measured
- Passphrase-only experience identical to v0.1.0
- Zero backward compatibility bugs reported

### Epic 5: Error Handling and Recovery

#### Story 5.1: As a user, I want clear guidance when my YubiKey isn't available so that I understand my recovery options

**Acceptance Criteria**:
- [ ] "YubiKey not detected" error clearly explains situation
- [ ] Fallback to passphrase offered for hybrid protection users
- [ ] Clear instructions for connecting YubiKey
- [ ] Different messaging for YubiKey-only vs hybrid users
- [ ] Recovery documentation easily accessible
- [ ] Option to retry YubiKey detection

**Definition of Ready**:
- Error message copy approved by UX writing team
- Recovery procedures documented and tested
- Differentiated experiences designed for protection modes

**Definition of Done**:
- Users understand recovery options 90% of the time
- Fallback success rate >95% for hybrid users
- Clear path forward for all error scenarios
- Recovery documentation rated helpful by user testing

#### Story 5.2: As a user, I want helpful guidance when my YubiKey PIN is blocked so that I can regain access

**Acceptance Criteria**:
- [ ] PIN retry counter displayed clearly
- [ ] PUK recovery process explained step-by-step
- [ ] Links to YubiKey reset procedures
- [ ] Option to use passphrase method (hybrid mode only)
- [ ] Warning about PIN lockout consequences
- [ ] Contact support option for complex recovery scenarios

**Definition of Ready**:
- PIN lockout scenarios tested with actual hardware
- PUK recovery procedures validated
- Support escalation process defined

**Definition of Done**:
- Users successfully recover from PIN lockout 80% of time
- Clear understanding of PUK recovery process
- Appropriate escalation to support when needed
- No users permanently locked out of hybrid-protected vaults

### Cross-Cutting Stories

#### Performance Story: As a user, I want YubiKey integration to maintain fast performance so that my workflow isn't disrupted

**Acceptance Criteria**:
- [ ] YubiKey detection completes within 2 seconds
- [ ] PIV operations complete within 5 seconds
- [ ] Multi-recipient encryption impact <15% performance degradation
- [ ] UI remains responsive during hardware operations
- [ ] Setup time maintained under 90 seconds for all protection modes

#### Accessibility Story: As a user with accessibility needs, I want YubiKey features to be fully accessible so that I can use hardware security features

**Acceptance Criteria**:
- [ ] All YubiKey interfaces pass WCAG 2.1 AA compliance
- [ ] Screen reader compatible interface descriptions
- [ ] Keyboard navigation for all YubiKey workflows
- [ ] High contrast mode support for YubiKey status indicators
- [ ] Alternative text for all YubiKey-related icons and graphics

---

**Next Actions**: 
1. Review requirements with UX Designer for interface design implications
2. Coordinate with System Architect for technical feasibility validation
3. Develop user testing plan for protection mode selection workflows
4. Break down user stories into implementable development tasks

**Success Dependencies**: 
- Maintain simplicity while adding capability
- Preserve v0.1.0 user experience integrity
- Deliver genuine security improvement, not feature complexity

---

*This requirements document serves as the authoritative source for YubiKey integration user needs. All technical implementation and design decisions should trace back to these validated user requirements.*