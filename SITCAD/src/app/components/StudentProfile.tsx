import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getStudentById, getDevelopmentalAreas } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Calendar, MapPin, TrendingUp, Award, AlertCircle } from 'lucide-react';

export function StudentProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || !studentId) return null;

  const student = getStudentById(studentId);
  const developmentalAreas = getDevelopmentalAreas(studentId);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Student not found</p>
      </div>
    );
  }

  const handleBack = () => {
    navigate(user.role === 'teacher' ? '/teacher' : '/parent');
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      literacy: 'bg-blue-100 text-blue-700',
      numeracy: 'bg-green-100 text-green-700',
      social: 'bg-purple-100 text-purple-700',
      motor: 'bg-orange-100 text-orange-700',
      creative: 'bg-pink-100 text-pink-700',
      cognitive: 'bg-cyan-100 text-cyan-700',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Student Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <img
                src={student.avatar}
                alt={student.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-200 shadow-lg"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-semibold mb-2">{student.name}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Age {student.age}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {student.classroom}
                      </span>
                      <span>Enrolled: {new Date(student.enrollmentDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {student.needsIntervention && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Needs Support
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-lg font-semibold text-purple-600">{student.overallProgress}%</span>
                  </div>
                  <Progress value={student.overallProgress} className="h-3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Developmental Areas</CardTitle>
                <CardDescription>
                  Progress across key learning domains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {developmentalAreas.map(area => (
                    <div key={area.name} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{area.name}</h3>
                          <Badge variant="outline" className={`text-xs ${getCategoryColor(area.category)}`}>
                            {area.category}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold">
                          Level {area.level}/{area.maxLevel}
                        </span>
                      </div>
                      <Progress value={(area.level / area.maxLevel) * 100} />
                      <p className="text-sm text-muted-foreground">
                        {area.milestones.filter(m => m.achieved).length} of {area.milestones.length} milestones achieved
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{student.recentActivity}</p>
                    <p className="text-sm text-muted-foreground mt-1">Today at 10:30 AM</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-6">
            {developmentalAreas.map(area => (
              <Card key={area.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{area.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="outline" className={getCategoryColor(area.category)}>
                          {area.category}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">Level {area.level}</div>
                      <div className="text-sm text-muted-foreground">of {area.maxLevel}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {area.milestones.map(milestone => (
                      <div
                        key={milestone.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border ${
                          milestone.achieved ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="mt-0.5">
                          {milestone.achieved ? (
                            <Award className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${milestone.achieved ? 'text-green-900' : ''}`}>
                            {milestone.description}
                          </p>
                          {milestone.achieved && milestone.achievedDate && (
                            <p className="text-sm text-green-600 mt-1">
                              Achieved on {new Date(milestone.achievedDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={() => navigate(`/${user.role}/student/${studentId}/activities`)}
                  className="w-full"
                >
                  View All Learning Activities
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/${user.role}/student/${studentId}/activities`)}
          >
            View Learning Activities
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/${user.role}/student/${studentId}/progress`)}
          >
            Detailed Progress Report
          </Button>
        </div>
      </main>
    </div>
  );
}
