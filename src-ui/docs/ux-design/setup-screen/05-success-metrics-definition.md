# Setup Screen Success Metrics Definition

## Executive Summary

This document defines measurable success criteria for the Setup screen optimization, establishing baseline metrics and target improvements to validate the effectiveness of our UX enhancements.

## Primary Success Metrics

### 1. Form Visibility Percentage

**Definition**: Percentage of form fields visible without scrolling on initial page load

#### Measurement Method

```typescript
const measureFormVisibility = () => {
  const viewport = window.innerHeight;
  const formTop = document.querySelector('#key-label')?.getBoundingClientRect().top || 0;
  const submitButton = document.querySelector('[data-testid="submit-button"]');
  const formBottom = submitButton?.getBoundingClientRect().bottom || 0;

  const formHeight = formBottom - formTop;
  const visibleHeight = Math.min(formBottom, viewport) - Math.max(formTop, 0);

  return (visibleHeight / formHeight) * 100;
};
```

#### Success Criteria

- **Baseline**: 40-50% (current state)
- **Target**: ≥85% across all devices
- **Stretch Goal**: 100% on desktop, ≥90% on mobile

### 2. Time to First Input (TTFI)

**Definition**: Time from page load to user's first keystroke in any form field

#### Measurement Method

```typescript
// Track via analytics
const startTime = performance.now();

document.getElementById('key-label')?.addEventListener(
  'input',
  () => {
    const ttfi = performance.now() - startTime;
    analytics.track('setup_ttfi', { time_ms: ttfi });
  },
  { once: true },
);
```

#### Success Criteria

- **Baseline**: 8-12 seconds
- **Target**: <5 seconds
- **Stretch Goal**: <3 seconds

### 3. Form Completion Rate

**Definition**: Percentage of users who successfully complete key generation after starting

#### Measurement Formula

```
Completion Rate = (Successful Key Generations / Form Starts) × 100
```

#### Success Criteria

- **Baseline**: 65-70%
- **Target**: ≥85%
- **Stretch Goal**: ≥90%

### 4. Scroll Actions Before Submission

**Definition**: Number of scroll events before form submission

#### Measurement Method

```typescript
let scrollCount = 0;
let formSubmitted = false;

window.addEventListener('scroll', () => {
  if (!formSubmitted) scrollCount++;
});

// On form submission
formSubmitted = true;
analytics.track('setup_scroll_count', { count: scrollCount });
```

#### Success Criteria

- **Baseline**: 3-5 scroll actions
- **Target**: 0 scroll actions
- **Mobile Target**: ≤1 scroll action

## Secondary Success Metrics

### 5. Trust Indicator Engagement

**Definition**: Percentage of users who interact with trust badges (hover/tap)

#### Tracking Implementation

```typescript
const trackTrustEngagement = () => {
  let engaged = false;

  document.querySelectorAll('[data-trust-badge]').forEach((badge) => {
    badge.addEventListener('mouseenter', () => {
      if (!engaged) {
        engaged = true;
        analytics.track('trust_badge_engaged');
      }
    });
  });
};
```

#### Success Criteria

- **Target**: 30-40% engagement rate
- **Quality Signal**: 5-10 second average hover time

### 6. Help Section Expansion Rate

**Definition**: Percentage of users who expand the collapsible help section

#### Success Criteria

- **Target**: 15-25% (indicates curiosity without confusion)
- **Warning Signal**: >40% (suggests core UI lacks clarity)
- **Quality Signal**: <10% (suggests excellent primary UX)

### 7. Error Recovery Success

**Definition**: Percentage of users who successfully submit after encountering an error

#### Measurement Points

- Passphrase mismatch recovery
- Validation error recovery
- Network/system error recovery

#### Success Criteria

- **Baseline**: 45% recovery
- **Target**: ≥70% recovery
- **Stretch Goal**: ≥80% recovery

## User Experience Quality Metrics

### 8. Perceived Performance Score

**Definition**: User-reported speed perception (1-5 scale)

#### Survey Question

"How would you rate the speed of setting up your security identity?"

1. Very Slow
2. Slow
3. Acceptable
4. Fast
5. Very Fast

#### Success Criteria

- **Target Average**: ≥4.2/5
- **Target Distribution**: >70% rate 4 or 5

### 9. Cognitive Load Assessment

**Definition**: Task difficulty rating via System Usability Scale (SUS) subset

#### Key Questions

1. "I found the setup process unnecessarily complex" (reverse scored)
2. "I felt confident completing the setup"
3. "I needed to learn a lot before I could complete setup" (reverse scored)

