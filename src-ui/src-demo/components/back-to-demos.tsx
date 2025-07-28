import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackToDemosProps {
  className?: string;
  variant?: 'default' | 'minimal';
}

const BackToDemos: React.FC<BackToDemosProps> = ({ className = '', variant = 'default' }) => {
  if (variant === 'minimal') {
    return (
      <Link
        to="/demo"
        className={`inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors ${className}`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Demos</span>
      </Link>
    );
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <Link to="/demo">
        <Button variant="outline" size="sm" className="inline-flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Demos</span>
        </Button>
      </Link>

      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Grid className="w-4 h-4" />
        <span>Component Demo</span>
      </div>
    </div>
  );
};

export default BackToDemos;
