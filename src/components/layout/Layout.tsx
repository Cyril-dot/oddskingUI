import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Toast from '../common/Toast';

export default function Layout() {
  const theme = useAppStore((s) => s.theme);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors">
        <Header />
        <div className="flex max-w-[1440px] mx-auto w-full">
          <Sidebar />
          {/* pb-20 clears the 64px BottomNav on mobile; lg:pb-4 restores normal padding on desktop */}
          <main className="flex-1 min-w-0 min-h-[calc(100vh-4rem)] pb-20 lg:pb-4">
            <Outlet />
          </main>
        </div>
        <BottomNav />
        <Toast />
      </div>
    </div>
  );
}