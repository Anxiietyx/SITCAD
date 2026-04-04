import { useEffect, useReducer, useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Users, GraduationCap, ShieldCheck, UserPlus, Trash2, RefreshCw, Mail, Clock } from 'lucide-react';
import { adminReducer, initialState } from '../reducers/adminReducer';
import Duckpit from './Duckpit';

const API_BASE = 'http://localhost:8000';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(adminReducer, initialState);
  const [stats, setStats] = useState({ teacher: null, parent: null, admin: null, total: null });
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchStats = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    fetch(`${API_BASE}/admin/stats`)
      .then((res) => res.json())
      .then((data) => {
        dispatch({ type: 'SET_STATS', payload: data });
        setStats(data);
      })
      .catch((err) => {
        console.error('Failed to fetch admin stats:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
      });
  }, []);

  const fetchUsers = useCallback((role) => {
    setLoadingUsers(true);
    const url = role ? `${API_BASE}/admin/users?role=${role}` : `${API_BASE}/admin/users`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error('Failed to fetch users:', err))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    fetchStats();
    fetchUsers(roleFilter);
  }, [fetchStats, fetchUsers, roleFilter]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStats();
        fetchUsers(roleFilter);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  if (!user) return null;

  const statsCardShadeOpacity = 0.92;
  const statsCardShadeStyle = { backgroundColor: `rgb(255 255 255 / ${statsCardShadeOpacity})` };
  const dashboardCardShadeOpacity = 0.88;
  const dashboardCardShadeStyle = { backgroundColor: `rgb(255 255 255 / ${dashboardCardShadeOpacity})` };
  const statsLabelStyle = { color: '#374151', fontSize: '1rem', fontWeight: 600 };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'default';
      case 'teacher': return 'secondary';
      case 'parent': return 'outline';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="h-4 w-4" />;
      case 'teacher': return <GraduationCap className="h-4 w-4" />;
      case 'parent': return <Users className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Duckpit count={24} gravity={0.5} friction={0.9975} wallBounce={0.9} className="h-full w-full opacity-100" />
      </div>
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-amber-50/72" />

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
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
          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => navigate('/admin/register')}>
              <CardContent className="pt-6 text-center">
                <UserPlus className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                <p className="text-sm font-medium">Add Admin</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => setRoleFilter('teacher')}>
              <CardContent className="pt-6 text-center">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">View Teachers</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => setRoleFilter('parent')}>
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">View Parents</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => setRoleFilter(null)}>
              <CardContent className="pt-6 text-center">
                <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">All Users</p>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Total Users</CardDescription>
                <CardTitle className="text-6xl">{stats.total ?? '—'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-amber-600">
                  <Users className="mr-5 h-10 w-10" />
                  All registered accounts
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Teachers</CardDescription>
                <CardTitle className="text-6xl">{stats.teacher ?? '—'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-blue-600">
                  <GraduationCap className="mr-5 h-10 w-10" />
                  Teacher accounts
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Parents</CardDescription>
                <CardTitle className="text-6xl">{stats.parent ?? '—'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-green-600">
                  <Users className="mr-5 h-10 w-10" />
                  Parent accounts
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Admins</CardDescription>
                <CardTitle className="text-6xl">{stats.admin ?? '—'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-purple-600">
                  <ShieldCheck className="mr-5 h-10 w-10" />
                  Admin accounts
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Management Table */}
          <Card className="border-white/70" style={dashboardCardShadeStyle}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    {roleFilter ? `Showing ${roleFilter} accounts` : 'All registered users across the platform'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {roleFilter && (
                    <Button variant="outline" size="sm" onClick={() => setRoleFilter(null)}>
                      Clear Filter
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fetchUsers(roleFilter)}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border border-dashed rounded-lg">
                  No users found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                  {users.map((u) => (
                    <Card key={u.id} className="border-white/70 hover:shadow-lg transition-shadow w-full" style={dashboardCardShadeStyle}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">
                              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <CardTitle
                                className="text-base truncate max-w-[12rem]"
                                title={u.full_name || 'No name'}
                              >
                                {(u.full_name && u.full_name.length > 22)
                                  ? u.full_name.slice(0, 22) + '…'
                                  : (u.full_name || 'No name')}
                              </CardTitle>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{u.email}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize shrink-0 ml-2">
                            {getRoleIcon(u.role)}
                            <span className="ml-1">{u.role || 'none'}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                          {u.id !== user.id && (
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2" onClick={() => handleDeleteUser(u.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

