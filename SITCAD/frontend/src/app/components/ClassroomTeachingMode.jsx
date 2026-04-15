import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import Duckpit from './Duckpit';
import {
  ArrowLeft, Play, CheckCircle2, Users, Clock, Book, Calculator, Palette, Brain,
  Activity as ActivityIcon, Trophy, RotateCcw, ChevronRight, ChevronLeft, Star,
  Image, BookOpen, HelpCircle, Loader2, Sparkles, AlertCircle, RefreshCw, X,
} from 'lucide-react';
import { toast } from 'sonner';

import { API_BASE } from '../lib/api';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return firebaseUser.getIdToken();
}

const LEARNING_AREA_META = {
  literacy_bm:  { label: 'Literasi BM',    icon: Book,         color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  literacy_en:  { label: 'Literacy EN',     icon: Book,         color: 'bg-sky-100 text-sky-700 border-sky-200' },
  numeracy:     { label: 'Numeracy',        icon: Calculator,   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  social:       { label: 'Social Skills',   icon: Users,        color: 'bg-violet-100 text-violet-700 border-violet-200' },
  motor:        { label: 'Motor Skills',    icon: ActivityIcon, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  creative:     { label: 'Creative Arts',   icon: Palette,      color: 'bg-pink-100 text-pink-700 border-pink-200' },
  cognitive:    { label: 'Cognitive',        icon: Brain,        color: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const ACTIVITY_TYPE_META = {
  quiz:  { label: 'Quiz',        icon: HelpCircle, color: 'bg-blue-100 text-blue-700 border-blue-200',   activeCard: 'border-blue-400 bg-blue-50/50',   activeIcon: 'bg-blue-600' },
  image: { label: 'Flashcards',  icon: Image,      color: 'bg-orange-100 text-orange-700 border-orange-200', activeCard: 'border-orange-400 bg-orange-50/50', activeIcon: 'bg-orange-500' },
  story: { label: 'Text Story',  icon: BookOpen,   color: 'bg-purple-100 text-purple-700 border-purple-200', activeCard: 'border-purple-400 bg-purple-50/50', activeIcon: 'bg-purple-600' },
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const optionColors = [
  'bg-emerald-500 hover:bg-emerald-600',
  'bg-teal-500 hover:bg-teal-600',
  'bg-green-500 hover:bg-green-600',
  'bg-lime-600 hover:bg-lime-700',
];
const optionShapes = ['▲', '◆', '●', '■'];

const CONTENT_FONT = { fontFamily: "'Comic Neue', 'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive" };

// ─── Quiz Delivery ───────────────────────────────────────────────────

function QuizDelivery({ activity, onComplete }) {
  const content = activity.generated_content;
  const questions = content?.questions || [];
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [qTimer, setQTimer] = useState(15);
  const [streak, setStreak] = useState(0);
  const [firstCorrectCount, setFirstCorrectCount] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const qStartRef = useRef(null);
  const attemptsRef = useRef({});

  const currentQIdx = queue[0];
  const currentQ = currentQIdx != null ? questions[currentQIdx] : null;
  const isRetry = currentQIdx != null && attemptsRef.current[currentQIdx]?.attempts > 0;

  // Per-question countdown
  useEffect(() => {
    if (!started || showResult || finished || queue.length === 0) return;
    timerRef.current = setInterval(() => {
      setQTimer(prev => {
        if (prev <= 1) {
          setSelected(-1);
          setShowResult(true);
          setStreak(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, showResult, finished, queue]);

  const handleStart = () => {
    const initialQueue = questions.map((_, i) => i);
    setQueue(initialQueue);
    const map = {};
    questions.forEach((_, i) => {
      map[i] = { attempts: 0, first_correct: false, wrong_answers: [], time_seconds: 0 };
    });
    attemptsRef.current = map;
    setFirstCorrectCount(0);
    setStarted(true);
    startTimeRef.current = Date.now();
    qStartRef.current = Date.now();
    setQTimer(15);
  };

  const handleAnswer = (idx) => {
    if (showResult) return;
    clearInterval(timerRef.current);
    setSelected(idx);
    setShowResult(true);
    const isCorrect = idx === currentQ.correct_answer;
    if (isCorrect) {
      setStreak(prev => prev + 1);
      if (attemptsRef.current[currentQIdx].attempts === 0) {
        setFirstCorrectCount(prev => prev + 1);
      }
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    const qIdx = queue[0];
    const isCorrect = selected !== -1 && selected === questions[qIdx].correct_answer;
    const elapsed = Math.round((Date.now() - qStartRef.current) / 1000);
    const track = attemptsRef.current[qIdx];
    track.attempts += 1;
    track.time_seconds += elapsed;

    if (isCorrect) {
      if (track.attempts === 1) track.first_correct = true;
      const newQueue = queue.slice(1);
      if (newQueue.length === 0) {
        setFinished(true);
      } else {
        setQueue(newQueue);
      }
    } else {
      track.wrong_answers.push(selected);
      setQueue([...queue.slice(1), qIdx]);
    }

    setSelected(null);
    setShowResult(false);
    setQTimer(15);
    qStartRef.current = Date.now();
  };

  const handleFinish = () => {
    const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    const perQuestion = questions.map((_, i) => ({
      question_index: i,
      attempts: attemptsRef.current[i].attempts,
      first_attempt_correct: attemptsRef.current[i].first_correct,
      wrong_answers: attemptsRef.current[i].wrong_answers,
      time_seconds: attemptsRef.current[i].time_seconds,
    }));
    onComplete({
      activity_type: 'quiz',
      first_attempt_correct: firstCorrectCount,
      total: questions.length,
      time_seconds: totalTime,
      per_question: perQuestion,
    });
  };

  const handleRestart = () => {
    setStarted(false);
    setQueue([]);
    setSelected(null);
    setShowResult(false);
    setFinished(false);
    setQTimer(15);
    setStreak(0);
    setFirstCorrectCount(0);
    attemptsRef.current = {};
  };

  if (questions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No quiz content available.</p>;
  }

  // Lobby
  if (!started) {
    return (
      <div className="text-center space-y-10 py-12">
        <div className="w-32 h-32 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center">
          <HelpCircle className="h-20 w-20 text-blue-700" />
        </div>
        <div>
          <h2 className="text-5xl font-black text-gray-800 mb-2" style={CONTENT_FONT}>{activity.title}</h2>
          {activity.lesson_plan_title && (
            <p className="text-xl text-muted-foreground mt-2" style={CONTENT_FONT}>From: {activity.lesson_plan_title}</p>
          )}
          <p className="text-2xl text-muted-foreground mt-4" style={CONTENT_FONT}>{questions.length} questions &bull; 15 seconds each</p>
        </div>
        {activity.students?.length > 0 && (
          <div>
            <p className="text-lg font-medium text-muted-foreground mb-4" style={CONTENT_FONT}>{activity.students.length} students participating</p>
            <div className="flex flex-wrap justify-center gap-5">
              {activity.students.map((student) => (
                <div key={student.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-base text-muted-foreground mt-2" style={CONTENT_FONT}>{student.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <Button size="lg" onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-white text-2xl px-14 py-7 cursor-pointer comic-delivery">
          <Play className="mr-3 h-6 w-6" /> Start Quiz
        </Button>
      </div>
    );
  }

  // Results
  if (finished) {
    const retriedQuestions = questions
      .map((q, i) => ({ ...q, idx: i, track: attemptsRef.current[i] }))
      .filter(q => !q.track.first_correct);

    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
          <Trophy className="h-10 w-10 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Quiz Complete!</h2>
        <div>
          <p className="text-base text-semibold mb-1">Correct on first try</p>
          <div className="inline-flex items-baseline gap-1">
            <span className="text-6xl font-black text-blue-600">{firstCorrectCount}</span>
            <span className="text-2xl text-muted-foreground font-semibold">/ {questions.length}</span>
          </div>
        </div>
        <div className="flex justify-center gap-1">
          {questions.map((_, i) => (
            <Star key={i} className={`h-6 w-6 ${attemptsRef.current[i]?.first_correct ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
          ))}
        </div>
        {retriedQuestions.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 text-left max-w-sm mx-auto border border-blue-100 space-y-2">
            <p className="text-sm font-semibold text-blue-800">Needed extra practice</p>
            {retriedQuestions.map(q => (
              <div key={q.idx} className="flex items-center justify-between text-sm">
                <span className="text-blue-700 truncate mr-2">Q{q.idx + 1}</span>
                <Badge variant="outline" className="text-xs bg-white shrink-0">
                  {q.track.attempts} {q.track.attempts === 1 ? 'attempt' : 'attempts'}
                </Badge>
              </div>
            ))}
          </div>
        )}
        <p className="text-lg font-medium text-gray-600">
          {firstCorrectCount === questions.length ? '🌟 Perfect! All correct on the first try!'
           : firstCorrectCount >= questions.length * 0.7 ? '👏 Great job! You got most on the first try!'
           : firstCorrectCount >= questions.length * 0.4 ? '💪 Good effort! Practice makes perfect!'
           : '📚 Keep learning! You got them all in the end!'}
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleRestart} className="text-lg font-mediumn flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer" size="lg">
            <RotateCcw className="mr-2 h-4 w-4" /> Play Again
          </Button>
          <Button onClick={handleFinish} className=" text-lg font-medium flex-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" size="lg">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Finish Activity
          </Button>
        </div>
      </div>
    );
  }

  // Active question
  const completedCount = questions.length - queue.length;
  const isCorrectAnswer = selected !== null && selected !== -1 && selected === currentQ.correct_answer;
  const isLastAndCorrect = showResult && isCorrectAnswer && queue.length === 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold text-muted-foreground whitespace-nowrap">{completedCount} / {questions.length}</span>
        <Progress value={(completedCount / questions.length) * 100} className="h-3 flex-1" />
        {streak >= 2 && (
          <Badge className="bg-yellow-400 text-yellow-900 border-yellow-500 animate-pulse">
            <Star className="h-3 w-3 mr-1" />{streak} streak!
          </Badge>
        )}
        <span className="text-sm font-semibold text-muted-foreground">
          First try: {firstCorrectCount}/{questions.length}
        </span>
      </div>

      {isRetry && (
        <div className="text-center">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <RotateCcw className="h-3 w-3 mr-1" /> Let&apos;s try this one again!
          </Badge>
        </div>
      )}

      <div className="flex justify-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 ${
          qTimer <= 5 ? 'border-red-400 text-red-600 bg-red-50' : 'border-blue-400 text-blue-700 bg-blue-50'
        }`}>{qTimer}</div>
      </div>

      {/* Quiz question image */}
      {currentQ.image_url && (
        <div className="flex justify-center">
          <img
            src={currentQ.image_url}
            alt="Question illustration"
            className="max-h-72 rounded-xl object-contain border-2 border-blue-100 shadow-sm"
          />
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-800 text-center" style={CONTENT_FONT}>{currentQ.question}</h3>

      <div className="grid grid-cols-2 gap-3">
        {currentQ.options.map((option, idx) => {
          let btnClass = `${optionColors[idx]} text-white`;
          if (showResult) {
            if (idx === currentQ.correct_answer) btnClass = 'bg-emerald-600 text-white ring-4 ring-emerald-300';
            else if (idx === selected && idx !== currentQ.correct_answer) btnClass = 'bg-red-500 text-white opacity-80';
            else btnClass = 'bg-gray-300 text-gray-500';
          }
          return (
            <button key={idx} onClick={() => handleAnswer(idx)} disabled={showResult}
              className={`relative flex items-center justify-center gap-3 rounded-xl py-5 px-4 text-lg font-bold transition-all duration-200 cursor-pointer ${showResult ? '' : 'active:scale-95'} ${btnClass}`}
              style={CONTENT_FONT}>
              <span className="text-white/60 text-sm">{optionShapes[idx]}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className={`text-center py-3 rounded-lg font-semibold text-lg ${
            selected === -1 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : isCorrectAnswer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {selected === -1 ? "⏰ Time's up! You'll see this one again."
             : isCorrectAnswer ? '🎉 Correct! Great job!'
             : `❌ Not quite! The answer is "${currentQ.options[currentQ.correct_answer]}". You'll see this again.`}
          </div>
          {currentQ.explanation && <p className="text-sm text-muted-foreground text-center italic" style={CONTENT_FONT}>{currentQ.explanation}</p>}
          <Button onClick={nextQuestion} className="text-base font-medium w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer" size="lg">
            {isLastAndCorrect
              ? <><Trophy className="mr-2 h-5 w-5" /> See Results</>
              : <><ChevronRight className="mr-2 h-5 w-5" /> Next Question</>}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Image Flashcard Delivery ────────────────────────────────────────

function ImageDelivery({ activity, onComplete }) {
  const content = activity.generated_content;
  const cards = content?.images || [];
  const [started, setStarted] = useState(false);
  const [cardIdx, setCardIdx] = useState(0);
  const [showPoint, setShowPoint] = useState(false);
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef(null);
  const cardStartRef = useRef(null);
  const perCardRef = useRef([]);

  const handleStart = () => {
    setStarted(true);
    startTimeRef.current = Date.now();
    cardStartRef.current = Date.now();
  };

  const recordCardTime = () => {
    perCardRef.current[cardIdx] = {
      card_index: cardIdx,
      time_seconds: Math.round((Date.now() - cardStartRef.current) / 1000),
    };
  };

  const goNext = () => {
    recordCardTime();
    if (cardIdx + 1 >= cards.length) {
      setFinished(true);
    } else {
      setCardIdx(prev => prev + 1);
      setShowPoint(false);
      cardStartRef.current = Date.now();
    }
  };

  const goPrev = () => {
    recordCardTime();
    setCardIdx(prev => Math.max(0, prev - 1));
    setShowPoint(false);
    cardStartRef.current = Date.now();
  };

  const handleFinish = () => {
    const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    onComplete({
      activity_type: 'image',
      cards_viewed: cards.length,
      total_cards: cards.length,
      time_seconds: totalTime,
      per_card: perCardRef.current,
    });
  };

  if (cards.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No flashcard content available.</p>;
  }

  // Lobby
  if (!started) {
    return (
      <div className="text-center space-y-10 py-12">
        <div className="w-32 h-32 mx-auto bg-orange-100 rounded-2xl flex items-center justify-center">
          <Image className="h-20 w-20 text-orange-700" />
        </div>
        <div>
          <h2 className="text-5xl font-black text-gray-800 mb-2" style={CONTENT_FONT}>{activity.title}</h2>
          {activity.lesson_plan_title && (
            <p className="text-xl text-muted-foreground mt-2" style={CONTENT_FONT}>From: {activity.lesson_plan_title}</p>
          )}
          <p className="text-2xl text-muted-foreground mt-4" style={CONTENT_FONT}>{cards.length} flashcards to explore</p>
        </div>
        {activity.students?.length > 0 && (
          <div>
            <p className="text-lg font-medium text-muted-foreground mb-4" style={CONTENT_FONT}>{activity.students.length} students participating</p>
            <div className="flex flex-wrap justify-center gap-5">
              {activity.students.map((student) => (
                <div key={student.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-base text-muted-foreground mt-2" style={CONTENT_FONT}>{student.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <Button size="lg" onClick={handleStart} className="bg-orange-500 hover:bg-orange-600 text-white text-2xl px-14 py-7 cursor-pointer comic-delivery">
          <Play className="mr-3 h-6 w-6" /> Start Flashcards
        </Button>
      </div>
    );
  }

  // Finished
  if (finished) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-orange-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">All Flashcards Viewed!</h2>
        <p className="text-2xl text-semibold">{cards.length} cards completed</p>
        <Button onClick={handleFinish} className="text-lg font-medium bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" size="lg">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Finish Activity
        </Button>
      </div>
    );
  }

  // Active card
  const card = cards[cardIdx];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold text-muted-foreground whitespace-nowrap">{cardIdx + 1} / {cards.length}</span>
        <Progress value={((cardIdx + 1) / cards.length) * 100} className="h-3 flex-1" />
      </div>

      <div className="flex flex-col items-center">
        {(card.image_url || card.image_b64) ? (
          <img
            src={card.image_url || `data:image/png;base64,${card.image_b64}`}
            alt={card.label}
            className="w-full max-w-sm rounded-xl shadow-lg aspect-square object-cover"
          />
        ) : (
          <div className="w-full max-w-sm aspect-square bg-orange-50 rounded-xl flex items-center justify-center border-2 border-dashed border-orange-200">
            <p className="text-orange-400 italic">Image unavailable</p>
          </div>
        )}

        <h3 style={{ fontFamily: "'Comic Neue', 'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive", fontSize: '3rem', fontWeight: 'bold', color: '#1f2937', marginTop: '1rem', textAlign: 'center', transform: 'scale(1.2)' }}>{card.label}</h3>

        {!showPoint && card.learning_point && (
          <Button variant="outline" onClick={() => setShowPoint(true)}
            className="mt-3 text-base font-semibold border-orange-200 text-orange-700 hover:bg-orange-50 cursor-pointer">
            Reveal Learning Point
          </Button>
        )}
        {showPoint && card.learning_point && (
          <p className="mt-3 text-2xl font-semibold text-gray-600 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200 max-w-sm text-center animate-in fade-in duration-300" style={CONTENT_FONT}>
            {card.learning_point}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={goPrev} disabled={cardIdx === 0} className="flex-1 cursor-pointer text-base font-medium">
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button onClick={goNext} className="text-base flex-1 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer font-medium">
          {cardIdx + 1 >= cards.length
            ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Finish</>
            : <><ChevronRight className="mr-2 h-4 w-4" /> Next Card</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Story Delivery ──────────────────────────────────────────────────

function StoryDelivery({ activity, onComplete }) {
  const content = activity.generated_content;
  const pages = content?.pages || [];
  const [started, setStarted] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef(null);
  const pageStartRef = useRef(null);
  const perPageRef = useRef([]);

  const handleStart = () => {
    setStarted(true);
    startTimeRef.current = Date.now();
    pageStartRef.current = Date.now();
  };

  const recordPageTime = () => {
    perPageRef.current[pageIdx] = {
      page_number: pages[pageIdx]?.page_number ?? pageIdx + 1,
      time_seconds: Math.round((Date.now() - pageStartRef.current) / 1000),
    };
  };

  const goNext = () => {
    recordPageTime();
    if (pageIdx + 1 >= pages.length) {
      setFinished(true);
    } else {
      setPageIdx(prev => prev + 1);
      pageStartRef.current = Date.now();
    }
  };

  const goPrev = () => {
    recordPageTime();
    setPageIdx(prev => Math.max(0, prev - 1));
    pageStartRef.current = Date.now();
  };

  const handleFinish = () => {
    const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    onComplete({
      activity_type: 'story',
      pages_read: pages.length,
      total_pages: pages.length,
      time_seconds: totalTime,
      per_page: perPageRef.current,
      completed: true,
    });
  };

  if (pages.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No story content available.</p>;
  }

  // Lobby
  if (!started) {
    return (
      <div className="text-center space-y-10 py-12">
        <div className="w-32 h-32 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center">
          <BookOpen className="h-20 w-20 text-purple-700" />
        </div>
        <div>
          <h2 className="text-5xl font-black text-gray-800 mb-2" style={CONTENT_FONT}>{content.story_title || activity.title}</h2>
          {activity.lesson_plan_title && (
            <p className="text-xl text-muted-foreground mt-2" style={CONTENT_FONT}>From: {activity.lesson_plan_title}</p>
          )}
          <p className="text-2xl text-muted-foreground mt-4" style={CONTENT_FONT}>{pages.length} pages</p>
        </div>
        {activity.students?.length > 0 && (
          <div>
            <p className="text-lg font-medium text-muted-foreground mb-4" style={CONTENT_FONT}>{activity.students.length} students participating</p>
            <div className="flex flex-wrap justify-center gap-5">
              {activity.students.map((student) => (
                <div key={student.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-base text-muted-foreground mt-2" style={CONTENT_FONT}>{student.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <Button size="lg" onClick={handleStart} className="bg-purple-600 hover:bg-purple-700 text-white text-2xl px-14 py-7 cursor-pointer comic-delivery">
          <Play className="mr-3 h-6 w-6" /> Start Reading
        </Button>
      </div>
    );
  }

  // Finished — show vocabulary + moral + finish button
  if (finished) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Story Complete!</h2>
        </div>

        {content.vocabulary?.length > 0 && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm font-semibold text-purple-800 mb-3">Vocabulary</p>
            <div className="space-y-2">
              {content.vocabulary.map((v, i) => (
                <div key={i} className="flex gap-2 items-baseline">
                  <Badge variant="outline" className="bg-white shrink-0" style={CONTENT_FONT}>{v.word}</Badge>
                  <span className="text-sm text-gray-600" style={CONTENT_FONT}>{v.definition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.moral && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
            <p className="text-sm font-semibold text-purple-800 mb-1">Moral of the Story</p>
            <p className="text-gray-700 italic" style={CONTENT_FONT}>{content.moral}</p>
          </div>
        )}

        <Button onClick={handleFinish} className="w-full bg-purple-600 hover:bg-purple-700 text-white cursor-pointer" size="lg">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Finish Activity
        </Button>
      </div>
    );
  }

  // Active page
  const page = pages[pageIdx];

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-4">
        <span className="text-base font-semibold text-muted-foreground whitespace-nowrap" style={CONTENT_FONT}>Page {pageIdx + 1} / {pages.length}</span>
        <Progress value={((pageIdx + 1) / pages.length) * 100} className="h-3 flex-1" />
      </div>

      <div className="flex flex-col items-center">
        {(page.image_url || page.image_b64) ? (
          <img
            src={page.image_url || `data:image/png;base64,${page.image_b64}`}
            alt={`Page ${page.page_number}`}
            className="w-full max-w-md rounded-xl shadow-lg aspect-square object-cover"
          />
        ) : (
          <div className="w-full max-w-md aspect-square bg-purple-50 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-200">
            <p className="text-purple-400 italic">Image unavailable</p>
          </div>
        )}

        <div className="mt-6 px-2 max-w-2xl">
          <p className="text-3xl text-gray-800 leading-relaxed text-center" style={CONTENT_FONT}>{page.text}</p>
        </div>
      </div>

      <div className="flex gap-5 mt-2">
        <Button variant="outline" onClick={goPrev} disabled={pageIdx === 0} className="flex-1 text-xl py-6 cursor-pointer comic-delivery">
          <ChevronLeft className="mr-3 h-5 w-5" /> Previous
        </Button>
        <Button onClick={goNext} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xl py-6 cursor-pointer comic-delivery">
          {pageIdx + 1 >= pages.length
            ? <><CheckCircle2 className="mr-3 h-5 w-5" /> Finish Story</>
            : <><ChevronRight className="mr-3 h-5 w-5" /> Next</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function ClassroomTeachingMode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [activeActivityId, setActiveActivityId] = useState(null);
  const [activityPopupOpen, setActivityPopupOpen] = useState(false);
  const [deliveryClosing, setDeliveryClosing] = useState(false);
  const [completedIds, setCompletedIds] = useState(new Set());

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
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
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
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
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchActivities();
      fetchStudents();
    }
  }, [user?.id, fetchActivities, fetchStudents]);

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
      setActivityPopupOpen(true);
      toast.success('Activity started!');
    } catch (err) {
      toast.error('Failed to start activity');
    }
  };

  const completeActivity = async (resultsData) => {
    if (!activeActivityId) return;
    try {
      const idToken = await getIdToken();
      const body = {
        id_token: idToken,
        results_data: resultsData,
      };
      // Also set legacy quiz fields for backward compatibility
      if (resultsData.activity_type === 'quiz') {
        body.quiz_score = resultsData.first_attempt_correct;
        body.quiz_total = resultsData.total;
        body.quiz_time_seconds = resultsData.time_seconds;
      }
      const res = await fetch(`${API_BASE}/activities/${activeActivityId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to complete');
      const completedId = activeActivityId;
      setCompletedIds(prev => new Set([...prev, completedId]));
      setActiveActivityId(null);
      setActivityPopupOpen(false);
      toast.success('Activity completed! Analysing the results…');
      fetchActivities();
      // Fire-and-forget AI analysis
      fetch(`${API_BASE}/ai-integrations/analyze-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, activity_id: completedId }),
      }).then(() => {
        // Poll for completion after a delay
        setTimeout(() => fetchActivities(), 12000);
        setTimeout(() => fetchActivities(), 25000);
      }).catch(() => {
        // Silently fail — user can re-run from card
      });
    } catch (err) {
      toast.error('Failed to complete activity');
    }
  };

  const completedCount = activities.filter(a => a.status === 'completed' || completedIds.has(a.id)).length;

  const renderDelivery = () => {
    if (!activeActivity) return null;
    const type = activeActivity.activity_type;
    if (type === 'quiz') return <QuizDelivery activity={activeActivity} onComplete={completeActivity} />;
    if (type === 'image') return <ImageDelivery activity={activeActivity} onComplete={completeActivity} />;
    if (type === 'story') return <StoryDelivery activity={activeActivity} onComplete={completeActivity} />;
    return <p className="text-center text-muted-foreground py-8">Unknown activity type.</p>;
  };

  const headerColor = activeActivity
    ? activeActivity.activity_type === 'quiz' ? 'bg-blue-600'
    : activeActivity.activity_type === 'image' ? 'bg-orange-500'
    : activeActivity.activity_type === 'story' ? 'bg-purple-600'
    : 'bg-emerald-600'
    : 'bg-emerald-600';

  return (
    <div className="relative min-h-screen overflow-hidden print:min-h-0">
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-emerald-50/72" />
    <div className="relative z-10">
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <Users className="w-8 h-8 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Classroom Teaching Mode</h1>
                <p className="text-sm text-muted-foreground mt-1">Whole-class instruction and activity delivery</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/teacher')} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 min-h-[80vh] space-y-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Progress</CardTitle>
            <CardDescription>{completedCount} of {activities.length} activities completed</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={activities.length > 0 ? (completedCount / activities.length) * 100 : 0} className="h-3" />
          </CardContent>
        </Card>

        {/* Activity List */}
        {loadingActivities ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-5 border-2 rounded-xl space-y-3 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-16 bg-gray-100 rounded-full" />
                      <div className="h-5 w-20 bg-gray-100 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="h-9 bg-gray-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-14 text-center">
              <p className="text-muted-foreground">No activities found. Create activities in Activities first.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((activity) => {
              const isCompleted = activity.status === 'completed' || completedIds.has(activity.id);
              const isActive = activeActivityId === activity.id;
              const areaMeta = LEARNING_AREA_META[activity.learning_area] || LEARNING_AREA_META.cognitive;
              const typeMeta = ACTIVITY_TYPE_META[activity.activity_type] || ACTIVITY_TYPE_META.quiz;
              const AreaIcon = areaMeta.icon;
              const TypeIcon = typeMeta.icon;

              return (
                <Card key={activity.id} className={`border-2 transition-colors ${
                  isActive ? typeMeta.activeCard :
                  isCompleted ? 'border-gray-400 bg-gray-100' :
                  'border-gray-200 hover:border-gray-300'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        isCompleted ? 'bg-green-500' :
                        isActive ? typeMeta.activeIcon :
                        typeMeta.color
                      }`}>
                        {isCompleted
                          ? <CheckCircle2 className="h-6 w-6 text-white" />
                          : <TypeIcon className={`h-6 w-6 ${isActive ? 'text-white' : ''}`} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{activity.title}</CardTitle>
                        {activity.lesson_plan_title && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            From: {activity.lesson_plan_title}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Badge variant="outline" className={typeMeta.color + ' text-xs'}>
                            <TypeIcon className="h-3 w-3 mr-1" />{typeMeta.label}
                          </Badge>
                          <Badge variant="outline" className={areaMeta.color + ' text-xs'}>
                            <AreaIcon className="h-3 w-3 mr-1" />{areaMeta.label}
                          </Badge>
                          {activity.duration_minutes && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />{activity.duration_minutes} min
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Completed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* AI Analysis Status */}
                    {isCompleted && activity.analysis_status && (
                      <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
                        activity.analysis_status === 'analyzing' ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : activity.analysis_status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : activity.analysis_status === 'failed' ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                        {activity.analysis_status === 'analyzing' && (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /><span>Analysing results…</span></>
                        )}
                        {activity.analysis_status === 'completed' && (
                          <><Sparkles className="h-3.5 w-3.5 shrink-0" /><span>Insights ready — view in <button
                    onClick={() => navigate('/teacher/reports')}
                    className="hover:underline text-sm"
                  > Report
                  </button></span></>
                        )}
                        {activity.analysis_status === 'failed' && (
                          <><AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>Analysis failed</span>
                            <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs cursor-pointer"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const idToken = await getIdToken();
                                  fetch(`${API_BASE}/ai-integrations/analyze-activity`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id_token: idToken, activity_id: activity.id }),
                                  });
                                  toast.info('Re-running analysis…');
                                  setTimeout(() => fetchActivities(), 2000);
                                  setTimeout(() => fetchActivities(), 15000);
                                } catch {} // eslint-disable-line no-empty
                              }}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {!isCompleted && !isActive && (
                        <Button onClick={() => startActivity(activity.id)} className="w-full cursor-pointer" size="sm">
                          <Play className="mr-2 h-4 w-4" /> Start Activity
                        </Button>
                      )}
                      {isActive && (
                        <Button variant="outline" onClick={() => setActivityPopupOpen(true)} className="w-full cursor-pointer" size="sm">
                          Open Activity
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Students Present */}
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>{loadingStudents ? 'Loading…' : `${students.length} students in your classroom`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center p-4 border rounded-lg animate-pulse space-y-2">
                    <div className="w-14 h-14 rounded-full bg-gray-200" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : students.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {students.map((student) => (
                  <div key={student.id} className="flex flex-col items-center p-4 border rounded-lg">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-600 mb-2">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-center">{student.name}</p>
                    <Badge variant="secondary" className="mt-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Present
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No students assigned yet.</p>
            )}
          </CardContent>
        </Card>
      </main>

    </div>

      {/* Activity Delivery — full-screen overlay */}
      {activityPopupOpen && activeActivity && (
        <div
          className={`fixed inset-0 z-50 bg-white flex flex-col overflow-hidden ${
            deliveryClosing ? 'animate-delivery-close' : 'animate-delivery-open'
          }`}
          onAnimationEnd={() => {
            if (deliveryClosing) {
              setDeliveryClosing(false);
              setActivityPopupOpen(false);
            }
          }}
        >
          {/* Header bar */}
          <div className={`${headerColor} px-8 py-4 flex items-center justify-between shrink-0 shadow-sm`}>
            <div className="flex items-center gap-3">
              {(() => {
                const meta = ACTIVITY_TYPE_META[activeActivity.activity_type];
                const Icon = meta?.icon;
                return Icon ? <Icon className="h-6 w-6 text-white" /> : null;
              })()}
              <span className="text-white font-semibold text-xl comic-delivery">{activeActivity.title}</span>
            </div>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setDeliveryClosing(true)}
              className="text-white hover:bg-white/20 hover:text-white cursor-pointer gap-2 comic-delivery"
            >
              <X className="h-8 w-8" />
            </Button>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto"> 
            <div className="max-w-6xl mx-auto px-2 py-10 comic-delivery">
              {renderDelivery()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
