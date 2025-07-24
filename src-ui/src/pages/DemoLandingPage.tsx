import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid, List, ExternalLink, Code, Zap, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoMetadata {
  id: string;
  title: string;
  description: string;
  taskNumber: string;
  features: string[];
  route: string;
  status: 'completed' | 'in-progress' | 'planned';
}

const demos: DemoMetadata[] = [
  {
    id: 'file-selection',
    title: 'File Selection Component',
    description: 'Interactive file and folder selection with drag-and-drop support',
    taskNumber: '4.2.1.1',
    features: ['Drag & Drop', 'Multi-file Selection', 'Folder Selection', 'File Validation'],
    route: '/demo/file-selection-demo',
    status: 'completed',
  },
  {
    id: 'key-generation',
    title: 'Key Generation Form',
    description: 'Secure key generation with passphrase strength validation',
    taskNumber: '4.2.1.2',
    features: ['Passphrase Validation', 'Strength Indicator', 'Key Preview', 'Secure Generation'],
    route: '/demo/key-generation-demo',
    status: 'planned',
  },
  {
    id: 'key-selection',
    title: 'Key Selection Dropdown',
    description: 'Dynamic key selection with search and filtering capabilities',
    taskNumber: '4.2.1.4',
    features: ['Search & Filter', 'Key Preview', 'Recent Keys', 'Quick Actions'],
    route: '/demo/key-selection-demo',
    status: 'planned',
  },
  {
    id: 'passphrase-input',
    title: 'Passphrase Input',
    description: 'Secure passphrase input with strength validation and visibility toggle',
    taskNumber: '4.2.1.3',
    features: [
      'Strength Validation',
      'Visibility Toggle',
      'Real-time Feedback',
      'Security Indicators',
    ],
    route: '/demo/passphrase-input-demo',
    status: 'planned',
  },
  {
    id: 'progress-bar',
    title: 'Progress Bar Component',
    description: 'Visual progress tracking for long-running operations',
    taskNumber: '4.2.2.1',
    features: ['Progress Tracking', 'Indeterminate Mode', 'Status Messages', 'Accessibility'],
    route: '/demo/progress-bar-demo',
    status: 'completed',
  },
  {
    id: 'error-message',
    title: 'Error Message Component',
    description: 'Structured error display with recovery guidance and actions',
    taskNumber: '4.2.2.2',
    features: ['Error Types', 'Recovery Guidance', 'Retry Actions', 'Technical Details'],
    route: '/demo/error-message-demo',
    status: 'completed',
  },
  {
    id: 'success-message',
    title: 'Success Message Component',
    description: 'Positive feedback with action buttons and auto-hide functionality',
    taskNumber: '4.2.2.3',
    features: ['Action Buttons', 'Auto-hide', 'Multiple Variants', 'Interactive Demos'],
    route: '/demo/success-message-demo',
    status: 'completed',
  },
  {
    id: 'loading-spinner',
    title: 'Loading Spinner Component',
    description: 'Loading state indicators with customizable animations',
    taskNumber: '4.2.2.4',
    features: ['Customizable Size', 'Animation Options', 'Accessibility', 'Integration Ready'],
    route: '/demo/loading-spinner-demo',
    status: 'planned',
  },
];

const DemoLandingPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');

  const getStatusColor = (status: DemoMetadata['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'planned':
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: DemoMetadata['status']) => {
    switch (status) {
      case 'completed':
        return <Code className="w-4 h-4" />;
      case 'in-progress':
        return <Zap className="w-4 h-4" />;
      case 'planned':
        return <Palette className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Component Demos</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Interactive demonstrations of Barqly Vault UI components
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">View:</span>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-0"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-none border-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {demos.filter((d) => d.status === 'completed').length}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Completed</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {demos.filter((d) => d.status === 'in-progress').length}
            </div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">In Progress</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {demos.filter((d) => d.status === 'planned').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Planned</div>
          </div>
        </div>
      </div>

      {/* Demo Grid/List */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demos.map((demo) => (
            <div
              key={demo.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(demo.status)}
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(demo.status)}`}
                  >
                    {demo.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">Task {demo.taskNumber}</span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {demo.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{demo.description}</p>

              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-2">Features:</div>
                <div className="flex flex-wrap gap-1">
                  {demo.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                to={demo.route}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  demo.status === 'completed'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Demo</span>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {demos.map((demo) => (
            <div
              key={demo.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(demo.status)}
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(demo.status)}`}
                    >
                      {demo.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {demo.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{demo.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500 font-mono">
                        Task {demo.taskNumber}
                      </span>
                      <div className="flex space-x-1">
                        {demo.features.slice(0, 3).map((feature) => (
                          <span
                            key={feature}
                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                        {demo.features.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{demo.features.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  to={demo.route}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    demo.status === 'completed'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Demo</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DemoLandingPage;
