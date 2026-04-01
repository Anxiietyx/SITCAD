import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { ArrowLeft, Play, Pause, CheckCircle2, Users, Clock, Book, Calculator, Palette, Brain, Activity as ActivityIcon } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:8000';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return firebaseUser.getIdToken();
}

const areaIcons = {
  literacy: Book,
  numeracy: Calculator,
  creative: Palette,
  cognitive: Brain,
  social: Users,
  motor: ActivityIcon,
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function ClassroomTeachingMode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeActivityId, setActiveActivityId] = useState(null);
  const [activityPopupOpen, setActivityPopupOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedIds, setCompletedIds] = useState(new Set());

  const fetchActivities = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/classroom-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
        setCompletedIds(new Set(data.filter(a => a.status === 'completed').map(a => a.id)));
      }
    } catch (err) {
      console.error('Failed to fetch classroom activities:', err);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/teachers/my-students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) setStudents(await res.json());
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchActivities();
      fetchStudents();
    }
  }, [user, fetchActivities, fetchStudents]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const activeActivity = activities.find(a => a.id === activeActivityId);

  const startActivity = async (activityId) => {
    try {
      const idToken = await getIdToken();
      await fetch(`${API_BASE}/activities/${activityId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      setActiveActivityId(activityId);
      setIsTimerRunning(true);
      setTimer(0);
      setActivityPopupOpen(true);
      toast.success('Activity started!');
    } catch (err) {
      toast.error('Failed to start activity');
    }
  };

  const pauseActivity = () => {
    setIsTimerRunning(false);
    toast.info('Activity paused');
  };

  const completeActivity = async () => {
    if (!activeActivityId) return;
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/${activeActivityId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (!res.ok) throw new Error('Failed to complete');
      setCompletedIds(prev => new Set([...prev, activeActivityId]));
      setActiveActivityId(null);
      setIsTimerRunning(false);
      setTimer(0);
      setActivityPopupOpen(false);
      toast.success('Activity completed!');
      fetchActivities();
    } catch (err) {
      toast.error('Failed to complete activity');
    }
  };

  const completedCount = activities.filter(a => a.status === 'completed' || completedIds.has(a.id)).length;

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
                  Whole-class instruction and activity delivery
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-2xl font-semibold">{students.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Progress</CardTitle>
            <CardDescription>
              {completedCount} of {activities.length} activities completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={activities.length > 0 ? (completedCount / activities.length) * 100 : 0} className="h-3" />
          </CardContent>
        </Card>

        {/* Activity List */}
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No classroom activities found. Create activities assigned to "Whole Class" in Activity Management.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((activity) => {
              const isCompleted = activity.status === 'completed' || completedIds.has(activity.id);
              const isActive = activeActivityId === activity.id;
              const Icon = areaIcons[activity.learning_area] || Book;

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
                            {activity.duration_minutes} min
                          </Badge>
                          <Badge variant="outline" className="capitalize">{activity.learning_area}</Badge>
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
                    {isActive && (
                      <Button variant="outline" onClick={() => setActivityPopupOpen(true)} className="w-full">
                        Open Activity
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Students Present */}
        {students.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>{students.length} students in your classroom</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {students.map((student) => (
                  <div key={student.id} className="flex flex-col items-center p-4 border rounded-lg">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-600 mb-2">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
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
        )}
      </main>

      {/* Activity Delivery Popup */}
      <Dialog open={activityPopupOpen} onOpenChange={setActivityPopupOpen}>
        <DialogContent className="max-w-xl">
          {activeActivity && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{activeActivity.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">{activeActivity.learning_area}</Badge>
                  <Badge variant="secondary">In Progress</Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Timer */}
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {formatTime(timer)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Target: {activeActivity.duration_minutes} min
                  </p>
                </div>

                {/* Activity Description */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Activity Description</h3>
                  <p className="text-sm">{activeActivity.description}</p>
                </div>

                {/* Students Involved */}
                <div>
                  <h3 className="font-semibold mb-2">Students ({activeActivity.student_names?.length || 0})</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeActivity.student_names?.map((name, i) => (
                      <Badge key={i} variant="outline">{name}</Badge>
                    ))}
                  </div>
                </div>

                {/* Lesson Plan Reference */}
                {activeActivity.source === 'lesson_plan' && (
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-700">
                      This activity was created from a Lesson Plan.
                    </p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex gap-3">
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
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
