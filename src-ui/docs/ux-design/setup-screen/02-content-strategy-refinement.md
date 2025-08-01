# Setup Screen Content Strategy Refinement

## Executive Summary

This document outlines the content consolidation strategy to eliminate redundancy and create a focused, conversion-optimized message hierarchy that guides users to complete form submission.

## Current Content Redundancy Analysis

### Duplicate Trust Messages (Current State)

1. **Header**: "Create your encryption identity with military-grade age encryption"
2. **Trust Indicators**: "Your keys never leave your device" + "Open-source audited"
3. **Form Section**: "Set up your secure identity with a memorable label and strong passphrase"
4. **Help Section**: Repeats security benefits and local storage messaging

**Result**: User reads about security 4+ times before reaching form fields

## Optimized Content Strategy

### Message Hierarchy Principle

```
Primary (Visible): ACTION-ORIENTED
Secondary (On-demand): TRUST-BUILDING
Tertiary (Progressive): EDUCATIONAL
```

### Consolidated Copy Architecture

#### 1. Header (Minimal, Brand-focused)

**Current**:

- Title: "Secure Your Bitcoin Legacy"
- Subtitle: "Create your encryption identity with military-grade age encryption"

**Optimized**:

- Single line: "Barqly Vault | Bitcoin Legacy Protection"
- **Rationale**: Brand recognition + purpose, no redundant security claims

#### 2. Form Title (Action-focused)

**Current**: "Create Your Encryption Identity"

**Optimized**: "Create Your Security Identity"

- **Rationale**: Simpler language, same meaning, saves space

#### 3. Trust Indicators (Contextual badges)

**Current**: Full sentence blocks taking 80px

**Optimized**: Inline badges with hover details

```
[🔒 Local-only] [📖 Open source]

Hover states:
🔒 "Your private keys never leave this device"
📖 "Audited open-source code you can verify"
```

#### 4. Form Field Microcopy

**Key Label Field**

- Label: "Identity Name"
- Placeholder: "e.g., My Bitcoin Vault"
- Helper: "Choose a memorable name" (on focus only)

**Passphrase Field**

- Label: "Master Passphrase"
- Placeholder: "Enter a strong passphrase"
- Helper: Progressive disclosure of requirements

**Confirm Field**

- Label: "Confirm Passphrase"
- Placeholder: "Re-enter to confirm"
- Helper: Real-time match validation

#### 5. Progressive Help Content

**Trigger Text Evolution**:

- Default: "How does this work?" (7 words → 4 words)
- After 10s: Add subtle pulse animation
- Post-error: "Need help?" with contextual guidance

**Expanded Content Structure**:

```markdown
### Your Bitcoin Legacy in 3 Steps

1. **Now**: Create your identity
   Your keys are generated and encrypted on this device

2. **Next**: Encrypt your files
   Protect wallet backups and recovery information

3. **Forever**: Share with loved ones
   They can decrypt your files when needed

🔒 Security: Age encryption + your passphrase
📍 Storage: Keys saved to [show actual path]
```

## Content Tone Guidelines

### Voice Characteristics

- **Confident**: Assume user capability
- **Concise**: Every word earns its space
- **Clear**: Technical accuracy in simple terms

### Progressive Information Disclosure

#### Level 1: Immediate (Form Labels)

- Action words only
- No security messaging
- Clear expectations

#### Level 2: Contextual (Hover/Focus)

- Brief clarifications
- Security assurances
- Format examples

#### Level 3: Educational (Help Section)

- Full explanations
- Technical details
- Use case scenarios

## Copy Variations by User State

### First-Time User

- Emphasis on simplicity
- "Get started in under 2 minutes"
- Minimal technical language

### Returning User (No Keys)

- "Welcome back"
- Quick-start positioning
- Skip educational content

### Error States

- Specific, actionable guidance
- No blame language
- Clear next steps

## A/B Testing Variations

### Version A: Trust-First

- Lead with security badges
- "Bank-grade encryption" messaging
- Technical credibility

### Version B: Speed-First

- "2-minute setup" promise
- Minimal messaging
- Action-oriented

### Version C: Benefit-First

- "Protect your Bitcoin legacy"
- Family-focused messaging
- Outcome-oriented

## Content Metrics

### Engagement Tracking

- Time to first field interaction
- Help section expansion rate
- Hover interaction on badges
- Form abandonment points

### Success Indicators

- <5 seconds to start typing
- <10% help section opens (indicates clarity)
- > 90% form completion rate
- <3% error rate on submission

## Implementation Guidelines

### Phase 1: Copy Consolidation

1. Remove redundant security messaging
2. Implement single-line header
3. Convert trust indicators to badges

### Phase 2: Progressive Disclosure

1. Add hover states to badges
2. Implement contextual field helpers
3. Create collapsible help with animation

### Phase 3: Personalization

1. Detect returning users
2. Adjust messaging based on state
3. Remember preferences

## Copy Matrix

| Component    | Current Length | Optimized Length  | Reduction |
| ------------ | -------------- | ----------------- | --------- |
| Header       | 52 chars       | 35 chars          | 33%       |
| Trust Block  | 124 chars      | 28 chars (badges) | 77%       |
| Form Title   | 48 chars       | 34 chars          | 29%       |
| Help Trigger | 34 chars       | 19 chars          | 44%       |
| **Total**    | **258 chars**  | **116 chars**     | **55%**   |

## Accessibility Considerations

### Screen Reader Optimizations

- Badges have full aria-labels
- Progressive content marked with live regions
- Clear heading hierarchy maintained

### Cognitive Load Reduction

- One concept per field
- Consistent terminology
- No jargon without context

### International Considerations

- 30% text expansion buffer
- Cultural neutrality in examples
- Icon usage for universal understanding
