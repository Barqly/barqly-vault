/**
 * ScrollHint component - provides visual indication when content overflows
 * Used in success panels to hint at additional content below the fold
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollHintProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  fadeHeight?: number;
  showButton?: boolean;
}

export const ScrollHint: React.FC<ScrollHintProps> = ({
  children,
  className = '',
  style,
  fadeHeight = 40,
  showButton = true,
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkOverflow = () => {
    const container = containerRef.current;
    if (container) {
      const hasOverflow = container.scrollHeight > container.clientHeight;
      const nearBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 20;

      setIsOverflowing(hasOverflow);
      setIsNearBottom(nearBottom);
    }
  };

  useEffect(() => {
    checkOverflow();

    const container = containerRef.current;
    if (container) {
      let resizeObserver: ResizeObserver | null = null;

      // Check on content changes - only if ResizeObserver is available
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(checkOverflow);
        resizeObserver.observe(container);
      }

      // Check on scroll
      container.addEventListener('scroll', checkOverflow);

      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        container.removeEventListener('scroll', checkOverflow);
      };
    }
  }, []);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={`relative ${className}`} style={style}>
      <div ref={containerRef} className="overflow-y-auto h-full" onScroll={checkOverflow}>
        {children}
      </div>

      {/* Fade gradient hint */}
      {isOverflowing && !isNearBottom && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent"
          style={{ height: `${fadeHeight}px` }}
        />
      )}

      {/* Scroll down button */}
      {isOverflowing && !isNearBottom && showButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 
                     bg-white border border-gray-300 rounded-full p-1 shadow-sm
                     hover:bg-gray-50 hover:border-gray-400 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Scroll to see more content"
        >
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default ScrollHint;
