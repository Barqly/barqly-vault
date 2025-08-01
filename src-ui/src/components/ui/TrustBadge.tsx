import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TrustBadgeProps {
  icon: LucideIcon;
  label: string;
  tooltip: string;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({ icon: Icon, label, tooltip }) => {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs text-gray-600 hover:bg-gray-100 transition-colors cursor-help"
      title={tooltip}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
};

export default TrustBadge;
