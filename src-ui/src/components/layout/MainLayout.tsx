import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import AppHeader from './AppHeader';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // Scroll main content to top when route changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <div className="flex flex-col h-screen bg-app">
      {/* Universal Header - Full Width Across Top */}
      <AppHeader />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar Navigation */}
        <SidebarNav />

        {/* Page Content */}
        <main ref={mainRef} className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
