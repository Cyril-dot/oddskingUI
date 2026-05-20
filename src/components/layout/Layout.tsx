import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import Toast from '../common/Toast';

export default function Layout() {
  const theme = useAppStore((s) => s.theme);

  return (
    <div className={theme === 'super-bet-dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors">
        <Header />
        <div className="flex max-w-[1440px] mx-auto w-full">
          <Sidebar />
          {/* pb-32 + mb-16 on mobile = padding inside + margin outside the main, well clear of 64px BottomNav */}
          <main className="flex-1 min-w-0 min-h-[calc(100vh-4rem)] pb-32 mb-16 lg:pb-6 lg:mb-0">
            <Outlet />
          </main>
        </div>
        <Footer />
        <BottomNav />
        <Toast />
      </div>
    </div>
  );
}