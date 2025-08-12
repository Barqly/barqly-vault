/**
 * Viewport utilities for responsive component sizing
 * Used primarily for success panels to prevent scrolling
 */

import React from 'react';

export interface ViewportConstraints {
  minHeight: number;
  maxHeight: number;
  optimalHeight: number;
  headerHeight: number;
  footerHeight: number;
}

/**
 * Calculate optimal heights for success panels based on viewport
 * Ensures 100% above-fold visibility while maintaining usability
 */
export function calculateSuccessPanelConstraints(): ViewportConstraints {
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

  // Define constraints
  const minHeight = 400; // Minimum for usability
  const headerHeight = 80; // Compact header (~60px + padding)
  const footerHeight = 60; // Action buttons area
  const reservedSpace = 40; // Margin/padding buffer

  // Calculate optimal height (80% of viewport)
  const optimalHeight = Math.max(minHeight, Math.floor(viewportHeight * 0.8));

  // Maximum height (95% of viewport minus reserved space)
  const maxHeight = Math.min(
    Math.floor(viewportHeight * 0.95) - reservedSpace,
    800, // Absolute max for very large screens
  );

  return {
    minHeight,
    maxHeight,
    optimalHeight,
    headerHeight,
    footerHeight,
  };
}

/**
 * Calculate content area height for scrollable regions
 */
export function calculateContentHeight(constraints: ViewportConstraints): number {
  return constraints.optimalHeight - constraints.headerHeight - constraints.footerHeight;
}

/**
 * Generate CSS custom properties for dynamic sizing
 */
export function generateSuccessPanelStyles(): Record<string, string> {
  const constraints = calculateSuccessPanelConstraints();
  const contentHeight = calculateContentHeight(constraints);

  return {
    '--success-panel-min-height': `${constraints.minHeight}px`,
    '--success-panel-max-height': `${constraints.maxHeight}px`,
    '--success-panel-optimal-height': `${constraints.optimalHeight}px`,
    '--success-panel-header-height': `${constraints.headerHeight}px`,
    '--success-panel-footer-height': `${constraints.footerHeight}px`,
    '--success-panel-content-height': `${contentHeight}px`,
  };
}

/**
 * Hook for responsive success panel sizing
 */
export function useSuccessPanelSizing() {
  const [styles, setStyles] = React.useState<Record<string, string>>(generateSuccessPanelStyles());

  React.useEffect(() => {
    const updateStyles = () => {
      setStyles(generateSuccessPanelStyles());
    };

    // Update on resize
    window.addEventListener('resize', updateStyles);

    // Initial update
    updateStyles();

    return () => {
      window.removeEventListener('resize', updateStyles);
    };
  }, []);

  return styles;
}
