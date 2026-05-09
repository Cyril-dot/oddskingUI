import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import HomeIcon from '@mui/icons-material/Home';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const navItems = [
  { to: '/', label: 'Home', icon: <HomeIcon /> },
  { to: '/live', label: 'Sports', icon: <SportsSoccerIcon /> },
  { to: '/betslip', label: 'Bet Slip', icon: <ReceiptLongIcon /> },
  { to: '/account', label: 'Account', icon: <AccountCircleIcon /> },
];

export default function BottomNav() {
  const location = useLocation();
  const betSlip = useAppStore((s) => s.betSlip);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.to === '/betslip' && betSlip.length > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5">
                    {betSlip.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}