#### Success Criteria

- **Target SUS Score**: ≥80/100
- **Complexity Score**: ≤2/5
- **Confidence Score**: ≥4/5

### 10. Accessibility Compliance Score

**Definition**: WCAG 2.2 AA compliance percentage

#### Measurement Areas

- Color contrast ratios
- Keyboard navigation completeness
- Screen reader compatibility
- Focus indicator visibility

#### Success Criteria

- **Target**: 100% WCAG 2.2 AA compliance
- **Automated Testing**: 0 critical issues
- **Manual Testing**: Full task completion with screen reader

## Business Impact Metrics

### 11. Support Ticket Reduction

**Definition**: Decrease in setup-related support requests

#### Measurement Period

- Baseline: 30 days pre-optimization
- Comparison: 30 days post-optimization

#### Success Criteria

- **Target**: 50% reduction in setup-related tickets
- **Specific Areas**:
  - "How do I create a key?" (-75%)
  - "What is a passphrase?" (-60%)
  - "Screen is confusing" (-80%)

### 12. User Activation Rate

**Definition**: Users who complete setup AND perform first encryption

#### Measurement Formula

```
Activation Rate = (Users who encrypt within 7 days / Total signups) × 100
```

#### Success Criteria

- **Baseline**: 55%
- **Target**: ≥75%
- **Stretch Goal**: ≥85%

## Implementation Tracking

### Analytics Events Structure

```typescript
interface SetupMetrics {
  // Page Load
  setup_page_loaded: {
    viewport_height: number;
    device_type: 'mobile' | 'tablet' | 'desktop';
  };

  // Visibility
  form_visibility_measured: {
    percentage_visible: number;
    requires_scroll: boolean;
  };

  // Interaction
  first_input_focused: {
    time_to_focus_ms: number;
    field_name: string;
  };

  // Trust Engagement
  trust_indicator_interacted: {
    indicator_type: 'local' | 'open_source';
    interaction_type: 'hover' | 'click';
    duration_ms?: number;
  };

  // Completion
  setup_completed: {
    total_time_ms: number;
    scroll_count: number;
    error_count: number;
    help_opened: boolean;
  };
}
```

### A/B Testing Framework

```typescript
interface ExperimentVariants {
  control: 'current_layout';
  variant_a: 'optimized_85_percent';
  variant_b: 'minimal_100_percent';
}

// Track variant performance
analytics.track('experiment_assignment', {
  experiment: 'setup_screen_optimization',
  variant: getUserVariant(),
  timestamp: Date.now(),
});
```

## Monitoring Dashboard

### Real-Time Metrics

- Current form visibility average
- Live completion rate
- Active user count
- Error rate trending

### Daily Reports

- TTFI distribution histogram
- Completion funnel analysis
- Error recovery patterns
- Device-specific performance

### Weekly Analysis

- Trust engagement trends
- Help section usage patterns
- Support ticket correlation
- User feedback themes

## Success Validation Timeline

### Week 1: Baseline Establishment

- Implement tracking for all metrics
- Gather current state data
- Identify problem patterns

### Week 2-3: Progressive Rollout

- 10% traffic to optimized version
- Monitor key metrics
- Gather qualitative feedback

### Week 4: Full Rollout Decision

- Statistical significance achieved
- All primary metrics improved
- No regression in secondary metrics

### Month 2: Long-term Impact

- Sustained improvement verification
- Business impact measurement
- Iteration planning based on data

## Alert Thresholds

### Critical Alerts

- Form visibility <60% (regression)
- Completion rate <50% (major issue)
- TTFI >10 seconds (performance problem)
- Error rate >20% (validation issues)

### Warning Alerts

- Trust engagement <20% (possible confusion)
- Help expansion >40% (clarity issues)
- Scroll count >2 average (layout problem)
- Support tickets increasing (user struggle)

## Reporting Template

### Weekly UX Report

```markdown
# Setup Screen Optimization Report - Week [X]

## Primary Metrics

- Form Visibility: XX% (↑X% from baseline)
- Time to First Input: X.Xs (↓X% from baseline)
- Completion Rate: XX% (↑X% from baseline)
- Zero-Scroll Users: XX% (↑X% from baseline)

## User Experience

- Trust Badge Engagement: XX%
- Help Section Opens: XX%
- Error Recovery Rate: XX%

## Business Impact

- Support Tickets: ↓XX%
- User Activation: ↑XX%
- Time to Value: ↓XX%

## Action Items

1. [Optimization based on data]
2. [User feedback incorporation]
3. [Next iteration planning]
```
