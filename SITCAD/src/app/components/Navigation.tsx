import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from "../../firebase/firebase"
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Brain, // location for icon brain
  FileText, 
  MessageSquare, 
  AlertCircle,
  Sparkles,
  Monitor,
  GraduationCap, // Location for icon Graduation
  LogOut,
  Home,
  User,
  Menu
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

const teacherNavItems = [
  { path: '/teacher', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/teacher/ai-analysis', icon: Brain, label: 'AI Analysis' },
  { path: '/teacher/interventions', icon: AlertCircle, label: 'Interventions' },
  { path: '/teacher/activities', icon: Calendar, label: 'Activities' },
  { path: '/teacher/ai-lesson-planning', icon: Sparkles, label: 'Lesson Planning' },
  { path: '/teacher/reports', icon: FileText, label: 'Reports' },
  { path: '/teacher/communication', icon: MessageSquare, label: 'Messages' },
  { path: '/teacher/classroom-mode', icon: Monitor, label: 'Classroom Mode' },
];

const parentNavItems = [
  { path: '/parent', icon: Home, label: 'Dashboard', exact: true },
  { path: '/parent/communication', icon: MessageSquare, label: 'Messages' },
];

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems = user.role === 'teacher' ? teacherNavItems : parentNavItems;

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleLogout = async () => {
    // logout();
    // navigate('/login');
    // onNavigate?.();
    try {
      await signOut(auth);
      console.log("User logged out successfully.");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#55D6BE] to-[#ACFCD9] rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-black"/>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-sm">SabahSprout</h2>
            <Badge variant="secondary" className="text-xs capitalize">
              {user.role}
            </Badge>
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-[#ACFCD9]/50 to-[#55D6BE]/80 rounded-lg">
          <div className="w-10 h-10 bg-gradient-to-br from-[#55D6BE] to-[#ACFCD9] rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
                'w-full justify-start gap-3',
                active && 'bg-gradient-to-r from-[#ACFCD9]/100 to-[#55D6BE]/100 text-primary font-medium'
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
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-200"
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
      <div className="hidden lg:flex w-64 bg-white border-r flex-col h-screen sticky top-0">
        <NavigationContent />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#55D6BE] to-[#ACFCD9] rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
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