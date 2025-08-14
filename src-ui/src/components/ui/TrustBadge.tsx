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
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-xs px-3 py-1 hover:bg-slate-200 transition-colors cursor-help"
      title={tooltip}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
};

export default TrustBadge;
