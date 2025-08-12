import React, { useEffect, useState } from 'react';

interface AnimatedTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
}

/**
 * Animated transition component for smooth content changes
 * Prevents jarring white screens during state transitions
 */
const AnimatedTransition: React.FC<AnimatedTransitionProps> = ({
  show,
  children,
  className = '',
  duration = 300,
  delay = 0,
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [opacity, setOpacity] = useState(show ? 1 : 0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (show) {
      // When showing, render immediately but fade in
      setShouldRender(true);
      timeoutId = setTimeout(() => {
        setOpacity(1);
      }, delay);
    } else {
      // When hiding, fade out first then unmount
      setOpacity(0);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, duration + delay);
    }

    return () => clearTimeout(timeoutId);
  }, [show, duration, delay]);

  if (!shouldRender) return null;

  return (
    <div
      className={className}
      style={{
        opacity,
        transition: `opacity ${duration}ms ease-in-out`,
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedTransition;
