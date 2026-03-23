import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Users, GraduationCap, ShieldCheck, UserPlus } from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ teacher: null, parent: null, admin: null });

  useEffect(() => {
    fetch('http://localhost:8000/admin/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to fetch admin stats:', err));
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome back, {user.name}! <Badge variant="secondary" className="ml-1 capitalize">{user.role}</Badge>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/register')}>
            <CardContent className="pt-6 text-center">
              <UserPlus className="h-8 w-8 mx-auto mb-2 text-amber-600" />
              <p className="text-sm font-medium">Add Admin</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Manage Teachers</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Manage Parents</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">System Settings</p>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Teachers Registered</CardDescription>
              <CardTitle className="text-3xl">{stats.teacher ?? '—'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <GraduationCap className="mr-2 h-4 w-4" />
                Registered teacher accounts
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Parents Registered</CardDescription>
              <CardTitle className="text-3xl">{stats.parent ?? '—'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4" />
                Registered parent accounts
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all registered users across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border border-dashed rounded-lg">
              User list coming soon
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

