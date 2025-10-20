import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, Key, Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { ThemeToggle } from '../common/ThemeToggle';

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  path: string;
  badge?: () => number;
}

const SidebarNav: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();

  const navItems: NavItem[] = [
    {
      id: 'encrypt',
      label: 'Encrypt',
      icon: Lock,
      path: '/encrypt',
    },
    {
      id: 'decrypt',
      label: 'Decrypt',
      icon: Unlock,
      path: '/decrypt',
    },
    {
      id: 'vault-hub',
      label: 'Vault Hub',
      icon: Archive,
      path: '/vault-hub',
    },
    {
      id: 'manage-keys',
      label: 'Manage Keys',
      icon: Key,
      path: '/keys',
    },
  ];

  return (
    <aside
      className={`
        relative flex flex-col bg-card border-r border-default h-full
        transition-all duration-200 ease-out
        ${sidebarCollapsed ? 'w-16' : 'w-48'}
      `}
    >
      {/* Navigation Items */}
      <nav className="flex-1 pt-2.5 pb-4 overflow-hidden">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const badgeCount = item.badge?.() ?? 0;

            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg
                    transition-colors duration-150
                    ${isActive ? 'text-white' : 'text-heading hover:bg-hover'}
                  `}
                  style={{
                    backgroundColor: isActive ? '#1D4ED8' : undefined,
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`flex-shrink-0 w-5 h-5 ${isActive ? 'text-white' : 'text-secondary'}`}
                  />

                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 font-medium text-sm whitespace-nowrap overflow-hidden">
                        {item.label}
                      </span>

                      {item.badge && badgeCount > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isActive ? '#1E40AF' : '#e2e8f0',
                            color: isActive ? '#ffffff' : '#475569',
                          }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}

                  {/* Collapsed state badge tooltip */}
                  {sidebarCollapsed && item.badge && badgeCount > 0 && (
                    <span
                      className="
                        absolute left-12 ml-1 px-2 py-1
                        text-white text-xs rounded
                        opacity-0 pointer-events-none
                        group-hover:opacity-100
                        transition-opacity duration-150
                      "
                      style={{ backgroundColor: '#1e293b' }}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="border-t border-default p-2">
        <div className="flex justify-center">
          <ThemeToggle collapsed={sidebarCollapsed} />
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <div className="border-t border-default p-2">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="
            flex items-center justify-center w-full px-3 py-2
            text-muted hover:text-secondary hover:bg-hover
            rounded-lg transition-colors duration-150
          "
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-3" />
              {!sidebarCollapsed && <span className="text-sm font-medium">Collapse</span>}
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default SidebarNav;
