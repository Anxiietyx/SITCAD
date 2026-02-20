import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { mockStudents } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, Play, Pause, CheckCircle2, Users, Clock, Book, Calculator, Palette, Award } from 'lucide-react';
import { toast } from 'sonner';

const classroomActivities = [
  {
    id: 'ca1',
    title: 'Morning Circle Time',
    type: 'social',
    duration: 15,
    description: 'Greeting, calendar, weather, and sharing time',
    icon: Users,
  },
  {
    id: 'ca2',
    title: 'Letter of the Day',
    type: 'literacy',
    duration: 20,
    description: 'Interactive letter recognition and phonics',
    icon: Book,
  },
  {
    id: 'ca3',
    title: 'Counting & Numbers',
    type: 'numeracy',
    duration: 15,
    description: 'Hands-on counting with manipulatives',
    icon: Calculator,
  },
  {
    id: 'ca4',
    title: 'Creative Art Time',
    type: 'creative',
    duration: 25,
    description: 'Guided art project with fine motor focus',
    icon: Palette,
  },
];

export function ClassroomTeachingMode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeActivity, setActiveActivity] = useState<string | null>(null);
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [timer, setTimer] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const students = mockStudents;
  const presentStudents = students.slice(0, 4); // Mock attendance

  const startActivity = (activityId: string) => {
    setActiveActivity(activityId);
    setIsTimerRunning(true);
    setTimer(0);
    toast.success('Activity started!');
  };

  const pauseActivity = () => {
    setIsTimerRunning(false);
    toast.info('Activity paused');
  };

  const completeActivity = () => {
    if (activeActivity) {
      setCompletedActivities([...completedActivities, activeActivity]);
      setActiveActivity(null);
      setIsTimerRunning(false);
      setTimer(0);
      toast.success('Activity completed!');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/teacher')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Classroom Mode
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Classroom Teaching Mode</h1>
                <p className="text-sm text-muted-foreground">
                  Whole-class instruction and activity management
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Students Present</p>
              <p className="text-2xl font-semibold">{presentStudents.length}/{students.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Current Activity Display */}
        {activeActivity && (
          <Card className="border-4 border-blue-500 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="mb-2" variant="secondary">Currently Active</Badge>
                  <CardTitle className="text-2xl">
                    {classroomActivities.find(a => a.id === activeActivity)?.title}
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {classroomActivities.find(a => a.id === activeActivity)?.description}
                  </CardDescription>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {formatTime(timer)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Target: {classroomActivities.find(a => a.id === activeActivity)?.duration} min
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              {isTimerRunning ? (
                <Button onClick={pauseActivity} size="lg" variant="outline" className="flex-1">
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </Button>
              ) : (
                <Button onClick={() => setIsTimerRunning(true)} size="lg" variant="outline" className="flex-1">
                  <Play className="mr-2 h-5 w-5" />
                  Resume
                </Button>
              )}
              <Button onClick={completeActivity} size="lg" className="flex-1">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Complete Activity
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Progress</CardTitle>
            <CardDescription>
              {completedActivities.length} of {classroomActivities.length} activities completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={(completedActivities.length / classroomActivities.length) * 100} className="h-3" />
          </CardContent>
        </Card>

        {/* Activity List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classroomActivities.map((activity) => {
            const isCompleted = completedActivities.includes(activity.id);
            const isActive = activeActivity === activity.id;
            const Icon = activity.icon;

            return (
              <Card
                key={activity.id}
                className={`border-2 ${
                  isActive ? 'border-blue-500 bg-blue-50' : 
                  isCompleted ? 'border-green-500 bg-green-50' : 
                  'border-gray-200'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                      isCompleted ? 'bg-green-500' :
                      isActive ? 'bg-blue-500' : 
                      'bg-gray-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-8 w-8 text-white" />
                      ) : (
                        <Icon className={`h-8 w-8 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{activity.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {activity.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {activity.duration} min
                        </Badge>
                        {isCompleted && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!isCompleted && !isActive && (
                    <Button onClick={() => startActivity(activity.id)} className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Start Activity
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Present Students */}
        <Card>
          <CardHeader>
            <CardTitle>Students Present Today</CardTitle>
            <CardDescription>
              {presentStudents.length} students attending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {presentStudents.map((student) => (
                <div key={student.id} className="flex flex-col items-center p-4 border rounded-lg">
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-16 h-16 rounded-full object-cover mb-2"
                  />
                  <p className="text-sm font-medium text-center">{student.name}</p>
                  <Badge variant="secondary" className="mt-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Present
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex-col py-4">
              <Award className="h-6 w-6 mb-2" />
              <span className="text-sm">Award Stars</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Take Attendance</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Clock className="h-6 w-6 mb-2" />
              <span className="text-sm">Break Timer</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4">
              <Book className="h-6 w-6 mb-2" />
              <span className="text-sm">Story Time</span>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
