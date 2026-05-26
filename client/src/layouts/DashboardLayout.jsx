import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import API_URL from '../constants/api';
import Sidebar from '../components/sidebar/Sidebar';
import Topbar from '../components/navbar/Topbar';
import { SearchProvider } from '../context/SearchContext';
import './DashboardLayout.css';

function DashboardLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SearchProvider>
      <div className="dashboard-layout">
        <Sidebar unreadCount={unreadCount} />

        <div className="dashboard-content">
          <Topbar unreadCount={unreadCount} setUnreadCount={setUnreadCount} />

          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}

export default DashboardLayout;
