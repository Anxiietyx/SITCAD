
import { Navigation } from './Navigation';

export function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#ACFCD9]/100 via-[#55D6BE]/100 to-white">
      <Navigation />
      <div className="flex-1 overflow-x-hidden lg:pt-0 pt-[60px]">
        {children}
      </div>
    </div>
  );
}
