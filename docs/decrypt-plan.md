# Decrypt Screen UI Polish Plan

## Overview

This document outlines the plan to apply the same styling improvements from the Encrypt screen to the Decrypt screen. The goal is to achieve visual consistency and design cohesion across both workflows.

## Analysis of Current State

### Encrypt Screen Improvements Applied (Reference)

1. **UniversalHeader Integration**:  Already implemented on Decrypt screen
   - Unified header with "Decrypt Your Vault" title and Unlock icon
   - Professional trust badges (Strong Encryption, Local-Only Storage, No Network Access)

2. **Button Standardization**: Applied `h-10 rounded-xl` dimensions
   - Previous buttons: `border border-slate-300 bg-white px-4 text-slate-700`
   - Continue/Action buttons: `bg-blue-600 text-white hover:bg-blue-700`

3. **Card Styling Patterns**:
   - Clean white cards: `bg-white rounded-lg border border-slate-200 shadow-sm`
   - Action-ready cards: Add `border-l-green-500 rounded-l-lg` for green accent
   - Success cards: Clean white without green accent

4. **Typography and Spacing**: Consistent font sizes, weights, and spacing

### Decrypt Screen Current State Analysis

####  Already Consistent
- **DecryptPage.tsx**: Already uses UniversalHeader correctly
- **Overall Structure**: Similar progressive card system

#### L Needs Updates

1. **ProgressiveDecryptionCards.tsx** (Lines 148-181)
   - **Current**: `rounded-2xl` instead of `rounded-lg`
   - **Current**: Button styling inconsistent with Encrypt screen
   - **Current**: Different padding and border styles

2. **DecryptionReadyPanel.tsx** (Lines 49-124)
   - **Current**: Green background `bg-green-50 border border-green-200` 
   - **Should be**: White card with green left border accent (like EncryptionReadyPanel)
   - **Current**: Inconsistent button styling
   - **Current**: Different card structure

3. **DecryptSuccess.tsx** (Lines 48-177)
   - **Current**: Green background `bg-green-50 border border-green-200`
   - **Should be**: Clean white card (like EncryptionSuccess)
   - **Current**: Different header styling and layout

## Implementation Plan

### Phase 1: ProgressiveDecryptionCards Updates ✅
- [x] Update card border radius from `rounded-2xl` to `rounded-lg`
- [x] Standardize button styling to match EncryptionCards
- [x] Ensure consistent shadow and border styling

### Phase 2: DecryptionReadyPanel Updates ✅
- [x] Replace green background with white card + green left border accent
- [x] Update header styling to match EncryptionReadyPanel
- [x] Standardize button dimensions and styling
- [x] Align layout structure with encryption version

### Phase 3: DecryptSuccess Updates ✅
- [x] Replace green background with clean white card
- [x] Update header layout to match EncryptionSuccess  
- [x] Ensure consistent typography and spacing
- [x] Standardize action button styling

### Phase 4: Final Consistency Pass ✅
- [x] Review all button dimensions are `h-10 rounded-xl`
- [x] Ensure consistent spacing and typography
- [x] Validate visual hierarchy matches Encrypt screen
- [x] Test responsive behavior

## Key Style Patterns to Apply

### Card Base Styles
```css
/* Standard workflow card */
bg-white rounded-lg border border-slate-200 shadow-sm

/* Action-ready card (ready panels) */
bg-white rounded-lg border border-slate-200 shadow-sm border-l-green-500 rounded-l-lg
```

### Button Styles
```css
/* Previous/Secondary buttons */
h-10 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500

/* Continue/Primary buttons */  
h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-600 text-white hover:bg-blue-700
```

### Visual Hierarchy
- **Workflow cards**: Clean white for information/selection steps
- **Ready cards**: White with green left accent for action-ready state  
- **Success cards**: Clean white for completion state

## Files to Modify

1. `/src/components/decrypt/ProgressiveDecryptionCards.tsx`
2. `/src/components/decrypt/DecryptionReadyPanel.tsx` 
3. `/src/components/decrypt/DecryptSuccess.tsx`

## Success Criteria ✅

- [x] Visual consistency with Encrypt screen styling
- [x] All buttons follow standardized dimensions and styling
- [x] Consistent card design patterns applied
- [x] Clean visual hierarchy maintained
- [x] No regressions in functionality
- [x] Responsive design preserved

## Changes Applied

### Components Updated:
1. **ProgressiveDecryptionCards.tsx** - Updated card styling and button consistency
2. **DecryptionReadyPanel.tsx** - Applied white card with green accent pattern
3. **DecryptSuccess.tsx** - Clean white card styling matching Encrypt screen
4. **DestinationSelector.tsx** - Standardized browse button styling  
5. **DecryptProgress.tsx** - Updated cancel button styling

### Key Styling Updates:
- Card borders: `rounded-2xl` → `rounded-lg` for consistency
- Button dimensions: All buttons now use `h-10 rounded-xl` pattern
- Ready panels: Green background → white card with green left border accent
- Success cards: Green background → clean white card
- Typography: Consistent slate color scheme across all components

## Notes

- DecryptPage.tsx already has UniversalHeader implemented correctly
- Focus on component-level styling consistency
- Preserve all existing functionality while updating visual design
- Follow the same design patterns established in Encrypt screen improvements