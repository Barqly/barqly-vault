import React from 'react';

interface AppPrimaryContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Shared primary content container component
 * Standardizes max-width, horizontal padding, and breakpoint behavior across all screens
 *
 * Based on Setup screen canonical layout:
 * - max-w-[960px]: Maximum content width
 * - px-6: Horizontal padding (24px each side)
 * - mx-auto: Horizontal centering
 */
const AppPrimaryContainer: React.FC<AppPrimaryContainerProps> = ({
  children,
  className = '',
  id,
}) => {
  return (
    <main className={`mx-auto max-w-[960px] px-6 ${className}`} id={id}>
      {children}
    </main>
  );
};

export default AppPrimaryContainer;
