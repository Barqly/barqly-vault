# Setup Screen Design Specification

> **Version**: 1.0  
> **Status**: Implementation Ready  
> **Designer**: UX Designer, ZenAI Team  
> **Last Updated**: August 2025

## Executive Summary

This design specification transforms the Barqly Vault Setup screen from a functional form into a trust-inspiring, professionally-designed first experience that positions Barqly Vault as the premier choice for Bitcoin family wealth protection. Every pixel is optimized for building confidence, communicating security, and motivating users to complete their encryption identity creation.

## Design Principles

### 1. **Trust Through Design**

Every visual element reinforces security, professionalism, and reliability through considered use of icons, typography, and spatial relationships.

### 2. **Progressive Disclosure**

Information is revealed at the right moment, reducing cognitive load while maintaining comprehensive guidance for those who need it.

### 3. **Emotional Connection**

Design elements connect the technical process of key generation to the emotional outcome of protecting family wealth.

### 4. **Accessibility First**

All design decisions prioritize inclusive access, ensuring the interface works for users with diverse abilities and contexts.

## Visual Design System

### Color Palette

```css
/* Primary Colors */
--primary-blue: #2563eb; /* Trust, security */
--primary-blue-hover: #1d4ed8;
--primary-green: #059669; /* Success, positive actions */
--primary-orange: #f59e0b; /* Bitcoin accent */

/* Neutral Colors */
--gray-900: #111827; /* Primary text */
--gray-700: #374151; /* Secondary text */
--gray-500: #6b7280; /* Helper text */
--gray-100: #f3f4f6; /* Backgrounds */

/* Semantic Colors */
--success-green: #10b981;
--error-red: #ef4444;
--warning-amber: #f59e0b;
--info-blue: #3b82f6;

/* Trust Indicators */
--shield-blue: #2563eb;
--lock-gray: #6b7280;
```

### Typography Scale

```css
/* Headings */
--heading-xl: 1.875rem; /* 30px - Page titles */
--heading-lg: 1.5rem; /* 24px - Section titles */
--heading-md: 1.25rem; /* 20px - Card titles */
--heading-sm: 1.125rem; /* 18px - Subsections */

/* Body Text */
--text-base: 1rem; /* 16px - Body text */
--text-sm: 0.875rem; /* 14px - Helper text */
--text-xs: 0.75rem; /* 12px - Captions */

/* Font Weights */
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing System

```css
/* Spacing Scale (rem) */
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-12: 3rem; /* 48px */
```

## Component Specifications

### 1. Enhanced Header Section

**Purpose**: Immediately establish trust and communicate value proposition

```
┌─────────────────────────────────────────────────────────────┐
│  🛡️  Secure Your Bitcoin Legacy                             │
│      Create your encryption identity with military-grade     │
│      age encryption                                          │
└─────────────────────────────────────────────────────────────┘
```

**Specifications**:

- Height: 80px (max)
- Background: White with subtle bottom border (#E5E7EB)
- Icon: Shield (24x24px, #2563EB)
- Title: 20px, font-bold, #111827
- Subtitle: 14px, font-regular, #6B7280
- Alignment: Left-aligned with 24px padding

### 2. Trust Indicator Bar

**Purpose**: Build immediate confidence through security signals

```
┌─────────────────────────────────────────────────────────────┐
│  🔒 Your keys never leave your device  |  📖 Open-source   │
│                                         |     audited       │
└─────────────────────────────────────────────────────────────┘
```

**Specifications**:

- Position: Below header, above main form
- Height: 48px
- Background: #F9FAFB with 1px border
- Icons: 16x16px, #6B7280
- Text: 12px, #6B7280
- Separator: 1px vertical line, #E5E7EB

### 3. Main Form Container

**Purpose**: Guide users through encryption identity creation

```
┌─────────────────────────────────────────────────────────────┐
│  Create Your Encryption Identity                            │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Key Label *                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ My Bitcoin Vault                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│  A memorable name for this security identity                │
│                                                             │
│  Passphrase *                                 [Show/Hide]   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Strength: ████████░░ Strong                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  Use a phrase only you know, like a favorite quote         │
│                                                             │
│  Confirm Passphrase *                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••                    ✓ Match      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌────────────────────────────────────┐  │
│  │    Clear     │  │   Create Security Identity   →     │  │
│  └──────────────┘  └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Specifications**:

#### Form Container

- Background: White
- Border: 1px solid #E5E7EB
- Border-radius: 8px
- Padding: 32px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)

#### Form Title

- Font: 18px, font-semibold, #111827
- Margin-bottom: 24px
- Border-bottom: 1px solid #E5E7EB
- Padding-bottom: 16px

#### Input Fields

- Height: 48px
- Border: 1px solid #D1D5DB
- Border-radius: 6px
- Padding: 12px 16px
- Font: 16px, #111827
- Focus: 2px ring, #2563EB
- Background: White

#### Labels

- Font: 14px, font-medium, #374151
- Margin-bottom: 6px
- Required asterisk: #EF4444

#### Helper Text

- Font: 12px, #6B7280
- Margin-top: 4px

