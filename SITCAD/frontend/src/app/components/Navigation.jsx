import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from "../lib/firebase"
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Brain,
  FileText, 
  MessageSquare, 
  AlertCircle,
  Sparkles,
  Monitor,
  LogOut,
  Home,
  User,
  Menu,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import logo from '../../images/logo.png';

// ─── TEACHER ROLE ROUTES ───
// For routes that are not ready for display yet, comment them out.
const teacherNavItems = [
  { path: '/teacher', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/teacher/ai-lesson-planning', icon: Sparkles, label: 'Lesson Planning' },
  { path: '/teacher/activities', icon: Calendar, label: 'Activities' },
  { path: '/teacher/classroom-mode', icon: Monitor, label: 'Classroom Mode' },
  { path: '/teacher/reports', icon: FileText, label: 'Reports' },
  // { path: '/teacher/ai-analysis', icon: Brain, label: 'AI Analysis' },
  { path: '/teacher/interventions', icon: AlertCircle, label: 'Interventions' },
  // { path: '/teacher/communication', icon: MessageSquare, label: 'Messages' },
];

const parentNavItems = [
  { path: '/parent', icon: Home, label: 'Dashboard', exact: true },
  // { path: '/parent/communication', icon: MessageSquare, label: 'Messages' },
];

const adminNavItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
];

function NavigationContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = user.role === 'teacher' ? teacherNavItems : user.role === 'admin' ? adminNavItems : parentNavItems;

  const isActive = (path, exact) => {
    if (exact) {
      // Special case: treat /role/dashboard as active for /role Dashboard nav item
      if (
        (path === '/teacher' && location.pathname === '/teacher/dashboard') ||
        (path === '/parent' && location.pathname === '/parent/dashboard') ||
        (path === '/admin' && location.pathname === '/admin/dashboard')
      ) {
        return true;
      }
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path) => {
    navigate(path);
    onNavigate?.();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      navigate('/login');
      onNavigate?.();
      console.log("User logged out successfully.");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-15 h-15 bg-gradient-to-br from-[#eaeeef] to-[#eaeeef] rounded-lg flex items-center justify-center">
            <img src={logo} alt="SITCAD Logo" className="w-15 h-15 object-contain" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-sm">SabahSprout</h2>
            <Badge variant="secondary" className="text-xs capitalize">
              {user.role}
            </Badge>
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-[#ACFCD9]/100 to-[#ACFCD9]/100 rounded-lg">
          <div className="w-10 h-10 bg-gradient-to-br from-[#55D6BE] to-[#55D6BE] rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{user.name}</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          
          return (
            <Button
              key={item.path}
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 cursor-pointer',
                active && 'bg-gradient-to-r from-[#ACFCD9]/100 to-[#ACFCD9]/100 text-primary font-medium'
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </nav>
      
      {/* Logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-200 cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </Button>
      </div>
    </>
  );
}

export function Navigation() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex w-60 bg-white border-r flex-col h-screen sticky top-0">
        <NavigationContent />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#55D6BE] to-[#ACFCD9] rounded-lg flex items-center justify-center">
            <img src={logo} alt="SITCAD Logo" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-semibold">SabahSprout</span>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <NavigationContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}