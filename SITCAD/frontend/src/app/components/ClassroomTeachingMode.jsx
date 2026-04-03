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
import { ArrowLeft, Play, Pause, CheckCircle2, Users, Clock, Book, Calculator, Palette, Brain, Activity as ActivityIcon, Trophy, RotateCcw, ChevronRight, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import Duckpit from './Duckpit';

const API_BASE = 'http://localhost:8000';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return firebaseUser.getIdToken();
}

const activityTypes = [
  { value: 'literacy',  label: 'Literacy',     icon: Book,         color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'numeracy',  label: 'Numeracy',     icon: Calculator,   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'social',    label: 'Social Skills',icon: Users,        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'motor',     label: 'Motor Skills', icon: ActivityIcon, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'creative',  label: 'Creative Arts',icon: Palette,      color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'cognitive', label: 'Cognitive',    icon: Brain,        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const abcQuizQuestions = [
  {
    question: 'Which letter comes after A?',
    hint: '🔤',
    options: ['C', 'B', 'D', 'E'],
    correctIndex: 1,
  },
  {
    question: 'What letter does "Cat" start with?',
    hint: '🐱',
    options: ['K', 'S', 'C', 'T'],
    correctIndex: 2,
  },
  {
    question: 'Which is a vowel?',
    hint: '🗣️',
    options: ['B', 'D', 'E', 'G'],
    correctIndex: 2,
  },
  {
    question: 'What letter does "Dog" start with?',
    hint: '🐶',
    options: ['B', 'D', 'G', 'P'],
    correctIndex: 1,
  },
  {
    question: 'Which letter comes before G?',
    hint: '🔡',
    options: ['E', 'H', 'F', 'D'],
    correctIndex: 2,
  },
  {
    question: 'What letter does "Fish" start with?',
    hint: '🐟',
    options: ['P', 'S', 'H', 'F'],
    correctIndex: 3,
  },
  {
    question: 'How many letters are in the alphabet?',
    hint: '🔢',
    options: ['24', '25', '26', '27'],
    correctIndex: 2,
  },
  {
    question: 'What is the last letter of the alphabet?',
    hint: '🏁',
    options: ['X', 'Y', 'W', 'Z'],
    correctIndex: 3,
  },
];

const optionColors = [
  'bg-emerald-500 hover:bg-emerald-600',
  'bg-teal-500 hover:bg-teal-600',
  'bg-green-500 hover:bg-green-600',
  'bg-lime-600 hover:bg-lime-700',
];

const optionShapes = ['▲', '◆', '●', '■'];

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

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(15);
  const [streak, setStreak] = useState(0);

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

  // Question countdown timer
  useEffect(() => {
    let interval = null;
    if (quizStarted && !showResult && !quizFinished && questionTimer > 0) {
      interval = setInterval(() => {
        setQuestionTimer(prev => {
          if (prev <= 1) {
            // Time's up — treat as wrong answer
            setSelectedAnswer(-1);
            setShowResult(true);
            setStreak(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, showResult, quizFinished, questionTimer]);

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

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
    setQuestionTimer(15);
    setStreak(0);
  };

  const handleAnswer = (index) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    const q = abcQuizQuestions[currentQuestion];
    if (index === q.correctIndex) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion + 1 >= abcQuizQuestions.length) {
      setQuizFinished(true);
    } else {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionTimer(15);
    }
  };

  const completeActivity = async () => {
    if (!activeActivityId) return;
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/${activeActivityId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken,
          quiz_score: quizStarted ? score : undefined,
          quiz_total: quizStarted ? abcQuizQuestions.length : undefined,
          quiz_time_seconds: quizStarted ? timer : undefined,
        }),
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
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Classroom Teaching Mode</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Whole-class instruction and activity delivery
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/teacher')} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
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
              const activityType = activityTypes.find(t => t.value === activity.learning_area);
              const Icon = activityType?.icon || Book;

              return (
                <Card
                  key={activity.id}
                  className={`border-2 ${
                    isActive ? 'border-blue-400 bg-blue-50' :
                    isCompleted ? 'border-green-400 bg-green-50' :
                    'border-gray-200'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' :
                        isActive ? 'bg-blue-500' :
                        activityType?.color || 'bg-gray-100'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-8 w-8 text-white" />
                        ) : (
                          <Icon className={`h-8 w-8 ${isActive ? 'text-white' : 'text-emerald-700'}`} />
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
                          <Badge variant="outline" className={activityType?.color}>
                            {activityType?.label || activity.learning_area}
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
                      <Button onClick={() => startActivity(activity.id)} className="w-full cursor-pointer">
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

      {/* Activity Delivery Popup — Kahoot-style Quiz */}
      <Dialog open={activityPopupOpen} onOpenChange={(open) => { setActivityPopupOpen(open); if (!open) resetQuiz(); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
          {activeActivity && (
            <>
              {/* Header bar */}
              <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <DialogHeader className="p-0">
                    <DialogTitle className="text-xl font-bold text-white">{activeActivity.title}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge className="bg-white/20 text-white border-white/30 text-xs">
                        {activeActivity.learning_area}
                      </Badge>
                      <Badge className="bg-white/20 text-white border-white/30 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(timer)}
                      </Badge>
                    </DialogDescription>
                  </DialogHeader>
                </div>
                {quizStarted && !quizFinished && (
                  <div className="flex items-center gap-3">
                    {streak >= 2 && (
                      <Badge className="bg-yellow-400 text-yellow-900 border-yellow-500 animate-pulse">
                        <Star className="h-3 w-3 mr-1" />
                        {streak} streak!
                      </Badge>
                    )}
                    <div className="text-white text-sm font-semibold">
                      Score: {score}/{abcQuizQuestions.length}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Pre-quiz: lobby screen */}
                {!quizStarted && !quizFinished && (
                  <div className="text-center space-y-6 py-6">
                    <div className="w-24 h-24 mx-auto bg-[#bafde0] rounded-2xl flex items-center justify-center">
                      <Book className="h-12 w-12 text-emerald-700" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800">Know Your ABC!</h2>
                      <p className="text-muted-foreground mt-2">
                        {abcQuizQuestions.length} questions &bull; 15 seconds each
                      </p>
                    </div>

                    {/* Students Involved */}
                    {activeActivity.student_names?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          {activeActivity.student_names.length} students participating
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {activeActivity.student_names.map((name, i) => (
                            <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      size="lg"
                      onClick={() => { setQuizStarted(true); setQuestionTimer(15); }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-10 py-6"
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Start Quiz
                    </Button>
                  </div>
                )}

                {/* Active quiz question */}
                {quizStarted && !quizFinished && (() => {
                  const q = abcQuizQuestions[currentQuestion];
                  const isCorrect = selectedAnswer === q.correctIndex;
                  return (
                    <div className="space-y-5">
                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {currentQuestion + 1} / {abcQuizQuestions.length}
                        </span>
                        <Progress
                          value={((currentQuestion + 1) / abcQuizQuestions.length) * 100}
                          className="h-2 flex-1"
                        />
                      </div>

                      {/* Question countdown */}
                      <div className="flex justify-center">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 ${
                          questionTimer <= 5
                            ? 'border-red-400 text-red-600 bg-red-50'
                            : 'border-emerald-400 text-emerald-700 bg-emerald-50'
                        }`}>
                          {questionTimer}
                        </div>
                      </div>

                      {/* Question */}
                      <div className="text-center space-y-2">
                        <div className="text-4xl">{q.hint}</div>
                        <h3 className="text-xl font-bold text-gray-800">{q.question}</h3>
                      </div>

                      {/* Answer options — 2x2 grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {q.options.map((option, idx) => {
                          let btnClass = `${optionColors[idx]} text-white`;
                          if (showResult) {
                            if (idx === q.correctIndex) {
                              btnClass = 'bg-emerald-600 text-white ring-4 ring-emerald-300';
                            } else if (idx === selectedAnswer && idx !== q.correctIndex) {
                              btnClass = 'bg-red-500 text-white opacity-80';
                            } else {
                              btnClass = 'bg-gray-300 text-gray-500';
                            }
                          }
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAnswer(idx)}
                              disabled={showResult}
                              className={`relative flex items-center justify-center gap-3 rounded-xl py-5 px-4 text-lg font-bold transition-all duration-200 cursor-pointer
                                ${showResult ? '' : 'active:scale-95'} ${btnClass}`}
                            >
                              <span className="text-white/60 text-sm">{optionShapes[idx]}</span>
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Feedback + Next */}
                      {showResult && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className={`text-center py-3 rounded-lg font-semibold text-lg ${
                            selectedAnswer === -1
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              : isCorrect
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {selectedAnswer === -1
                              ? "⏰ Time's up!"
                              : isCorrect
                                ? '🎉 Correct! Great job!'
                                : `❌ Oops! The answer is "${q.options[q.correctIndex]}"`}
                          </div>
                          <Button
                            onClick={nextQuestion}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            size="lg"
                          >
                            {currentQuestion + 1 >= abcQuizQuestions.length ? (
                              <><Trophy className="mr-2 h-5 w-5" /> See Results</>
                            ) : (
                              <><ChevronRight className="mr-2 h-5 w-5" /> Next Question</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Quiz finished — results screen */}
                {quizFinished && (
                  <div className="text-center space-y-6 py-4">
                    <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800">Quiz Complete!</h2>
                      <p className="text-muted-foreground mt-1">Know Your ABC — Results</p>
                    </div>

                    <div className="inline-flex items-baseline gap-1">
                      <span className="text-6xl font-black text-emerald-600">{score}</span>
                      <span className="text-2xl text-muted-foreground font-semibold">/ {abcQuizQuestions.length}</span>
                    </div>

                    {/* Star rating */}
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: abcQuizQuestions.length }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-6 w-6 ${
                            i < score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-lg font-medium text-gray-600">
                      {score === abcQuizQuestions.length
                        ? '🌟 Perfect score! Amazing!'
                        : score >= abcQuizQuestions.length * 0.7
                          ? '👏 Great job! Keep it up!'
                          : score >= abcQuizQuestions.length * 0.4
                            ? '💪 Good effort! Practice makes perfect!'
                            : '📚 Let\'s try again and learn more!'}
                    </p>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={resetQuiz}
                        className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        size="lg"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Play Again
                      </Button>
                      <Button
                        onClick={() => { completeActivity(); resetQuiz(); }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="lg"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Finish Activity
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