#### Passphrase Strength Indicator

- Height: 32px
- Background: #F3F4F6
- Border-radius: 4px
- Progress bar: Dynamic color (red → amber → green)
- Text: 12px, font-medium

#### Buttons

- Primary (Create Security Identity):
  - Height: 48px
  - Background: #2563EB
  - Text: 16px, font-medium, white
  - Border-radius: 6px
  - Hover: #1D4ED8
  - Icon: Arrow right (20px)
  - Min-width: 240px

- Secondary (Clear):
  - Height: 48px
  - Background: White
  - Border: 1px solid #D1D5DB
  - Text: 14px, font-medium, #374151
  - Border-radius: 6px
  - Min-width: 100px

### 4. Collapsible Help Section

**Purpose**: Provide additional context without cluttering interface

```
┌─────────────────────────────────────────────────────────────┐
│  ℹ️ Learn what happens next  ⌄                              │
└─────────────────────────────────────────────────────────────┘

When expanded:
┌─────────────────────────────────────────────────────────────┐
│  ℹ️ Learn what happens next  ⌃                              │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  1️⃣ Key Generation         2️⃣ File Encryption    3️⃣ Secure │
│     Your encryption            Use your key to         Store │
│     keypair is created         encrypt important       files │
│     and securely stored        files and backups       safe  │
└─────────────────────────────────────────────────────────────┘
```

**Specifications**:

- Collapsed height: 40px
- Expanded: Auto-height with smooth animation
- Background: #EFF6FF (blue-50)
- Border: 1px solid #BFDBFE
- Text: 14px, #1E40AF
- Animation: 300ms ease-out

### 5. Progress Context Bar

**Purpose**: Set time expectations and reduce abandonment

```
┌─────────────────────────────────────────────────────────────┐
│  Quick Setup • Takes about 90 seconds                       │
└─────────────────────────────────────────────────────────────┘
```

**Specifications**:

- Position: Above form container
- Height: 32px
- Text: 14px, #6B7280
- Icon: Clock (16px)
- Alignment: Center

## Interaction States

### Input Field States

1. **Default**
   - Border: #D1D5DB
   - Background: White
2. **Hover**
   - Border: #9CA3AF
   - Cursor: Text
3. **Focus**
   - Border: #2563EB
   - Ring: 2px, #DBEAFE
4. **Error**
   - Border: #EF4444
   - Background: #FEF2F2
5. **Success**
   - Border: #10B981
   - Icon: Checkmark (green)

### Button States

1. **Default**
   - As specified above
2. **Hover**
   - Transform: translateY(-1px)
   - Shadow: 0 4px 6px rgba(0,0,0,0.1)
3. **Active**
   - Transform: translateY(0)
   - Shadow: inset 0 2px 4px rgba(0,0,0,0.1)
4. **Disabled**
   - Opacity: 0.5
   - Cursor: not-allowed
5. **Loading**
   - Show spinner
   - Text: "Creating..."

## Animation Specifications

### Transitions

- All interactive elements: 200ms ease-out
- Collapsible sections: 300ms ease-out
- Progress bars: 500ms ease-in-out
- Success states: 400ms spring

### Micro-interactions

1. **Button hover**: Subtle lift with shadow
2. **Input focus**: Smooth ring expansion
3. **Checkbox toggle**: Smooth slide
4. **Progress update**: Smooth fill

## Responsive Behavior

### Breakpoints

- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: < 768px

### Mobile Adaptations

1. **Header**: Stack icon and text vertically
2. **Trust indicators**: Single column
3. **Form**: Full width with 16px padding
4. **Buttons**: Stack vertically, full width
5. **Font sizes**: Increase by 1px for better readability

## Accessibility Requirements

### WCAG 2.2 AA Compliance

1. **Color Contrast**
   - Normal text: 4.5:1 minimum
   - Large text: 3:1 minimum
   - Interactive elements: 3:1 minimum

2. **Focus Management**
   - Visible focus indicators
   - Logical tab order
   - Skip links where appropriate

3. **Screen Reader Support**
   - Proper ARIA labels
   - Live regions for dynamic content
   - Error announcements

4. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - No keyboard traps
   - Escape key closes modals/dropdowns

## Success Metrics

### Quantitative

- Setup completion rate: 85%+
- Average time to complete: < 90 seconds
- Error rate: < 10%
- Mobile completion rate: 80%+

### Qualitative

- Trust perception: 8+/10
- Ease of use: 9+/10
- Professional appearance: 9+/10
- Would recommend: 85%+

## Implementation Notes

### Required Assets

1. Shield icon (SVG, 24x24)
2. Lock icon (SVG, 16x16)
3. Info icon (SVG, 16x16)
4. Check icon (SVG, 16x16)
5. Arrow right icon (SVG, 20x20)
6. Chevron up/down icons (SVG, 16x16)

### Technical Considerations

1. Use CSS custom properties for theming
2. Implement smooth animations with will-change
3. Lazy load help content
4. Debounce strength calculation
5. Use semantic HTML throughout

---

_This specification provides the complete design direction for implementing the enhanced Setup screen. See accompanying wireframes and component library for visual references._
