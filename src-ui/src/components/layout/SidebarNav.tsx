import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, Key, Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';

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
  const { vaults, getCurrentVaultKeys } = useVault();

  const navItems: NavItem[] = [
    {
      id: 'vault-hub',
      label: 'Vault Hub',
      icon: Archive,
      path: '/',
      badge: () => vaults.length,
    },
    {
      id: 'manage-keys',
      label: 'Manage Keys',
      icon: Key,
      path: '/keys',
      badge: () => getCurrentVaultKeys().length,
    },
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
  ];

  return (
    <aside
      className={`
        relative flex flex-col bg-white border-r border-slate-200 h-full
        transition-all duration-200 ease-out
        ${sidebarCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo/Brand Area */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-semibold text-slate-800">Barqly Vault</h1>
        )}
        {sidebarCollapsed && <span className="text-lg font-bold text-blue-600">B</span>}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 pt-4 pb-4">
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
                    transition-all duration-150
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`
                      flex-shrink-0 w-5 h-5
                      ${isActive ? 'text-blue-600' : 'text-slate-400'}
                    `}
                  />

                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 font-medium text-sm">{item.label}</span>

                      {item.badge && badgeCount > 0 && (
                        <span
                          className={`
                            text-xs px-2 py-0.5 rounded-full
                            ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}
                          `}
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
                        bg-slate-800 text-white text-xs rounded
                        opacity-0 pointer-events-none
                        group-hover:opacity-100
                        transition-opacity duration-150
                      "
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

      {/* Collapse Toggle Button */}
      <div className="border-t border-slate-200 p-2">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="
            flex items-center justify-center w-full px-3 py-2
            text-slate-400 hover:text-slate-600 hover:bg-slate-50
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
