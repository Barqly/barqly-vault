import React from 'react';
import SidebarNav from './SidebarNav';
import AppHeader from './AppHeader';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Universal Header - Full Width Across Top */}
      <AppHeader />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar Navigation */}
        <SidebarNav />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
