import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getStudentsByRole } from '../data/mockData'; // Removed Student import as it's a type
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { LogOut, Users, AlertTriangle, TrendingUp, BookOpen, Calendar, Sparkles, FileText, MessageSquare, Monitor, Brain } from 'lucide-react';
import Duckpit from './Duckpit';

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const students = getStudentsByRole(user.id, 'teacher');
  const needsAttention = students.filter(s => s.needsIntervention);
  const classroomStats = {
    totalStudents: students.length,
    averageProgress: students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.overallProgress, 0) / students.length) : 0, // Added check for students.length
    needingSupport: needsAttention.length,
    onTrack: students.filter(s => s.developmentalStage === 'proficient' || s.developmentalStage === 'advanced').length,
  };

  const statsCardShadeOpacity = 0.92;
  const statsCardShadeStyle = {
    backgroundColor: `rgb(255 255 255 / ${statsCardShadeOpacity})`,
  };
  const dashboardCardShadeOpacity = 0.88;
  const dashboardCardShadeStyle = {
    backgroundColor: `rgb(255 255 255 / ${dashboardCardShadeOpacity})`,
  };
  const statsLabelColor = '#374151';
  const statsLabelSize = '1rem';
  const statsLabelStyle = {
    color: statsLabelColor,
    fontSize: statsLabelSize,
    fontWeight: 600,
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
        <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
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

        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="cursor-pointer border-white hover:shadow-lg transition-shadow" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/activities')}>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Activities</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 hover:shadow-lg transition-shadow" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/ai-lesson-planning')}>
              <CardContent className="pt-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">AI Lessons</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 hover:shadow-lg transition-shadow" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/reports')}>
              <CardContent className="pt-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Reports</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 hover:shadow-lg transition-shadow" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/communication')}>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Messages</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 hover:shadow-lg transition-shadow" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/classroom-mode')}>
              <CardContent className="pt-6 text-center">
                <Monitor className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Classroom</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-white/70 hover:shadow-lg transition-shadow" style={dashboardCardShadeStyle} onClick={() => navigate('/teacher/ai-analysis')}>
              <CardContent className="pt-6 text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">AI Analysis</p>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-white/70" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Total Students</CardDescription>
                <CardTitle className="text-6xl">{classroomStats.totalStudents}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-green-600">
                  <Users className="mr-5 h-10 w-10" />
                  Active learners
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Average Progress</CardDescription>
                <CardTitle className="text-6xl">{classroomStats.averageProgress}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-green-600">
                  <TrendingUp className="mr-5 h-10 w-10" />
                  Class performance
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>On Track</CardDescription>
                <CardTitle className="text-6xl">{classroomStats.onTrack}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-green-600">
                  <TrendingUp className="mr-5 h-10 w-10" />
                  Meeting milestones
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70" style={statsCardShadeStyle}>
              <CardHeader className="pb-1">
                <CardDescription style={statsLabelStyle}>Needs Support</CardDescription>
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

          {/* All Students */}
          <Card className="border-white/70" style={dashboardCardShadeStyle}>
            <CardHeader>
              <CardTitle>My Students</CardTitle>
              <CardDescription>
                Click on a student to view their profile and learning progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(student => (
                  <Card
                    key={student.id}
                    className="cursor-pointer border-white/70 hover:shadow-lg transition-shadow"
                    style={dashboardCardShadeStyle}
                    onClick={() => navigate(`/teacher/student/${student.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-14 h-14 rounded-full object-cover"
                          />
                          <div>
                            <CardTitle className="text-base">{student.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">Age {student.age}</p>
                          </div>
                        </div>
                        {student.needsIntervention && (
                          <AlertTriangle className="h-5 w-5 text-yellow-300" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Overall Progress</span>
                          <span className="font-medium">{student.overallProgress}%</span>
                        </div>
                        <Progress
                          value={student.overallProgress}
                          className="[&>div]:bg-yellow-300"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Recent Activity:</p>
                        <p className="text-sm">{student.recentActivity}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}