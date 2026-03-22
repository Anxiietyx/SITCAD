
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
  const [activeActivity, setActiveActivity] = useState(null);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prevTime => prevTime + 1);
      }, 1000);
    } else if (!isTimerRunning && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const students = mockStudents;
  const presentStudents = students.slice(0, 4); // Mock attendance

  const startActivity = (activityId) => {
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
  
    // placeholder return so the component compiles; replace with real JSX later
    return (
      <div className="classroom-teaching-mode">
        {/* TODO: render activities, students, timer, controls */}
      </div>
    );
  }
