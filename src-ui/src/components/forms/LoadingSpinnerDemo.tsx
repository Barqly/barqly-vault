import React, { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Zap, Clock } from 'lucide-react';
import BackToDemos from '@/components/ui/back-to-demos';

const LoadingSpinnerDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const demoScenarios = [
    {
      id: 'sizes',
      name: 'Size Variants',
      description: 'Different sizes for various use cases',
      component: (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner size="xs" />
            <span className="text-xs font-medium">Extra Small (xs)</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner size="sm" />
            <span className="text-xs font-medium">Small (sm)</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner size="md" />
            <span className="text-xs font-medium">Medium (md)</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner size="lg" />
            <span className="text-xs font-medium">Large (lg)</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner size="xl" />
            <span className="text-xs font-medium">Extra Large (xl)</span>
          </div>
        </div>
      ),
    },
    {
      id: 'animations',
      name: 'Animation Types',
      description: 'Different animation styles',
      component: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner animation="spin" size="lg" />
            <span className="text-sm font-medium">Spin</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner animation="pulse" size="lg" />
            <span className="text-sm font-medium">Pulse</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner animation="bounce" size="lg" />
            <span className="text-sm font-medium">Bounce</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner animation="wave" size="lg" />
            <span className="text-sm font-medium">Wave</span>
          </div>
        </div>
      ),
    },
    {
      id: 'colors',
      name: 'Color Variants',
      description: 'Different color themes',
      component: (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner variant="default" size="lg" />
            <span className="text-sm font-medium">Default</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner variant="muted" size="lg" />
            <span className="text-sm font-medium">Muted</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-blue-600">
            <LoadingSpinner variant="white" size="lg" />
            <span className="text-sm font-medium text-white">White</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner variant="blue" size="lg" />
            <span className="text-sm font-medium">Blue</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner variant="green" size="lg" />
            <span className="text-sm font-medium">Green</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <LoadingSpinner variant="red" size="lg" />
            <span className="text-sm font-medium">Red</span>
          </div>
        </div>
      ),
    },
    {
      id: 'button-integration',
      name: 'Button Integration',
      description: 'Loading states in buttons',
      component: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button disabled className="flex items-center gap-2">
              <LoadingSpinner size="sm" variant="white" />
              <span>Processing...</span>
            </Button>
            <Button disabled variant="outline" className="flex items-center gap-2">
              <LoadingSpinner size="sm" variant="default" />
              <span>Loading...</span>
            </Button>
            <Button disabled variant="secondary" className="flex items-center gap-2">
              <LoadingSpinner size="sm" variant="muted" />
              <span>Saving...</span>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• Loading spinners in buttons provide clear feedback during operations</p>
            <p>• Use appropriate colors (white for primary buttons, default for others)</p>
            <p>• Disable buttons during loading to prevent multiple submissions</p>
          </div>
        </div>
      ),
    },
    {
      id: 'text-display',
      name: 'Text Display',
      description: 'Loading spinners with descriptive text',
      component: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
              <LoadingSpinner size="lg" text="Loading keys..." showText variant="blue" />
              <span className="text-sm text-muted-foreground">Key Selection</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
              <LoadingSpinner size="lg" text="Generating secure key..." showText variant="green" />
              <span className="text-sm text-muted-foreground">Key Generation</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• Text provides context about what's happening</p>
            <p>• Use descriptive, action-oriented messages</p>
            <p>• Match text color to spinner variant for consistency</p>
          </div>
        </div>
      ),
    },
    {
      id: 'layout-options',
      name: 'Layout Options',
      description: 'Different positioning and overlay options',
      component: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative h-32 border rounded-lg">
              <LoadingSpinner
                size="md"
                text="Centered loading..."
                showText
                centered
                variant="blue"
              />
              <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                Centered Layout
              </div>
            </div>
            <div className="relative h-32 border rounded-lg">
              <LoadingSpinner size="md" text="Overlay loading..." showText overlay variant="blue" />
              <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                Overlay Layout
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              • <strong>Centered:</strong> Centers the spinner within its container
            </p>
            <p>
              • <strong>Overlay:</strong> Covers the entire container with semi-transparent
              background
            </p>
            <p>
              • <strong>Full Screen:</strong> Covers the entire viewport (not shown here)
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'auto-hide',
      name: 'Auto-hide Demo',
      description: 'Temporary loading states that auto-hide',
      component: (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
            {isRunning && (
              <LoadingSpinner
                size="lg"
                text="This will auto-hide in 5 seconds..."
                showText
                variant="blue"
              />
            )}
            <Button
              onClick={() => {
                setIsRunning(true);
                setTimeout(() => setIsRunning(false), 5000);
              }}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              <span>Start Auto-hide Demo</span>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• Auto-hide is useful for temporary loading states</p>
            <p>• Full-screen loading states don't auto-hide</p>
            <p>• Provides fallback for stuck loading states</p>
          </div>
        </div>
      ),
    },
    {
      id: 'accessibility',
      name: 'Accessibility Features',
      description: 'ARIA attributes and screen reader support',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
              <LoadingSpinner
                size="lg"
                text="Loading files for encryption..."
                showText
                variant="blue"
              />
              <span className="text-sm text-muted-foreground">With Descriptive Text</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
              <LoadingSpinner size="lg" variant="blue" />
              <span className="text-sm text-muted-foreground">Default ARIA Label</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>ARIA Features:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <code>role="status"</code> - Indicates this is a status message
              </li>
              <li>
                <code>aria-live="polite"</code> - Announces changes to screen readers
              </li>
              <li>
                <code>aria-label</code> - Provides accessible description
              </li>
              <li>Custom text becomes the aria-label when provided</li>
              <li>Default "Loading" label when no text is provided</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const handleStartDemo = (demoId: string) => {
    setActiveDemo(demoId);
    setIsRunning(true);
  };

  const handleStopDemo = () => {
    setActiveDemo('');
    setIsRunning(false);
  };

  const handleReset = () => {
    setActiveDemo('');
    setIsRunning(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackToDemos />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Loading Spinner Component
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive loading state indicators with customizable animations, sizes, and
          accessibility features
        </p>
      </div>

      {/* Demo Controls */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => handleStartDemo('interactive')}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            <span>Start Interactive Demo</span>
          </Button>
          <Button
            onClick={handleStopDemo}
            disabled={!isRunning}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            <span>Stop Demo</span>
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
        </div>

        {isRunning && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Interactive demo is running</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Demo */}
      {isRunning && activeDemo === 'interactive' && (
        <div className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-900/20">
          <h3 className="text-lg font-semibold mb-4">Interactive Demo</h3>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner
              size="xl"
              text="Processing your request..."
              showText
              variant="blue"
              animation="spin"
            />
          </div>
        </div>
      )}

      {/* Demo Scenarios */}
      <div className="space-y-8">
        {demoScenarios.map((scenario) => (
          <div key={scenario.id} className="border rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {scenario.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{scenario.description}</p>
            </div>
            {scenario.component}
          </div>
        ))}
      </div>

      {/* Component Features */}
      <div className="mt-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-900/20">
        <h3 className="text-lg font-semibold mb-4">Component Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Size Variants</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• xs (12px) - Small inline loading</li>
              <li>• sm (16px) - Button loading states</li>
              <li>• md (24px) - Section loading</li>
              <li>• lg (32px) - Page loading</li>
              <li>• xl (48px) - Full-screen loading</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Animation Options</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Spin - Classic spinning animation</li>
              <li>• Pulse - Pulsing animation</li>
              <li>• Bounce - Bouncing animation</li>
              <li>• Wave - Wave animation</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Color Variants</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Default - Primary theme color</li>
              <li>• Muted - Subtle loading indicator</li>
              <li>• White - For dark backgrounds</li>
              <li>• Blue, Green, Red - Contextual colors</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Layout Options</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Inline - Default positioning</li>
              <li>• Centered - Center within container</li>
              <li>• Overlay - Semi-transparent overlay</li>
              <li>• Full Screen - Covers entire viewport</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="mt-8 p-6 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Accessibility</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">ARIA Attributes</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• role="status" - Status message role</li>
              <li>• aria-live="polite" - Screen reader announcements</li>
              <li>• aria-label - Accessible description</li>
              <li>• Dynamic labels based on text prop</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Integration</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Button loading states</li>
              <li>• Form submission feedback</li>
              <li>• Page transitions</li>
              <li>• Tauri command operations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinnerDemo;
