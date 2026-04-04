
import { Navigation } from './Navigation';

export function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-linear-to-br from-[#ACFCD9] via-[#ACFCD9]">
      <Navigation />
      <div className="flex-1 overflow-x-hidden lg:pt-0 pt-15">
        {children}
      </div>
    </div>
  );
}
