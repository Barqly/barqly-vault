import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollReset Component
 *
 * Ensures that the main scrollable container resets to top on route changes.
 * This component handles the specific case where the scroll container is not
 * the window but a custom element (the <main> element with overflow-auto).
 *
 * Uses the same scroll detection approach as CollapsibleHelp (which works correctly).
 */
const ScrollReset: React.FC = () => {
  const { pathname } = useLocation();
  const prevPathname = useRef<string>(pathname);

  useEffect(() => {
    // Only reset if pathname actually changed (not on initial mount)
    if (prevPathname.current === pathname) {
      return;
    }
    prevPathname.current = pathname;

    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Find scroll container using same logic as CollapsibleHelp
    const findScrollContainer = (): HTMLElement | null => {
      // First try by ID (most reliable)
      const byId = document.getElementById('main-scroll-container');
      if (byId) return byId;

      // Fallback: Find element with overflow-auto/scroll
      const elements = document.querySelectorAll('*');
      for (const element of elements) {
        if (element instanceof HTMLElement) {
          const overflowY = window.getComputedStyle(element).overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll') && element.tagName === 'MAIN') {
            return element;
          }
        }
      }

      return null;
    };

    // Reset scroll with multiple timing strategies
    const resetScroll = () => {
      const scrollContainer = findScrollContainer();
      if (scrollContainer) {
        // Reset scroll position - try multiple methods for compatibility
        // Method 1: Direct property setting (most compatible)
        scrollContainer.scrollTop = 0;

        // Method 2: scrollTo with coordinates (fallback)
        if (scrollContainer.scrollTo) {
          scrollContainer.scrollTo(0, 0);
        }
      }
    };

    // Execute immediately
    resetScroll();

    // Execute after DOM updates
    requestAnimationFrame(() => {
      resetScroll();
    });

    // Final safety net - in case content loads async
    const timeoutId = setTimeout(() => {
      resetScroll();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};

export default ScrollReset;
