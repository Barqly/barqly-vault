import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import AnimatedTransition from './AnimatedTransition';

export interface ProgressStep {
  id: number;
  label: string;
  description?: string;
}

interface ProgressBarProps {
  steps: ProgressStep[];
  currentStep: number;
  completedSteps?: Set<number>;
  onStepClick?: (stepId: number) => void;
  isClickable?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

/**
 * Generic progress bar component for multi-step workflows
 * Reusable across encrypt, decrypt, and other multi-step processes
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  steps,
  currentStep,
  completedSteps = new Set(),
  onStepClick,
  isClickable = true,
  className = '',
  variant = 'default',
}) => {
  const progressPercentage = useMemo(() => {
    if (steps.length <= 1) return 100;
    return ((currentStep - 1) / (steps.length - 1)) * 100;
  }, [currentStep, steps.length]);

  const getStepStatus = (stepId: number) => {
    if (completedSteps.has(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    if (stepId < currentStep) return 'visited';
    return 'upcoming';
  };

  const getStepClasses = (status: string) => {
    const baseClasses = 'relative flex items-center justify-center transition-all duration-300';

    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-500 text-white`;
      case 'current':
        return `${baseClasses} bg-blue-600 text-white ring-4 ring-blue-100`;
      case 'visited':
        return `${baseClasses} bg-blue-200 text-blue-700`;
      case 'upcoming':
        return `${baseClasses} bg-gray-200 text-gray-400`;
      default:
        return baseClasses;
    }
  };

  const canClickStep = (stepId: number) => {
    if (!isClickable || !onStepClick) return false;
    // Can click completed steps or go back
    return completedSteps.has(stepId) || stepId < currentStep;
  };

  if (variant === 'compact') {
    return (
      <div className={`bg-white border-b ${className}`}>
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const isClickable = canClickStep(step.id);

              return (
                <React.Fragment key={step.id}>
                  <button
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                      isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                    } ${
                      status === 'current'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : status === 'completed'
                          ? 'text-green-600'
                          : status === 'visited'
                            ? 'text-blue-600'
                            : 'text-gray-400'
                    }`}
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    disabled={!isClickable}
                  >
                    <span className="text-sm font-medium">
                      {status === 'completed' ? <Check className="w-4 h-4" /> : step.id}
                    </span>
                    <span className="text-sm">{step.label}</span>
                  </button>

                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-2">
                      <div className="h-0.5 bg-gray-200 rounded-full">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{
                            width: `${status === 'completed' || status === 'visited' ? 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="relative">
          {/* Progress line background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />

          {/* Animated progress line */}
          <div
            className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step) => {
              const status = getStepStatus(step.id);
              const isClickable = canClickStep(step.id);

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isClickable ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  onClick={() => isClickable && onStepClick?.(step.id)}
                >
                  {/* Step circle */}
                  <div className={`w-10 h-10 rounded-full z-10 ${getStepClasses(status)}`}>
                    <AnimatedTransition show={status === 'completed'} duration={200}>
                      <Check className="w-5 h-5" />
                    </AnimatedTransition>
                    <AnimatedTransition show={status !== 'completed'} duration={200}>
                      <span className="font-semibold">{step.id}</span>
                    </AnimatedTransition>
                  </div>

                  {/* Step label */}
                  <div className="mt-3 text-center">
                    <p
                      className={`text-sm font-medium ${
                        status === 'current'
                          ? 'text-blue-700'
                          : status === 'completed' || status === 'visited'
                            ? 'text-gray-700'
                            : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.description && status === 'current' && (
                      <p className="text-xs text-gray-500 mt-1 max-w-[150px]">{step.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
