import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { API_BASE } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogOut, Users, AlertTriangle, TrendingUp, TrendingDown, BookOpen, Calendar, Sparkles, FileText, MessageSquare, Monitor, Brain, UserPlus, Search, Star, GraduationCap, Minus } from 'lucide-react';
import Duckpit from './Duckpit';
import { useState, useEffect } from 'react';

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sortOption, setSortOption] = useState("default");
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [interventionCount, setInterventionCount] = useState(0);
  const [analyses, setAnalyses] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [classroom, setClassroom] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState(false);
  const [filterAge, setFilterAge] = useState("all");
  const [filterClass, setFilterClass] = useState("all");

  // ✅ AFTER all hooks
  if (!user) return null;

  // Fetch teacher's students and intervention count on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const studentsRes = await fetch(`${API_BASE}/teachers/my-students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(data);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    const fetchInterventionCount = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const [interventionsRes, analysesRes] = await Promise.all([
          fetch(`${API_BASE}/ai-integrations/all-interventions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken }),
          }),
          fetch(`${API_BASE}/ai-integrations/all-analyses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken }),
          }),
        ]);
        if (interventionsRes.ok) {
          const interventions = await interventionsRes.json();
          setInterventionCount(interventions.filter(i => i.status !== 'resolved').length);
        }
        if (analysesRes.ok) {
          setAnalyses(await analysesRes.json());
        }
      } catch (error) {
        console.warn('Could not fetch intervention data:', error);
      }
    };

    fetchStudents();
    fetchInterventionCount();
  }, []);

  const needsAttention = students.filter(s => s.needs_intervention);

  const handleOpenAssignDialog = async () => {
    setAssignDialogOpen(true);
    setIsLoadingUnassigned(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/teachers/unassigned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await res.json();
      setUnassignedStudents(data);
    } catch (error) {
      console.error('Error fetching unassigned students:', error);
    } finally {
      setIsLoadingUnassigned(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudentId || !classroom) return;
    setIsSubmitting(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/teachers/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, student_id: selectedStudentId, classroom }),
      });
      if (res.ok) {
        const assignedStudent = await res.json();
        setStudents([...students, assignedStudent]);
        setSelectedStudentId(null);
        setClassroom('');
        setAssignDialogOpen(false);
      }
    } catch (error) {
      console.error('Error assigning student:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const classroomStats = {
    totalStudents: students.length,
    averageProgress: 0,
    needingSupport: interventionCount || needsAttention.length,
    onTrack: 0,
  };

  const statsCardShadeOpacity = 0.92;
  const statsCardShadeStyle = {
    backgroundColor: `rgb(255 255 255 / ${statsCardShadeOpacity})`,
  };
  const dashboardCardShadeOpacity = 0.88;
  const dashboardCardShadeStyle = {
    backgroundColor: `rgb(255 255 255 / ${dashboardCardShadeOpacity})`,
  };
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStageBadgeVariant = (stage) => { // Removed type annotation
    switch (stage) {
      case 'advanced': return 'default';
      case 'proficient': return 'secondary';
      case 'developing': return 'outline';
      case 'emerging': return 'destructive';
      default: return 'secondary'; // Added default case for safety
    }
  };

  const filteredStudents = students.filter(s => {
  const matchAge = filterAge === "all" || s.age.toString() === filterAge;
  const matchClass = filterClass === "all" || s.classroom === filterClass;
  return matchAge && matchClass;
  });

  const finalStudents = [...filteredStudents].sort((a, b) => {
    if (sortOption === "age") return a.age - b.age;
    if (sortOption === "class") return (a.classroom || "").localeCompare(b.classroom || "");
    return 0;
  });

  const uniqueAges = [...new Set(students.map(s => s.age))];
  const uniqueClasses = [...new Set(students.map(s => s.classroom).filter(Boolean))];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Duckpit
          count={32}
          gravity={0.5}
          friction={0.9975}
          wallBounce={0.9}
          className="h-full w-full opacity-100"
        />
      </div>
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-emerald-50/72" />

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/70 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome back, {user.name}!
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 min-h-[80vh] space-y-6">
          {/* Quick Action Cards */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="cursor-pointer border-white shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/activities')}>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-[#3090A0]" />
                <p className="text-sm font-medium">Activities</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/ai-lesson-planning')}>
              <CardContent className="pt-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-[#3090A0]" />
                <p className="text-sm font-medium">AI Lessons</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/reports')}>
              <CardContent className="pt-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-[#3090A0]" />
                <p className="text-sm font-medium">Reports</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/communication')}>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-[#3090A0]" />
                <p className="text-sm font-medium">Messages</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/classroom-mode')}>
              <CardContent className="pt-6 text-center">
                <Monitor className="h-8 w-8 mx-auto mb-2 text-[#3090A0]" />
                <p className="text-sm font-medium">Classroom</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/ai-analysis')}>
              <CardContent className="pt-6 text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 text-[#3090A0]" />
                <p className="text-sm font-medium">AI Analysis</p>
              </CardContent>
            </Card>
          </div> */}

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-black/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription className="text-lg font-semibold stats-label">Total Students</CardDescription>
                <CardTitle className="text-6xl">{classroomStats.totalStudents}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-[#3090A0]">
                  <Users className="mr-5 h-10 w-10" />
                  Active learners
                </div>
              </CardContent>
            </Card>

            <Card className="border-black/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription className="text-lg font-semibold stats-label">Average Progress</CardDescription>
                <CardTitle className="text-6xl">{classroomStats.averageProgress}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-[#3090A0]">
                  <TrendingUp className="mr-5 h-10 w-10" />
                  Class performance
                </div>
              </CardContent>
            </Card>

            <Card className="border-black/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription className="text-lg font-semibold stats-label">On Track</CardDescription>
                <CardTitle className="text-6xl">{classroomStats.onTrack}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-[#3090A0]">
                  <TrendingUp className="mr-5 h-10 w-10" />
                  Meeting milestones
                </div>
              </CardContent>
            </Card>

            <Card className="border-black/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription className="text-lg font-semibold stats-label">Needs Support</CardDescription>
                <CardTitle className="text-6xl">{classroomStats.needingSupport}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-yellow-600">
                  <AlertTriangle className="mr-5 h-10 w-10" />
                  <button
                    onClick={() => navigate('/teacher/interventions')}
                    className="hover:underline"
                  >
                    View interventions
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Summary */}
          {analyses.length > 0 && (
            <Card className="border-black/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    AI Insights
                  </CardTitle>
                  <CardDescription>
                    Latest intervention analysis per student
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => navigate('/teacher/interventions')}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analyses.slice(0, 6).map(a => (
                    <div
                      key={a.id}
                      className="p-4 border-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => navigate(`/teacher/student/${a.student_id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{a.student_name}</span>
                        {a.improvement_data?.trend && (
                          <Badge variant="outline" className={`text-xs gap-1 ${
                            a.improvement_data.trend === 'improving' ? 'text-green-700 border-green-200' :
                            a.improvement_data.trend === 'declining' ? 'text-red-700 border-red-200' :
                            'text-gray-600 border-gray-200'
                          }`}>
                            {a.improvement_data.trend === 'improving' && <TrendingUp className="h-3 w-3" />}
                            {a.improvement_data.trend === 'declining' && <TrendingDown className="h-3 w-3" />}
                            {a.improvement_data.trend === 'stable' && <Minus className="h-3 w-3" />}
                            {a.improvement_data.trend.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.overall_summary}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {a.inclinations?.length > 0 && (
                          <Badge variant="outline" className="text-xs gap-1 text-purple-600 border-purple-200">
                            <Star className="h-3 w-3" /> {a.inclinations.length} strength(s)
                          </Badge>
                        )}
                        {a.school_readiness && (
                          <Badge variant="outline" className={`text-xs gap-1 ${
                            a.school_readiness.level === 'ready' ? 'text-green-600 border-green-200' :
                            a.school_readiness.level === 'almost_ready' ? 'text-yellow-600 border-yellow-200' :
                            'text-red-600 border-red-200'
                          }`}>
                            <GraduationCap className="h-3 w-3" /> {a.school_readiness.level?.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Students */}
          <Card className="border-black/70 shadow-md hover:shadow-lg transition-shadow transform-gpu" style={dashboardCardShadeStyle}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className='text-xl font-semibold'>My Students</CardTitle>
                <CardDescription>
                  Click on a student to view their profile and learning progress
                </CardDescription>
              </div>

              {/* RIGHT SIDE CONTROLS */}
              <div className="flex items-center gap-3">
                <p>Filter By:</p>
                  {/* AGE FILTER */}
                  <select
                    className="border rounded-md px-3 py-2 text-sm cursor-pointer"
                    value={filterAge}
                    onChange={(e) => setFilterAge(e.target.value)}
                  >
                    <option value="all">All Ages</option>
                    {uniqueAges.map(age => (
                      <option key={age} value={age}>Age {age}</option>
                    ))}
                  </select>

                  {/* CLASS FILTER */}
                  <select
                    className="border rounded-md px-3 py-2 text-sm cursor-pointer"
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                  >
                    <option value="all">All Classes</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>

                  {/* ADD BUTTON */}
                  <Button
                    className="bg-[#3090A0] hover:bg-[#2FBFA5] text-white gap-2 cursor-pointer"
                    onClick={handleOpenAssignDialog}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Student
                  </Button>
              </div>

              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Student to Your Classroom</DialogTitle>
                    <DialogDescription>
                      Select an unassigned student (registered by a parent) and assign them to a classroom.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {isLoadingUnassigned ? (
                      <div className="space-y-2 py-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 border rounded-md animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-1">
                              <div className="h-3 bg-gray-200 rounded w-1/2" />
                              <div className="h-2 bg-gray-100 rounded w-1/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : unassignedStudents.length === 0 ? (
                      <div className="text-center py-6 space-y-2">
                        <Search className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No unassigned students found.</p>
                        <p className="text-xs text-muted-foreground">Parents need to register their children first before you can add them here.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <Label>Select Student</Label>
                          <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                            {unassignedStudents.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className={`w-full text-left px-4 py-3 hover:bg-green-50 transition-colors ${
                                  selectedStudentId === s.id ? 'bg-green-100 font-medium' : ''
                                }`}
                                onClick={() => setSelectedStudentId(s.id)}
                              >
                                <span className="font-medium">{s.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">Age {s.age}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="assign-classroom">Classroom</Label>
                          <Input
                            id="assign-classroom"
                            placeholder="e.g. Class A"
                            value={classroom}
                            onChange={(e) => setClassroom(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    {unassignedStudents.length > 0 && (
                      <Button
                        className="bg-[#3090A0] hover:bg-[#2FBFA5] text-white cursor-pointer"
                        onClick={handleAssignStudent}
                        disabled={isSubmitting || !selectedStudentId || !classroom}
                      >
                        {isSubmitting ? 'Assigning...' : 'Assign to Classroom'}
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingStudents ? (
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
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-4/5" />
                    </div>
                  ))}
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No students assigned yet.</p>
                  <p className="text-xs text-muted-foreground">Click "Add Student" to assign students registered by parents.</p>
                </div>
              ) : finalStudents.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No students match the selected filters.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try selecting a different age or class.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {finalStudents.map(student => (
                    <Card
                      key={student.id}
                      className="cursor-pointer border-gray/80 shadow-md hover:shadow-lg transition-shadow transform-gpu pb-4"
                      style={dashboardCardShadeStyle}
                      onClick={() => navigate(`/teacher/student/${student.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center text-xl font-bold text-green-700">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{student.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">Age {student.age}{student.classroom && ` • ${student.classroom}`}</p>
                            </div>
                          </div>
                          {student.needs_intervention && (
                            <AlertTriangle className="h-5 w-5 text-yellow-300" />
                          )}
                        </div>
                      </CardHeader>
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