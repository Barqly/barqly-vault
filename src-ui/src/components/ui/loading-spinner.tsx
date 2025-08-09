import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';

const loadingSpinnerVariants = cva('inline-flex items-center justify-center', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    animation: {
      spin: 'animate-spin',
      pulse: 'animate-pulse',
      bounce: 'animate-bounce',
      wave: 'animate-pulse',
    },
    variant: {
      default: 'text-primary',
      muted: 'text-muted-foreground',
      white: 'text-white',
      blue: 'text-blue-600',
      green: 'text-green-600',
      red: 'text-red-600',
    },
  },
  defaultVariants: {
    size: 'md',
    animation: 'spin',
    variant: 'default',
  },
});

const textVariants = cva('ml-2 text-sm font-medium', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    },
    variant: {
      default: 'text-muted-foreground',
      muted: 'text-muted-foreground',
      white: 'text-white',
      blue: 'text-blue-600',
      green: 'text-green-600',
      red: 'text-red-600',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingSpinnerVariants> {
  text?: string;
  showText?: boolean;
  centered?: boolean;
  fullScreen?: boolean;
  overlay?: boolean;
  onComplete?: () => void;
  ref?: React.Ref<HTMLDivElement>;
}

function LoadingSpinner({
  className,
  size,
  animation,
  variant,
  text,
  showText = false,
  centered = false,
  fullScreen = false,
  overlay = false,
  onComplete,
  ref,
  ...props
}: LoadingSpinnerProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  // Handle completion callback
  React.useEffect(() => {
    if (onComplete && !isVisible) {
      onComplete();
    }
  }, [isVisible, onComplete]);

  // Auto-hide after delay if text is provided (for temporary loading states)
  React.useEffect(() => {
    if (text && showText && !fullScreen) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // Auto-hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [text, showText, fullScreen]);

  if (!isVisible) return null;

  const containerClasses = cn(
    'inline-flex items-center',
    {
      'justify-center w-full h-full': centered || fullScreen,
      'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm': fullScreen,
      'absolute inset-0 z-10 bg-background/50': overlay && !fullScreen,
      relative: !centered && !fullScreen && !overlay,
    },
    className,
  );

  const spinnerClasses = cn(loadingSpinnerVariants({ size, animation, variant }), {
    'animate-spin': animation === 'spin',
    'animate-pulse': animation === 'pulse',
    'animate-bounce': animation === 'bounce',
  });

  const textClasses = cn(textVariants({ size, variant }), {
    hidden: !showText || !text,
  });

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-label={text || 'Loading'}
      className={containerClasses}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={spinnerClasses} />
        {showText && text && <span className={textClasses}>{text}</span>}
      </div>
    </div>
  );
}

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner, loadingSpinnerVariants, textVariants };
