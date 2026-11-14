import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="app-container">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <div className="main-wrapper">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
