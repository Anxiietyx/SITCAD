import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getStudentsByRole, Student } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { LogOut, Users, AlertTriangle, TrendingUp, BookOpen, Calendar, Sparkles, FileText, MessageSquare, Monitor, Brain } from 'lucide-react';

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const students = getStudentsByRole(user.id, 'teacher');
  const needsAttention = students.filter(s => s.needsIntervention);
  const classroomStats = {
    totalStudents: students.length,
    averageProgress: Math.round(students.reduce((acc, s) => acc + s.overallProgress, 0) / students.length),
    needingSupport: needsAttention.length,
    onTrack: students.filter(s => s.developmentalStage === 'proficient' || s.developmentalStage === 'advanced').length,
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStageBadgeVariant = (stage: Student['developmentalStage']) => {
    switch (stage) {
      case 'advanced': return 'default';
      case 'proficient': return 'secondary';
      case 'developing': return 'outline';
      case 'emerging': return 'destructive';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
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
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/teacher/activities')}>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Activities</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/teacher/ai-lesson-planning')}>
            <CardContent className="pt-6 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">AI Lessons</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/teacher/reports')}>
            <CardContent className="pt-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Reports</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/teacher/communication')}>
            <CardContent className="pt-6 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-cyan-600" />
              <p className="text-sm font-medium">Messages</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/teacher/classroom-mode')}>
            <CardContent className="pt-6 text-center">
              <Monitor className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium">Classroom</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/teacher/ai-analysis')}>
            <CardContent className="pt-6 text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
              <p className="text-sm font-medium">AI Analysis</p>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Students</CardDescription>
              <CardTitle className="text-3xl">{classroomStats.totalStudents}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4" />
                Active learners
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Progress</CardDescription>
              <CardTitle className="text-3xl">{classroomStats.averageProgress}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="mr-2 h-4 w-4" />
                Class performance
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>On Track</CardDescription>
              <CardTitle className="text-3xl">{classroomStats.onTrack}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="mr-2 h-4 w-4" />
                Meeting milestones
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Needs Support</CardDescription>
              <CardTitle className="text-3xl">{classroomStats.needingSupport}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-orange-600">
                <AlertTriangle className="mr-2 h-4 w-4" />
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

        {/* Students Needing Attention */}
        {needsAttention.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <CardTitle>Students Requiring Attention</CardTitle>
              </div>
              <CardDescription>
                These students have been flagged for early intervention support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {needsAttention.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => navigate(`/teacher/student/${student.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.classroom}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Students */}
        <Card>
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
                  className="cursor-pointer hover:shadow-lg transition-shadow"
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
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">{student.overallProgress}%</span>
                      </div>
                      <Progress value={student.overallProgress} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stage:</span>
                      <Badge variant={getStageBadgeVariant(student.developmentalStage)}>
                        {student.developmentalStage}
                      </Badge>
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
  );
}