
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { API_BASE } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Heart, TrendingUp, TrendingDown, MessageSquare, UserPlus, FileText, Clock, CheckCircle2, AlertTriangle, Users, Star, GraduationCap, Sparkles, Target, Minus, Brain } from 'lucide-react';
import Duckpit from './Duckpit';
import { useState, useEffect } from 'react';

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
  const [childAnalyses, setChildAnalyses] = useState({});
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);

  // Fetch children from API on mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/parents/my-children`, {
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
        const res = await fetch(`${API_BASE}/reports/for-parent`, {
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

  // Fetch analyses for each child once children are loaded
  useEffect(() => {
    if (children.length === 0) return;
    const fetchAnalyses = async () => {
      setIsLoadingAnalyses(true);
      try {
        const idToken = await auth.currentUser.getIdToken();
        const results = await Promise.all(
          children.map(child =>
            fetch(`${API_BASE}/ai-integrations/child-analysis/${child.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: idToken }),
            }).then(res => res.ok ? res.json() : null).catch(() => null)
          )
        );
        const map = {};
        results.forEach((analysis, i) => {
          if (analysis) map[children[i].id] = analysis;
        });
        setChildAnalyses(map);
      } catch (error) {
        console.error('Error fetching child analyses:', error);
      } finally {
        setIsLoadingAnalyses(false);
      }
    };
    fetchAnalyses();
  }, [children]);

  const handleAddChild = async () => {
    if (!newChild.name || !newChild.age) return;
    setIsSubmitting(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/parents/add-child`, {
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

  const assignedCount = children.filter(c => c.teacher_id).length;

  const statsCardShadeStyle = { backgroundColor: 'rgb(255 255 255 / 0.92)' };
  const dashboardCardShadeStyle = { backgroundColor: 'rgb(255 255 255 / 0.88)' };
  const statsLabelStyle = { color: '#374151', fontSize: '1rem', fontWeight: 600 };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Duckpit count={30} interactive={false} className="h-full w-full opacity-100" />
      </div>
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-emerald-50/72" />

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Parent Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome back, {user.name}!
                </p>
              </div>
            </div>
          </div>
        </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Message */}
        <Card className="border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle}>
          <CardHeader>
            <CardTitle className="text-black">Your Child's Learning Journey</CardTitle>
            <CardDescription className="text-muted-foreground">
              Track progress, view activities, and celebrate achievements together
            </CardDescription>
            <div className="pb-3"></div>
          </CardHeader>
        </Card>
          {/* Quick Action Cards */}
          {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card
              className="cursor-pointer border-white shadow-md hover:shadow-lg transition-shadow transform-gpu"
              style={dashboardCardShadeStyle}
              onClick={() => navigate('/parent/communication')}
            >
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Messages</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu"
              style={dashboardCardShadeStyle}
              onClick={() => children.length > 0 && navigate(`/parent/student/${children[0].id}/progress`)}
            >
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Progress</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu"
              style={dashboardCardShadeStyle}
              onClick={() => children.length > 0 && navigate(`/parent/student/${children[0].id}`)}
            >
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Child Profile</p>
              </CardContent>
            </Card>
          </div> */}

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>My Children</CardDescription>
                <CardTitle className="text-6xl">{children.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-green-600">
                  <Heart className="mr-5 h-10 w-10" />
                  Registered learners
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Assigned to Teacher</CardDescription>
                <CardTitle className="text-6xl">{assignedCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle2 className="mr-5 h-10 w-10" />
                  In classroom
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Reports</CardDescription>
                <CardTitle className="text-6xl">{reports.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-green-600">
                  <FileText className="mr-5 h-10 w-10" />
                  Activity reports
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Children */}
          <Card className="border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle></CardTitle>
                <CardDescription>
                <CardTitle className="text-black">Click on a child to view their profile and learning progress</CardTitle>
                </CardDescription>
              </div>
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
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddChildOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#3090A0] hover:bg-[#2FBFA5] text-white"
                      onClick={handleAddChild}
                      disabled={isSubmitting || !newChild.name || !newChild.age}
                    >
                      {isSubmitting ? 'Registering...' : 'Register Child'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingChildren ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-5 border rounded-xl space-y-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                          <div className="h-3 bg-gray-100 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : children.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Heart className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No children linked to your account.</p>
                  <p className="text-xs text-muted-foreground">Click "Add Child" to register your child and connect with their teacher.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {children.map(child => (
                    <Card
                      key={child.id}
                      className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu pb-4"
                      style={dashboardCardShadeStyle}
                      onClick={() => navigate(`/parent/student/${child.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-emerald-200 flex items-center justify-center text-xl font-bold text-black-500">
                              {child.name.charAt(0)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{child.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">Age {child.age}{child.classroom && ` • ${child.classroom}`}</p>
                            </div>
                          </div>
                          {child.teacher_id ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child AI Insights */}
          {Object.keys(childAnalyses).length > 0 && (
            <Card className="border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Learning Insights
                </CardTitle>
                <CardDescription>AI-powered analysis of your child's learning progress, strengths, and development</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {children.map(child => {
                  const analysis = childAnalyses[child.id];
                  if (!analysis) return null;
                  return (
                    <Card key={child.id} className="border shadow-sm" style={dashboardCardShadeStyle}>
                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700">
                              {child.name.charAt(0)}
                            </div>
                            <span className="font-medium">{child.name}</span>
                          </div>
                          {analysis.improvement_data?.trend && (
                            <Badge variant="outline" className={`gap-1 text-xs ${
                              analysis.improvement_data.trend === 'improving' ? 'text-green-700 border-green-200' :
                              analysis.improvement_data.trend === 'declining' ? 'text-red-700 border-red-200' :
                              'text-gray-600 border-gray-200'
                            }`}>
                              {analysis.improvement_data.trend === 'improving' && <TrendingUp className="h-3 w-3" />}
                              {analysis.improvement_data.trend === 'declining' && <TrendingDown className="h-3 w-3" />}
                              {analysis.improvement_data.trend === 'stable' && <Minus className="h-3 w-3" />}
                              {analysis.improvement_data.trend.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>

                        {/* Summary */}
                        {analysis.overall_summary && (
                          <p className="text-sm text-muted-foreground">{analysis.overall_summary}</p>
                        )}

                        {/* Strengths */}
                        {analysis.inclinations?.length > 0 && (
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs font-medium text-purple-900 mb-2 flex items-center gap-1">
                              <Star className="h-3 w-3" /> Your Child's Strengths
                            </p>
                            <ul className="space-y-1">
                              {analysis.inclinations.map((inc, i) => (
                                <li key={i} className="text-xs text-purple-800">
                                  <span className="font-medium">{inc.area}:</span> {inc.observation}
                                  {inc.suggestion && <span className="text-purple-600 ml-1">— {inc.suggestion}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* School Readiness */}
                        {analysis.school_readiness && (
                          <div className={`p-3 rounded-lg border ${
                            analysis.school_readiness.level === 'ready' ? 'bg-green-50 border-green-200' :
                            analysis.school_readiness.level === 'almost_ready' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-red-50 border-red-200'
                          }`}>
                            <p className="text-xs font-medium mb-1 flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" /> School Readiness
                              <Badge className={`ml-1 text-xs px-2 py-0 ${
                                analysis.school_readiness.level === 'ready' ? 'bg-green-200 text-green-800' :
                                analysis.school_readiness.level === 'almost_ready' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-red-200 text-red-800'
                              }`}>
                                {analysis.school_readiness.level?.replace('_', ' ')}
                              </Badge>
                            </p>
                            <p className="text-xs">{analysis.school_readiness.assessment}</p>
                            {analysis.school_readiness.recommendations?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Recommendations:</p>
                                <ul className="list-disc list-inside text-xs space-y-0.5">
                                  {analysis.school_readiness.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interventions */}
                        {analysis.interventions?.length > 0 && (
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-xs font-medium text-orange-900 mb-2 flex items-center gap-1">
                              <Target className="h-3 w-3" /> Areas for Extra Support
                            </p>
                            {analysis.interventions.map((intv, i) => (
                              <div key={i} className="mb-2 last:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">{intv.area}</span>
                                  <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                                    intv.priority === 'high' ? 'text-red-600 border-red-200' :
                                    intv.priority === 'medium' ? 'text-orange-600 border-orange-200' :
                                    'text-yellow-600 border-yellow-200'
                                  }`}>{intv.priority}</Badge>
                                </div>
                                <p className="text-xs text-orange-800">{intv.concern}</p>
                                {intv.recommended_actions?.length > 0 && (
                                  <ul className="list-disc list-inside text-xs text-orange-700 mt-1 space-y-0.5">
                                    {intv.recommended_actions.map((action, j) => (
                                      <li key={j}>{action}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground pt-1 border-t">
                          Last analysed: {formatDateTime(analysis.created_at)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Reports */}
          <Card className="border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle}>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Activity performance reports from your child's teacher</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="space-y-3 py-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="flex gap-2 mt-2">
                        <div className="h-5 w-20 bg-gray-100 rounded-full" />
                        <div className="h-5 w-16 bg-gray-100 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No reports available yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(report => (
                    <Card key={report.id} className="border-white/70 shadow-sm hover:shadow-md transition-shadow" style={dashboardCardShadeStyle}>
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
                                {formatDateTime(report.created_at)}
                              </span>
                              {report.students?.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {report.students.map(s => s.name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
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
