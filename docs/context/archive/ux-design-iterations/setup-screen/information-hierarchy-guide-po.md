# Information Hierarchy Strategy Guide

> **Purpose**: Define principles for optimizing screen real estate and information priority across Barqly Vault  
> **Product Owner**: ZenAI Product SubAgent  
> **Application**: All screens, with Setup screen as primary example

## Core Principles

### 1. Value-First Design

**Principle**: Every pixel should earn its place by delivering user or business value

**Application**:

- Headlines must do more than label – they should communicate value
- Decorative elements must also serve functional purposes
- White space is valuable only when it improves comprehension

**Anti-patterns**:

- Large titles that merely state the obvious
- Excessive spacing that pushes critical content below fold
- Decorative elements that distract from primary actions

### 2. Progressive Disclosure

**Principle**: Show only what's needed when it's needed

**Implementation Strategy**:

```
Primary View (Immediate):
└── Essential actions and information
    └── Secondary Information (On demand):
        └── Detailed explanations
        └── Advanced options
        └── Help content
```

**Benefits**:

- Reduces cognitive load
- Speeds up common tasks
- Accommodates both novice and expert users

### 3. Trust Through Design

**Principle**: Security products must inspire confidence through every design decision

**Trust Signals Hierarchy**:

1. **Immediate** (0-3 seconds): Visual security indicators, professional design
2. **Quick Scan** (3-10 seconds): Credibility markers, clear value proposition
3. **Exploration** (10+ seconds): Detailed security information, social proof

### 4. Emotional Connection

**Principle**: Connect features to user outcomes and emotions

**Transformation Examples**:

- "Generate Key" → "Create Security Identity"
- "Encrypt Files" → "Protect Family Assets"
- "Setup Complete" → "Your Bitcoin Legacy is Secured"

## Screen Real Estate Optimization

### Above-the-Fold Priority Matrix

```
┌─────────────────────────────────────┐
│ HIGH VALUE + HIGH FREQUENCY         │ ← Priority 1
│ (Primary actions, trust signals)    │
├─────────────────────────────────────┤
│ HIGH VALUE + LOW FREQUENCY          │ ← Priority 2
│ (Important but occasional actions)  │
├─────────────────────────────────────┤
│ LOW VALUE + HIGH FREQUENCY          │ ← Priority 3
│ (Navigation, common tools)          │
├─────────────────────────────────────┤
│ LOW VALUE + LOW FREQUENCY           │ ← Consider removing
│ (Rarely used options, verbose text) │
└─────────────────────────────────────┘
```

### Space Allocation Guidelines

**Optimal Viewport Usage**:

- **Header/Trust Zone**: 5-8% (condensed, high-impact)
- **Primary Action Area**: 60-70% (main form/content)
- **Supporting Information**: 15-20% (contextual help)
- **Navigation/Secondary**: 5-10% (persistent but minimal)

### Content Density Optimization

**High-Density Zones** (pack information efficiently):

- Navigation areas
- Status indicators
- Metadata displays

**Breathing Room Zones** (generous spacing):

- Primary action buttons
- Critical input fields
- Success/error messages

## Setup Screen Case Study

### Current State Problems:

1. **Oversized Header** (15% of viewport)
   - Low information density
   - Pushes valuable content down
   - Creates false perception of simplicity

2. **"What Happens Next?" Positioning**
   - Competes with primary action
   - Always visible despite occasional relevance
   - Takes 25% of viewport

### Optimized Approach:

1. **Condensed Trust Header** (8% of viewport)
   - Combines title + security indicators
   - Immediate value communication
   - Professional credibility markers

2. **Collapsible Secondary Info**
   - Available on-demand
   - Doesn't compete with primary flow
   - Preserves screen space for action

## Implementation Patterns

### Pattern 1: Trust-Building Headers

```
[Security Icon] Product Name | Value Proposition
                              Credibility Statement
```

**Benefits**:

- Immediate trust establishment
- Efficient space usage
- Clear value communication

### Pattern 2: Contextual Progressive Disclosure

```
Primary Content
└── [?] Learn more (collapsed by default)
    └── Detailed explanation (expands inline)
```

**Benefits**:

- Reduces initial complexity
- Provides depth when needed
- Preserves screen real estate

### Pattern 3: Outcome-Focused CTAs

```
Instead of: [Generate Key]
Use: [Secure My Bitcoin Legacy →]
```

**Benefits**:

- Emotional connection
- Clear outcome communication
- Increased motivation to act

## Measurement Framework

### Efficiency Metrics:

- **Information Density Score**: Value delivered per viewport percentage
- **Time to Primary Action**: How quickly users can complete main task
- **Scroll Depth**: Percentage requiring scroll for primary actions

### Effectiveness Metrics:

- **Comprehension Rate**: Users understanding purpose within 10 seconds
- **Trust Score**: Confidence rating in first impression
- **Completion Rate**: Successful task completion percentage

### Emotional Metrics:

- **Connection Score**: Resonance with personal goals
- **Motivation Index**: Desire to continue/recommend
- **Anxiety Reduction**: Comfort level with security tasks

## Common Pitfalls to Avoid

### 1. Title Inflation

**Problem**: Large headings that state the obvious
**Solution**: Combine titles with value propositions

### 2. Information Burial

**Problem**: Critical details below the fold
**Solution**: Prioritize by user need, not organizational hierarchy

### 3. Choice Paralysis

**Problem**: Too many options presented simultaneously
**Solution**: Progressive disclosure with clear primary path

### 4. Generic Messaging

**Problem**: Technical labels without emotional connection
**Solution**: Translate features into user outcomes

### 5. Trust Assumption

**Problem**: Assuming users trust by default
**Solution**: Actively build trust through design signals

## Application Guidelines

### When Designing New Screens:

1. **Start with user outcome** – what success looks like
2. **Map information priority** – what users need when
3. **Allocate space by value** – not by convention
4. **Test cognitive load** – ensure clarity at each stage
5. **Validate emotional response** – ensure positive connection

### When Optimizing Existing Screens:

1. **Audit current space usage** – identify low-value areas
2. **Restructure by priority** – move high-value content up
3. **Implement progressive disclosure** – hide secondary info
4. **Enhance trust signals** – add credibility markers
5. **Strengthen emotional connection** – revise copy for outcomes

## Conclusion

Effective information hierarchy is about making every element earn its place through delivered value. By optimizing screen real estate, building trust through design, and connecting emotionally with user goals, Barqly Vault can transform from functional tool to trusted family security solution.

The Setup screen improvements demonstrate these principles in action – reducing low-value header space, elevating trust signals, and creating emotional connections while preserving functional clarity.

---

_Related Documents:_

- [Setup Screen Requirements](../requirements/setup-screen-requirements.md)
- [Visual Design System](../visual-design/design-system.md) (to be created)
- [Content Strategy Guide](../content/messaging-guide.md) (to be created)
