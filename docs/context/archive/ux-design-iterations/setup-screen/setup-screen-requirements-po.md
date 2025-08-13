# Setup Screen Product Requirements

> **Date**: August 2025  
> **Status**: Implementation Requirements  
> **Product Owner**: ZenAI Product SubAgent  
> **Priority**: High - Critical First Impression

## Overview

Transform the Barqly Vault Setup screen from a functional form into a compelling first experience that builds trust, communicates value, and motivates users to complete their security journey. This screen must "make a statement" about the product's professionalism and commitment to protecting Bitcoin family wealth.

## Success Criteria

### Primary Metrics

- **Setup Completion Rate**: Increase from estimated 60-70% to 85%+
- **Time to Completion**: Reduce average setup time to under 90 seconds
- **Trust Score**: Achieve 8+ user confidence rating (survey metric)
- **Error Rate**: Reduce passphrase mismatch errors by 50%

### Qualitative Goals

- Users feel confident about the security of their choice
- Clear understanding of what they're accomplishing
- Emotional connection to protecting family wealth
- Professional appearance that inspires trust

## User Stories

### Story 1: First-Time Bitcoin Family User

**As** a Bitcoin holder concerned about family access to my funds  
**I want** to immediately understand that Barqly Vault is a professional, secure solution  
**So that** I feel confident entrusting it with my family's financial security

**Acceptance Criteria:**

- Security credentials visible within 3 seconds
- Value proposition clearly connects to family protection
- Professional design inspires immediate trust
- Setup process appears simple and achievable

### Story 2: Security-Conscious Professional

**As** a Bitcoin professional evaluating backup solutions  
**I want** to see evidence of security best practices and professional design  
**So that** I can confidently recommend this to clients

**Acceptance Criteria:**

- Technical security indicators present but not overwhelming
- Clean, professional interface suitable for client demos
- Clear indication of encryption standards used
- No amateur or concerning design elements

### Story 3: Anxious New User

**As** someone new to encryption and worried about making mistakes  
**I want** clear guidance and reassurance throughout the setup process  
**So that** I can complete setup without fear of errors

**Acceptance Criteria:**

- Each step clearly explained with context
- Real-time validation prevents errors
- Success feedback provides confidence
- Help readily available without leaving screen

## Detailed Requirements

### 1. Header Transformation

**Current State**: Large title taking ~15% of viewport
**Required State**: Compact, high-value header with trust elements

#### Requirements:

- **Title**: Reduce to medium size (text-xl), left-aligned
- **Tagline**: Add compelling value statement: "Secure Your Bitcoin Legacy"
- **Trust Indicators**:
  - Security badge/icon (e.g., shield with checkmark)
  - "Military-grade age encryption" subtitle
  - Optional: "Trusted by 10,000+ Bitcoin families" (if applicable)
- **Visual Weight**: Maximum 8% of viewport height

#### Implementation Notes:

```
Header Layout:
[Shield Icon] Barqly Vault Setup | Secure Your Bitcoin Legacy
                                  Military-grade encryption for family protection
```

### 2. Progressive Disclosure Design

**Requirement**: Reduce cognitive load while maintaining comprehensive information

#### Three-Stage Approach:

1. **Initial View**: Simplified form with essential fields only
2. **Contextual Help**: Expandable information on-demand
3. **Success View**: Post-generation guidance and next steps

#### Collapsed "What Happens Next?" Section:

- Convert to expandable accordion or side panel
- Trigger: "Learn more about the process" link
- Animation: Smooth expand/collapse
- Default state: Collapsed to save space

### 3. Form Enhancement

#### Visual Hierarchy Improvements:

- **Form Title**: "Create Your Encryption Identity"
- **Section Grouping**: Visual containment for related fields
- **Field Enhancements**:
  - Larger touch targets (48px minimum)
  - Clearer focus states
  - Inline validation messaging

#### Passphrase Section Redesign:

- **Strength Indicator**: Visual password strength meter
- **Requirements Display**: Dynamic checklist
  - Minimum length indicator
  - Character variety suggestions
  - Common password warnings
- **Match Indicator**: Real-time visual confirmation for matching passphrases

### 4. Trust & Security Elements

#### Required Security Indicators:

1. **Encryption Badge**: "age encryption" icon with brief explanation tooltip
2. **Local Storage Indicator**: "Your keys never leave your device"
3. **Open Source Badge**: "Auditable open-source security"

