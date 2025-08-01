import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Key, Lock, Unlock } from 'lucide-react';

interface NavigationTabsProps {
  currentPage?: string;
}

const NavigationTabs: React.FC<NavigationTabsProps> = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/setup',
      label: 'Setup',
      icon: Key,
    },
    {
      path: '/encrypt',
      label: 'Encrypt',
      icon: Lock,
    },
    {
      path: '/decrypt',
      label: 'Decrypt',
      icon: Unlock,
    },
  ];

  return (
    <div className="flex space-x-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-4 h-4 mr-1.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default NavigationTabs;
