
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { getStudentsByRole } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LogOut, Heart, Calendar, TrendingUp, MessageSquare, UserPlus, FileText, Clock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export function ParentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const [children, setChildren] = useState([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', age: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Fetch children from API on mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch('http://localhost:8000/parents/my-children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        const data = await res.json();
        setChildren(data);
      } catch (error) {
        console.error('Error fetching children:', error);
      } finally {
        setIsLoadingChildren(false);
      }
    };

    fetchChildren();
  }, []);

  // Fetch reports for parent
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch('http://localhost:8000/reports/for-parent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        if (res.ok) setReports(await res.json());
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setIsLoadingReports(false);
      }
    };
    fetchReports();
  }, []);

  const handleAddChild = async () => {
    if (!newChild.name || !newChild.age) return;
    setIsSubmitting(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('http://localhost:8000/parents/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, name: newChild.name, age: Number(newChild.age) }),
      });
      if (res.ok) {
        const newStudent = await res.json();
        setChildren([...children, newStudent]);
        setNewChild({ name: '', age: '' });
        setAddChildOpen(false);
      }
    } catch (error) {
      console.error('Error adding child:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Parent Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome back, {user.name}!
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Message */}
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
          <CardHeader>
            <CardTitle className="text-white">Your Child's Learning Journey</CardTitle>
            <CardDescription className="text-white/90">
              Track progress, view activities, and celebrate achievements together
            </CardDescription>
            <div className="pb-3"></div>
          </CardHeader>
        </Card>

        {/* Children */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Children</h2>
          <Dialog open={addChildOpen} onOpenChange={setAddChildOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#3090A0] hover:bg-[#2FBFA5] text-white gap-2 cursor-pointer">
                <UserPlus className="h-4 w-4" />
                Add Child
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Your Child</DialogTitle>
                <DialogDescription>
                  Enter your child's details. Their teacher will be able to assign them to a classroom afterwards.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="child-name">Full Name</Label>
                  <Input
                    id="child-name"
                    placeholder="e.g. Ahmad Ibrahim"
                    value={newChild.name}
                    onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="child-age">Age</Label>
                  <Select
                    value={newChild.age}
                    onValueChange={(value) => setNewChild({ ...newChild, age: value })}
                  >
                    <SelectTrigger id="child-age">
                      <SelectValue placeholder="Select age" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddChildOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleAddChild}
                  disabled={isSubmitting || !newChild.name || !newChild.age}
                >
                  {isSubmitting ? 'Registering...' : 'Register Child'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingChildren ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading your children...</p>
            </CardContent>
          </Card>
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No children linked to your account.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
            {children.map(child => (
              <Card 
                key={child.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/parent/student/${child.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-purple-200 flex items-center justify-center text-xl font-bold text-purple-700">
                        {child.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{child.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Age {child.age}{child.classroom && ` • ${child.classroom}`}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {child.teacher_id ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">✓ Assigned to a teacher</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700 font-medium">Awaiting teacher assignment</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reports Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Reports
          </h2>
          {isLoadingReports ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Loading reports...</p>
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No reports available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{report.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{report.summary}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {report.activity_learning_area && (
                            <Badge variant="outline" className="text-xs capitalize">{report.activity_learning_area}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {report.students?.length || 0} student(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tips for Parents */}
        {/* KIV: An AI integration might be implement-able here. */}
        {/* <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle>Tips for Supporting Learning at Home</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Read together for at least 15 minutes each day</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Practice counting objects during everyday activities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Encourage drawing and creative expression</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Celebrate small achievements and effort</span>
              </li>
            </ul>
          </CardContent>
        </Card> */}
      </main>
    </div>
  );
}