#### Positioning:

- Subtle integration within form area
- Not overwhelming but clearly visible
- Tooltips for additional information

### 5. Emotional Connection Elements

#### Family Protection Messaging:

- **Subtitle Enhancement**: "Protect your family's Bitcoin inheritance"
- **Outcome Preview**: Small icon showing family/inheritance benefit
- **Success Messaging**: "Your family's financial security just got stronger"

#### Visual Elements:

- Warm accent colors for positive actions
- Professional but approachable design
- Icons that convey security + family

### 6. Progress & Feedback Design

#### Setup Progress Indication:

- **Step Counter**: "Step 1 of 3: Create Your Security Identity"
- **Visual Progress**: Subtle progress bar or step indicators
- **Time Estimate**: "Takes about 90 seconds"

#### Generation Feedback:

- **Loading State**: Professional spinner with status messages
- **Success State**:
  - Celebration without being juvenile
  - Clear next action prompt
  - Public key display with copy function

### 7. Call-to-Action Optimization

#### Primary Button Enhancement:

- **Text**: "Create Security Identity" (more meaningful than "Generate Key")
- **Size**: Larger, more prominent (height: 48px minimum)
- **Color**: Strong contrast, confidence-inspiring
- **State Management**: Clear disabled/enabled/loading states

#### Secondary Actions:

- **Help Link**: "Need help choosing a passphrase?"
- **Skip Option**: None - this is critical path
- **Clear Button**: De-emphasized but available

### 8. Mobile Responsiveness

#### Requirements:

- **Breakpoint**: Optimize for 768px and below
- **Layout**: Stack elements vertically on mobile
- **Touch Targets**: Minimum 48x48px
- **Spacing**: Increased padding for touch interfaces
- **Keyboard**: Account for virtual keyboard appearance

### 9. Accessibility Requirements

#### WCAG 2.1 AA Compliance:

- **Color Contrast**: Minimum 4.5:1 for normal text
- **Focus Indicators**: Visible keyboard navigation
- **Screen Reader**: Proper ARIA labels and announcements
- **Error Handling**: Clear error identification and recovery

### 10. Content Requirements

#### Microcopy Specifications:

- **Field Labels**: Clear, jargon-free language
- **Helper Text**: Contextual without being patronizing
- **Error Messages**: Specific, actionable guidance
- **Success Messages**: Celebratory but professional

#### Examples:

- Label helper: "A memorable name for this security identity"
- Passphrase helper: "Choose something memorable but unique to you"
- Error: "Passphrases don't match. Please check and try again."
- Success: "Excellent! Your encryption identity is ready to protect your files."

## Technical Constraints

### Performance Requirements:

- **Initial Render**: < 500ms
- **Interaction Response**: < 100ms
- **Key Generation**: < 3 seconds with progress indication

### Security Requirements:

- **No Network Calls**: All operations local
- **Memory Management**: Clear sensitive data after use
- **Input Validation**: Client-side with security considerations

## Implementation Priority

### Phase 1 (MVP):

1. Header optimization with trust elements
2. Form visual hierarchy improvements
3. Enhanced CTA and messaging
4. Basic progress indication

### Phase 2 (Enhancement):

1. Advanced passphrase UX features
2. Collapsible help sections
3. Enhanced security indicators
4. Refined animations and transitions

### Phase 3 (Polish):

1. A/B testing variations
2. Advanced accessibility features
3. Localization support
4. Performance optimizations

## Success Measurement

### Quantitative Metrics:

- Setup completion rate
- Time to completion
- Error rates by type
- Drop-off points analysis

### Qualitative Metrics:

- User confidence surveys
- Professional credibility assessment
- Emotional connection measurement
- Recommendation likelihood (NPS)

## Conclusion

The enhanced Setup screen must transform from a functional form into a confidence-inspiring first experience that positions Barqly Vault as the professional choice for Bitcoin family security. Every element should contribute to building trust, communicating value, and motivating completion of this critical first step.

---

_Related Documents:_

- [Setup Screen Evaluation](../analysis/setup-screen-evaluation.md)
- [Visual Design Specifications](../visual-design/setup-screen-specs.md) (to be created)
- [User Testing Protocol](../testing/setup-screen-testing.md) (to be created)
