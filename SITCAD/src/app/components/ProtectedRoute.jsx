
import { Navigate, Outlet } from 'react-router';
<<<<<<< Updated upstream
import { useAuth } from '../contexts/AuthContext';
=======
import { useAuth } from '../contexts/AuthContext'; // Removed UserRole import as it's a type
>>>>>>> Stashed changes
import { DashboardLayout } from './DashboardLayout';
import { Loader2 } from 'lucide-react';

<<<<<<< Updated upstream
export function ProtectedRoute({ allowedRoles }) {
=======
export function ProtectedRoute({ allowedRoles }) { // Removed type annotation
>>>>>>> Stashed changes
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
