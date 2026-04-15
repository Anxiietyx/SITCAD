import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { formatDateTime } from "../lib/utils";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { activityReducer, initialState } from "../reducers/activityReducer";
import { toast } from "sonner";
import { downloadActivityPDF, downloadFlashcardZIP } from "../lib/downloads";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

import {
  ArrowLeft,
  Calendar,
  Clock,
  Book,
  Calculator,
  Users,
  Activity as ActivityIcon,
  Palette,
  Brain,
  CheckCircle2,
  Sparkles,
  Trash2,
  FileText,
  Loader2,
  Gamepad2,
  ImageIcon,
  BookText,
  RotateCcw,
  Save,
  AlertCircle,
  RefreshCw,
  Target,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Download,
  FileDown,
} from "lucide-react";


import { API_BASE } from '../lib/api';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Not authenticated");
  return firebaseUser.getIdToken();
}

const MASCOT_IMAGES = [
  "/mascot/writing_1.png",
  "/mascot/holding_book_1.png",
  "/mascot/magnifying_1.png",
  "/mascot/clipboard_1.png",
  "/mascot/holding_book_2.png",
  "/mascot/whiteboard_1.png",
  "/mascot/holding_scroll_1.png",
  "/mascot/holding_book_4.png",
];

const LOADING_MESSAGES = [
  "Reading the lesson plan context",
  "Designing engaging activity content",
  "Building quiz questions and answers",
  "Crafting story narratives",
  "Preparing image descriptions",
  "Adding age-appropriate details",
  "Polishing the content",
  "Almost done! Finishing up",
];

const ACTIVITY_TYPE_META = {
  quiz: { label: "Quiz", icon: Gamepad2, color: "bg-violet-100 text-violet-700 border-violet-200" },
  image: { label: "Flashcards", icon: ImageIcon, color: "bg-sky-100 text-sky-700 border-sky-200" },
  story: { label: "Text Story", icon: BookText, color: "bg-amber-100 text-amber-700 border-amber-200" },
};

const LEARNING_AREA_LABELS = {
  literacy_bm: "Literacy (BM)",
  literacy_en: "Literacy (EN)",
  numeracy: "Numeracy",
  social: "Social Skills",
  motor: "Motor Skills",
  creative: "Creative Arts",
  cognitive: "Cognitive",
};

const learningAreaStats = [
  { value: "literacy_bm", label: "Literacy (BM)", icon: Book, color: "text-sm bg-[#ffffff]/20 text-[#3090A0] border-[#3090A0]/30" },
  { value: "literacy_en", label: "Literacy (EN)", icon: Book, color: "text-sm bg-[#ffffff]/20 text-[#3090A0] border-[#3090A0]/30" },
  { value: "numeracy", label: "Numeracy", icon: Calculator, color: "text-sm bg-[#ffffff]/20 text-[#3090A0] border-[#3090A0]/30" },
  { value: "social", label: "Social Skills", icon: Users, color: "text-sm bg-[#ffffff]/20 text-[#3090A0] border-[#3090A0]/30" },
  { value: "motor", label: "Motor Skills", icon: ActivityIcon, color: "text-sm bg-[#ffffff]/20 text-[#3090A0] border-[#3090A0]/30" },
  { value: "creative", label: "Creative Arts", icon: Palette, color: "text-sm bg-[#ffffff]/20 text-[#3090A0] border-[#3090A0]/30" },
  { value: "cognitive", label: "Cognitive", icon: Brain, color: "text-sm bg-[#ffffff]/20 text-[#3090A0] border-[#3090A0]/30" },
];



export function ActivityManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(activityReducer, initialState);

  const [activities, setActivities] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("create");
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingLessonPlans, setLoadingLessonPlans] = useState(true);
  const [savingActivities, setSavingActivities] = useState(false);

  // Report generation state
  const [reportScore, setReportScore] = useState("");
  const [reportTotal, setReportTotal] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);

  // Mascot carousel
  const [mascotIndex, setMascotIndex] = useState(0);
  const mascotInterval = useRef(null);

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Week tab for UNP plan selection
  const [planWeekTab, setPlanWeekTab] = useState(0);

  // Re-run analysis state
  const [rerunningActivityId, setRerunningActivityId] = useState(null);

  const handleRerunAnalysis = async (activityId) => {
    setRerunningActivityId(activityId);
    try {
      const idToken = await getIdToken();
      await fetch(`${API_BASE}/ai-integrations/analyze-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, activity_id: activityId }),
      });
      toast.info('Re-running analysis…');
      setTimeout(() => { fetchActivities(); setRerunningActivityId(null); }, 3000);
      setTimeout(() => fetchActivities(), 15000);
    } catch {
      toast.error('Failed to re-run analysis');
      setRerunningActivityId(null);
    }
  };

  useEffect(() => {
    if (state.step === "generating") {
      setMascotIndex(0);
      mascotInterval.current = setInterval(() => {
        setMascotIndex((prev) => (prev + 1) % MASCOT_IMAGES.length);
      }, 3000);
    } else {
      if (mascotInterval.current) clearInterval(mascotInterval.current);
    }
    return () => { if (mascotInterval.current) clearInterval(mascotInterval.current); };
  }, [state.step]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/my-activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) setActivities(await res.json());
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  const fetchLessonPlans = useCallback(async () => {
    setLoadingLessonPlans(true);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/lesson-plans/my-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) setLessonPlans(await res.json());
    } catch (err) {
      console.error("Failed to fetch lesson plans:", err);
    } finally {
      setLoadingLessonPlans(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "teacher") {
      fetchActivities();
      fetchLessonPlans();
    }
  }, [user?.id, fetchActivities, fetchLessonPlans]);

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  const selectedPlan = lessonPlans.find((p) => p.id === state.selectedPlanId);
  const selectedCount = state.selectedActivities.length;

  // ── Generate activities via AI ──
  const handleGenerate = async () => {
    if (!selectedPlan || selectedCount === 0) return;

    const activitiesToGenerate = state.selectedActivities.map((idx) => {
      const act = selectedPlan.activities[idx];
      return {
        title: act.title,
        description: act.description,
        duration: act.duration || "",
        type: act.type || "quiz",
        image_style: state.activityImageStyles[idx] || "cartoon",
      };
    });

    dispatch({ type: "START_GENERATION" });

    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/ai-integrations/generate-activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          lesson_plan_id: selectedPlan.id,
          lesson_title: selectedPlan.title,
          topic: selectedPlan.topic,
          learning_area: selectedPlan.learning_area,
          age_group: selectedPlan.age_group,
          language: selectedPlan.language || (selectedPlan.learning_area === "literacy_en" ? "en" : "bm"),
          image_style: selectedPlan.image_style || "cartoon",
          activities: activitiesToGenerate,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate activities");
      }

      const data = await res.json();
      dispatch({ type: "FINISH_GENERATION", payload: data.generated });
      toast.success("Activities generated! Review them below.");
    } catch (err) {
      console.error(err);
      dispatch({ type: "FINISH_GENERATION", payload: null });
      toast.error(err.message || "Failed to generate activities. Please try again.");
    }
  };

  // ── Save all generated activities ──
  const handleSaveAll = async () => {
    if (state.generatedResults.length === 0 || !selectedPlan) return;
    setSavingActivities(true);

    try {
      const idToken = await getIdToken();
      for (const result of state.generatedResults) {
        const res = await fetch(`${API_BASE}/activities/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_token: idToken,
            title: result.title,
            description: result.description,
            learning_area: selectedPlan.learning_area,
            duration_minutes: parseInt(result.duration) || selectedPlan.duration_minutes,
            activity_type: result.type,
            generated_content: result.generated_content,
            assigned_to: "class",
            lesson_plan_id: selectedPlan.id,
            source: "lesson_plan",
          }),
        });
        if (!res.ok) throw new Error(`Failed to save activity: ${result.title}`);
      }

      toast.success(`${state.generatedResults.length} ${state.generatedResults.length === 1 ? "activity" : "activities"} saved!`);
      dispatch({ type: "RESET_FLOW" });
      fetchActivities();
      setActiveTab("list");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save activities");
    } finally {
      setSavingActivities(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    setDeleteTargetId(null);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/${activityId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) {
        toast.success("Activity deleted");
        dispatch({ type: "SELECT_ACTIVITY", payload: null });
        fetchActivities();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleCompleteActivity = async (activityId) => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/${activityId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (!res.ok) throw new Error("Failed to complete");
      toast.success("Activity marked as completed!");
      dispatch({ type: "SELECT_ACTIVITY", payload: null });
      fetchActivities();
    } catch (err) {
      toast.error("Failed to mark complete");
    }
  };

  const handleGenerateReport = async (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    const isQuiz = activity?.activity_type === 'quiz';
    const score = isQuiz ? (activity?.quiz_score ?? (reportScore ? parseInt(reportScore) : undefined)) : undefined;
    const total = isQuiz ? (activity?.quiz_total ?? (reportTotal ? parseInt(reportTotal) : undefined)) : undefined;
    const time = isQuiz
      ? (activity?.quiz_time_seconds ?? (reportTime ? parseInt(reportTime) : undefined))
      : (activity?.results_data?.time_seconds ?? undefined);

    setGeneratingReport(true);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          activity_id: activityId,
          score,
          total_questions: total,
          time_taken_seconds: time,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate report");
      }
      toast.success("Report generated! View it in the Reports page.");
      dispatch({ type: "SELECT_ACTIVITY", payload: null });
      setReportScore("");
      setReportTotal("");
      setReportTime("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── Render helpers for generated content ──
  const renderQuizContent = (content) => (
    <div className="space-y-4">
      {content.questions?.map((q, i) => (
        <div key={i} className="p-4 border rounded-lg bg-white space-y-2">
          {q.image_url && (
            <img
              src={q.image_url}
              alt={`Illustration for question ${i + 1}`}
              className="w-full max-h-48 object-contain rounded-lg border border-gray-100 bg-gray-50"
            />
          )}
          <p className="font-semibold text-gray-800">Q{i + 1}: {q.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.options?.map((opt, j) => (
              <div
                key={j}
                className={`p-2 rounded-lg border text-sm ${j === q.correct_answer ? "bg-green-50 border-green-300 text-green-800 font-medium" : "bg-gray-50 border-gray-200 text-gray-700"}`}
              >
                {String.fromCharCode(65 + j)}. {opt}
                {j === q.correct_answer && <CheckCircle2 className="inline h-3.5 w-3.5 ml-1.5 text-green-600" />}
              </div>
            ))}
          </div>
          {q.explanation && <p className="text-xs text-muted-foreground italic mt-1">{q.explanation}</p>}
        </div>
      ))}
    </div>
  );

  const renderImageContent = (content) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {content.images?.map((img, i) => (
        <div key={i} className="border rounded-lg bg-white overflow-hidden flex flex-col">
          {(img.image_url || img.image_b64) ? (
            <img
              src={img.image_url || `data:image/png;base64,${img.image_b64}`}
              alt={img.label}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-sky-50 flex items-center justify-center border-b border-sky-100">
              <p className="text-sm text-sky-400 italic">Image unavailable</p>
            </div>
          )}
          <div className="p-3 space-y-1">
            <h4 className="font-semibold text-gray-800 text-sm">{img.label}</h4>
            {img.learning_point && (
              <p className="text-xs text-muted-foreground"><span className="font-medium">Learning point:</span> {img.learning_point}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStoryContent = (content) => (
    <div className="space-y-4">
      {content.story_title && <h4 className="text-lg font-bold text-gray-800">{content.story_title}</h4>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.pages?.map((page, i) => (
          <div key={i} className="border rounded-lg bg-white overflow-hidden flex flex-col">
            {(page.image_url || page.image_b64) ? (
              <img
                src={page.image_url || `data:image/png;base64,${page.image_b64}`}
                alt={`Page ${page.page_number}`}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square bg-amber-50 flex items-center justify-center border-b border-amber-100">
                <p className="text-xs text-amber-300 italic">Image unavailable</p>
              </div>
            )}
            <div className="p-3 space-y-1">
              <Badge variant="outline" className="text-xs">Page {page.page_number}</Badge>
              <p className="text-sm text-gray-800 leading-relaxed">{page.text}</p>
            </div>
          </div>
        ))}
      </div>
      {content.vocabulary?.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs font-semibold text-amber-800 mb-2">Vocabulary</p>
          <div className="flex flex-wrap gap-2">
            {content.vocabulary.map((v, i) => (
              <Badge key={i} variant="outline" className="bg-white text-xs">
                <span className="font-semibold">{v.word}</span> — {v.definition}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {content.moral && (
        <p className="text-sm text-gray-700 italic">Moral: {content.moral}</p>
      )}
    </div>
  );

  const renderGeneratedContent = (result) => {
    const content = result.generated_content;
    if (!content) return <p className="text-sm text-muted-foreground">No content generated.</p>;
    if (result.type === "quiz") return renderQuizContent(content);
    if (result.type === "image") return renderImageContent(content);
    if (result.type === "story") return renderStoryContent(content);
    return <pre className="text-xs overflow-auto">{JSON.stringify(content, null, 2)}</pre>;
  };

  return (
    <div className="relative min-h-screen overflow-hidden print:min-h-0">
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-emerald-50/72" />
      <div className="relative z-10">
          {/* Header */}
          <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm print:hidden">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#bafde0] rounded-lg flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold">Activity Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">Generate and manage AI-powered learning activities</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => navigate("/teacher")} className="cursor-pointer">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-8 min-h-[80vh]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="cursor-pointer">Create Activities</TabsTrigger>
                <TabsTrigger value="list" className="cursor-pointer">My Activities</TabsTrigger>
              </TabsList>

              {/* ════════════════════════════════════════════════════
                  TAB 1: CREATE ACTIVITIES (select → generating → results)
                  ════════════════════════════════════════════════════ */}
              <TabsContent value="create" className="space-y-6 min-h-[500px]">

                {/* ─── STEP: SELECT ─── */}
                {state.step === "select" && (
                  <div className="space-y-4">
                    <Card className="border-2 border-indigo-200 shadow-md">
                      <CardHeader className="bg-linear-to-r from-indigo-100 to-purple-100">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Sparkles className="h-5 w-5 text-[#3090A0]" />
                          Generate Activities from Lesson Plan
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-700 mb-6">
                          Select a lesson plan, then choose one or more activities to generate with AI.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {loadingLessonPlans ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="border-2 border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-gray-100 rounded animate-pulse w-2/5" />
                                    <div className="flex gap-2">
                                      <div className="h-5 bg-gray-100 rounded-full animate-pulse w-24" />
                                      <div className="h-5 bg-gray-100 rounded-full animate-pulse w-14" />
                                      <div className="h-5 bg-gray-100 rounded-full animate-pulse w-16" />
                                    </div>
                                  </div>
                                  <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : lessonPlans.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No lesson plans found. Create one in the Lesson Planning page first.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {lessonPlans.map((plan) => {
                              const isSelected = state.selectedPlanId === plan.id;
                              return (
                                <div key={plan.id} className={`border-2 rounded-lg transition-colors ${isSelected ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200 hover:border-gray-300"}`}>
                                  <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => {
                                      dispatch({ type: "SELECT_PLAN", payload: isSelected ? null : plan.id });
                                      setPlanWeekTab(0);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h3 className="font-semibold text-gray-800">{plan.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge
                                            variant="outline"
                                            className={`text-xs font-semibold ${
                                              plan.plan_type === "unit"
                                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                            }`}
                                          >
                                            {plan.plan_type === "unit"
                                              ? `${plan.duration_weeks || "?"}-week Unit Plan`
                                              : "Lesson Plan"}
                                          </Badge>
                                          <Badge variant="outline" className="text-xs capitalize">{LEARNING_AREA_LABELS[plan.learning_area] || plan.learning_area}</Badge>
                                          <Badge variant="outline" className="text-xs">{plan.duration_minutes} min</Badge>
                                          <Badge variant="outline" className="text-xs">Ages {plan.age_group}</Badge>
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {plan.activities?.length || 0} activities
                                      </div>
                                    </div>
                                  </div>

                                  {/* Activity checkboxes */}
                                  {isSelected && plan.activities?.length > 0 && (
                                    <div className="border-t border-indigo-200 p-4 space-y-3">
                                      <p className="text-sm font-medium text-gray-600">Select activities to generate:</p>

                                      {/* UNP: week tabs */}
                                      {plan.plan_type === "unit" && plan.weeks?.length > 0 ? (
                                        <>
                                          <div className="flex gap-1 border-b">
                                            {plan.weeks.map((week, wi) => (
                                              <button
                                                key={wi}
                                                type="button"
                                                onClick={() => setPlanWeekTab(wi)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors cursor-pointer ${
                                                  (planWeekTab < plan.weeks.length ? planWeekTab : 0) === wi
                                                    ? "bg-orange-50 text-orange-700 border border-b-0 border-orange-200 -mb-px"
                                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                                }`}
                                              >
                                                <Calendar className="inline h-3 w-3 mr-1 -mt-0.5" />
                                                Week {week.week_number || wi + 1}
                                              </button>
                                            ))}
                                          </div>
                                          {(() => {
                                            const wi = planWeekTab < plan.weeks.length ? planWeekTab : 0;
                                            // Compute flat-index offset for this week
                                            let offset = 0;
                                            for (let k = 0; k < wi; k++) {
                                              offset += plan.weeks[k].activities?.length || 0;
                                            }
                                            const week = plan.weeks[wi];
                                            return (
                                              <div className="space-y-2 pt-2">
                                                {week?.theme && (
                                                  <p className="text-xs font-semibold text-orange-700 mb-2">{week.theme}</p>
                                                )}
                                                {(week?.activities || []).map((act, ai) => {
                                                  const idx = offset + ai;
                                                  const typeMeta = ACTIVITY_TYPE_META[act.type] || ACTIVITY_TYPE_META.quiz;
                                                  const TypeIcon = typeMeta.icon;
                                                  const isChecked = state.selectedActivities.includes(idx);
                                                  return (
                                                    <div
                                                      key={idx}
                                                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                                      onClick={() => dispatch({ type: "TOGGLE_ACTIVITY", payload: idx })}
                                                    >
                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                          <h4 className="font-semibold text-sm text-gray-800">{act.title}</h4>
                                                          <Badge variant="outline" className={`text-xs ${typeMeta.color}`}>
                                                            <TypeIcon className="h-3 w-3 mr-1" />{typeMeta.label}
                                                          </Badge>
                                                          {act.duration && (
                                                            <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50 border-blue-200">
                                                              <Clock className="h-3 w-3 mr-1" />{act.duration}
                                                            </Badge>
                                                          )}
                                                        </div>
                                                        <p className="text-sm text-gray-600">{act.description}</p>
                                                        {isChecked && (
                                                          <div
                                                            className="flex items-center gap-2 mt-3"
                                                            onClick={(e) => e.stopPropagation()}
                                                          >
                                                            <span className="text-xs text-gray-500">Image Style:</span>
                                                            <div className="flex rounded-md border overflow-hidden">
                                                              {["cartoon", "photorealistic"].map((style) => (
                                                                <button
                                                                  key={style}
                                                                  type="button"
                                                                  onClick={() => dispatch({ type: "SET_ACTIVITY_IMAGE_STYLE", idx, style })}
                                                                  className={`px-2.5 py-0.5 text-xs cursor-pointer transition-colors ${
                                                                    (state.activityImageStyles[idx] || "cartoon") === style
                                                                      ? "bg-[#3090A0] text-white"
                                                                      : "bg-white text-gray-600 hover:bg-gray-50"
                                                                  }`}
                                                                >
                                                                  {style === "cartoon" ? "Cartoon" : "Photorealistic"}
                                                                </button>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          })()}
                                        </>
                                      ) : (
                                        /* LP: flat list */
                                        plan.activities.map((act, idx) => {
                                          const typeMeta = ACTIVITY_TYPE_META[act.type] || ACTIVITY_TYPE_META.quiz;
                                          const TypeIcon = typeMeta.icon;
                                          const isChecked = state.selectedActivities.includes(idx);
                                          return (
                                            <div
                                              key={idx}
                                              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                              onClick={() => dispatch({ type: "TOGGLE_ACTIVITY", payload: idx })}
                                            >
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <h4 className="font-semibold text-sm text-gray-800">{act.title}</h4>
                                                  <Badge variant="outline" className={`text-xs ${typeMeta.color}`}>
                                                    <TypeIcon className="h-3 w-3 mr-1" />{typeMeta.label}
                                                  </Badge>
                                                  {act.duration && (
                                                    <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50 border-blue-200">
                                                      <Clock className="h-3 w-3 mr-1" />{act.duration}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <p className="text-sm text-gray-600">{act.description}</p>
                                                {isChecked && (
                                                  <div
                                                    className="flex items-center gap-2 mt-3"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <span className="text-xs text-gray-500">Image Style:</span>
                                                    <div className="flex rounded-md border overflow-hidden">
                                                      {["cartoon", "photorealistic"].map((style) => (
                                                        <button
                                                          key={style}
                                                          type="button"
                                                          onClick={() => dispatch({ type: "SET_ACTIVITY_IMAGE_STYLE", idx, style })}
                                                          className={`px-2.5 py-0.5 text-xs cursor-pointer transition-colors ${
                                                            (state.activityImageStyles[idx] || "cartoon") === style
                                                              ? "bg-[#3090A0] text-white"
                                                              : "bg-white text-gray-600 hover:bg-gray-50"
                                                          }`}
                                                        >
                                                          {style === "cartoon" ? "Cartoon" : "Photorealistic"}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Generate button */}
                        {selectedPlan && (
                          <Button
                            onClick={handleGenerate}
                            disabled={selectedCount === 0}
                            size="lg"
                            className="w-full bg-[#3090A0] hover:bg-[#2FBFA5] text-white font-semibold text-base cursor-pointer"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {selectedCount === 0
                              ? "Select activities to generate"
                              : selectedCount === 1
                                ? "Create Activity"
                                : `Create ${selectedCount} Activities`}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ─── STEP: GENERATING ─── */}
                {state.step === "generating" && (
                  <Card className="border-2 border-indigo-200 shadow-md">
                    <CardContent className="pt-8 pb-20 flex flex-col items-center justify-center text-center space-y-8">
                      <div className="relative w-48 h-48 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-[#3090A0]/20 border-t-[#3090A0] animate-spin" />
                        <img
                          key={mascotIndex}
                          src={MASCOT_IMAGES[mascotIndex]}
                          alt="SabahSprout mascot"
                          className="w-32 h-32 object-contain"
                          style={{ animation: "fade-in 500ms ease-out, mascotWobble 2s ease-in-out infinite" }}
                        />
                      </div>
                      <div className="space-y-3 max-w-md">
                        <h2 className="text-xl font-semibold text-gray-800">
                          Generating {selectedCount === 1 ? "Your Activity" : `${selectedCount} Activities`}
                        </h2>
                        <p key={mascotIndex} className="text-sm text-muted-foreground animate-in fade-in duration-300">
                          {LOADING_MESSAGES[mascotIndex]}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ─── STEP: RESULTS ─── */}
                {state.step === "results" && state.generatedResults.length > 0 && (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <h2 className="text-xl font-semibold text-gray-800">
                          Generated {state.generatedResults.length === 1 ? "Activity" : "Activities"} — Review
                        </h2>
                      </div>
                    </div>

                    {state.generatedResults.map((result, i) => {
                      const typeMeta = ACTIVITY_TYPE_META[result.type] || ACTIVITY_TYPE_META.quiz;
                      const TypeIcon = typeMeta.icon;
                      return (
                        <Card key={i} className="shadow-md border border-gray-200">
                          <CardHeader className="bg-linear-to-r from-indigo-50 to-purple-50 pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-2xl font-bold text-gray-800">{result.title}</CardTitle>
                                <p className="text-base text-muted-foreground mt-1">{result.description}</p>
                              </div>
                              <Badge variant="outline" className={`${typeMeta.color} text-sm`}>
                                <TypeIcon className="h-4 w-4 mr-1.5" />{typeMeta.label}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4 text-lg [&_*]:text-lg">
                            {renderGeneratedContent(result)}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Bottom action bar */}
                    <div className="flex justify-end gap-3 pb-8">
                      <Button variant="outline" onClick={() => dispatch({ type: "RESET_FLOW" })} className="cursor-pointer">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Discard & Re-generate
                      </Button>
                      <Button
                        onClick={handleSaveAll}
                        disabled={savingActivities}
                        className="bg-[#3090A0] hover:bg-[#2FBFA5] text-white cursor-pointer"
                      >
                        {savingActivities ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {savingActivities ? "Saving…" : `Save ${state.generatedResults.length === 1 ? "Activity" : "Activities"} to My Activities`}
                      </Button>
                    </div>
                  </div>
                )}

              </TabsContent>

              {/* ════════════════════════════════════════════════════
                  TAB 2: MY ACTIVITIES
                  ════════════════════════════════════════════════════ */}
              <TabsContent value="list" className="space-y-6 min-h-[500px]">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {loadingActivities
                    ? [1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <Card key={i}>
                          <CardContent className="pt-4 pb-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse mb-2" />
                            <div className="h-8 bg-gray-100 rounded animate-pulse w-8 mb-1" />
                            <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
                          </CardContent>
                        </Card>
                      ))
                    : learningAreaStats.map(({ value, label, icon: Icon, color }) => (
                        <Card key={value}>
                          <CardContent className="pt-4 pb-3">
                            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-2`}>
                              <Icon className="h-8 w-8" />
                            </div>
                            <p className="text-3xl font-bold mb-0.5">
                              {activities.filter((a) => a.learning_area === value).length}
                            </p>
                            <p className="text-sm font-medium text-muted-foreground">{label}</p>
                          </CardContent>
                        </Card>
                      ))}
                </div>

                {/* Activity list */}
                <Card className="border-2 border-indigo-200 shadow-md">
                  <CardHeader className="bg-linear-to-r from-indigo-100 to-purple-100">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">My Activities</CardTitle>
                    <CardDescription className="text-sm text-gray-700 mb-2">Click an activity to view details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingActivities ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
                              <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
                              <div className="flex gap-2 mt-2">
                                <div className="h-5 bg-gray-100 rounded-full animate-pulse w-20" />
                                <div className="h-5 bg-gray-100 rounded-full animate-pulse w-16" />
                                <div className="h-5 bg-gray-100 rounded-full animate-pulse w-14" />
                              </div>
                            </div>
                            <div className="h-4 bg-gray-100 rounded animate-pulse w-16 ml-4" />
                          </div>
                        ))}
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border border-dashed rounded-lg">
                        No activities yet. Go to the Create Activities tab to generate some.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity) => {
                          const typeMeta = ACTIVITY_TYPE_META[activity.activity_type];
                          const TypeIcon = typeMeta?.icon;
                          return (
                            <div
                              key={activity.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => dispatch({ type: "SELECT_ACTIVITY", payload: activity })}
                            >
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-800">{activity.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {LEARNING_AREA_LABELS[activity.learning_area] || activity.learning_area}
                                  </Badge>
                                  {typeMeta && (
                                    <Badge variant="outline" className={`text-xs ${typeMeta.color}`}>
                                      <TypeIcon className="h-3 w-3 mr-1" />{typeMeta.label}
                                    </Badge>
                                  )}
                                  {activity.duration_minutes && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />{activity.duration_minutes} min
                                    </Badge>
                                  )}
                                  <Badge variant={activity.status === "completed" ? "default" : "outline"} className="text-xs capitalize gap-1">
                                    {activity.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                    {activity.status.replace("_", " ")}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {activity.created_at ? formatDateTime(activity.created_at) : ""}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 h-8 w-8 p-0 cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTargetId(activity.id); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>

          {/* ═══ Activity Detail Dialog ═══ */}
          <Dialog open={!!state.selectedActivity} onOpenChange={() => dispatch({ type: "SELECT_ACTIVITY", payload: null })}>
            <DialogContent className="w-full max-w-6xl sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
              {state.selectedActivity && (() => {
                const act = state.selectedActivity;
                const typeMeta = ACTIVITY_TYPE_META[act.activity_type];
                const TypeIcon = typeMeta?.icon;

                return (
                  <>
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      <DialogHeader>
                        <div className="flex items-start justify-between gap-4 mt-4 mb-2">
                          <div>
                            {act.lesson_plan_title && (
                              <div className="text-lg text-center text-muted-foreground mb-2 bg-blue-100 rounded-3xl">From Lesson Plan: <span className="font-semibold text-foreground">{act.lesson_plan_title}</span></div>
                            )}
                            <DialogTitle className="text-2xl">{act.title}</DialogTitle>
                            <DialogDescription className="mt-1 text-base">{act.description}</DialogDescription>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {LEARNING_AREA_LABELS[act.learning_area] || act.learning_area}
                          </Badge>
                          {typeMeta && (
                            <Badge variant="outline" className={`text-xs ${typeMeta.color}`}>
                              <TypeIcon className="h-3 w-3 mr-1" />{typeMeta.label}
                            </Badge>
                          )}
                          {act.duration_minutes && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />{act.duration_minutes} min
                            </Badge>
                          )}
                          <Badge variant={act.status === "completed" ? "default" : "outline"} className="text-xs capitalize gap-1">
                            {act.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                            {act.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </DialogHeader>

                      <div className="space-y-4 mt-4">
                        {/* Generated Content */}
                        {act.generated_content && (
                          <div>
                            <h3 className="text-xl font-semibold mb-3">
                              Generated Content 
                              <hr className="h-0.5 bg-gray-400 border-0" />
                            </h3>

                            <div className="text-lg leading-relaxed space-y-2 [&_*]:text-base">
                              {renderGeneratedContent({
                                type: act.activity_type,
                                generated_content: act.generated_content
                              })}
                            </div>
                          </div>
                        )}

                        {/* Generate Report Section (completed activities only) */}
                        {act.status === "completed" && (
                          <div className="border-t pt-5 space-y-4">

                          {/* Quiz / Session results — always visible once completed */}
                          {act.quiz_score != null && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-emerald-600" />
                                <h3 className="font-semibold">Quiz Results</h3>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                  <p className="text-2xl font-bold text-emerald-700">{act.quiz_score}/{act.quiz_total}</p>
                                  <p className="text-sm text-muted-foreground mt-1">Score</p>
                                </div>
                                <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                  <p className="text-2xl font-bold text-emerald-700">{act.quiz_total ? Math.round(act.quiz_score / act.quiz_total * 100) : 0}%</p>
                                  <p className="text-sm text-muted-foreground mt-1">Accuracy</p>
                                </div>
                                <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                  <p className="text-2xl font-bold text-emerald-700">
                                    {act.quiz_time_seconds != null
                                      ? act.quiz_time_seconds >= 60
                                        ? `${Math.floor(act.quiz_time_seconds / 60)}m ${act.quiz_time_seconds % 60}s`
                                        : `${act.quiz_time_seconds}s`
                                      : "N/A"}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">Time Taken</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Session duration for non-quiz activities */}
                          {act.quiz_score == null && act.results_data?.time_seconds != null && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-emerald-600" />
                                <h3 className="font-semibold">Session Duration</h3>
                              </div>
                              <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200 w-40">
                                <p className="text-2xl font-bold text-emerald-700">
                                  {act.results_data.time_seconds >= 60
                                    ? `${Math.floor(act.results_data.time_seconds / 60)}m ${act.results_data.time_seconds % 60}s`
                                    : `${act.results_data.time_seconds}s`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Time Elapsed</p>
                              </div>
                            </div>
                          )}

                          {/* Students involved */}
                          {act.students?.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="font-semibold text-base">Students Involved</h3>
                              <div className="flex flex-wrap gap-2">
                                {act.students.map(s => (
                                  <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full">
                                    <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-sm font-semibold text-blue-700">
                                      {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium">{s.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI Insights Panel */}
                          {(act.analysis_status === 'analyzing' || rerunningActivityId === act.id) && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-blue-800">Analysing results…</p>
                                  <p className="text-xs text-blue-600 mt-0.5">Insights will appear here once ready.</p>
                                </div>
                              </div>
                              {/* Skeleton placeholders */}
                              <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-100 rounded w-40 animate-pulse" />
                                <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                                <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-100 rounded w-36 animate-pulse" />
                                <div className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                                <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                              </div>
                            </div>
                          )}

                          {act.analysis_status === 'failed' && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800">AI analysis failed</p>
                                {act.analysis_error && <p className="text-xs text-red-600 mt-0.5">{act.analysis_error}</p>}
                              </div>
                              <Button variant="outline" size="sm" className="shrink-0 border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                                disabled={rerunningActivityId === act.id}
                                onClick={() => handleRerunAnalysis(act.id)}>
                                {rerunningActivityId === act.id
                                  ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Running…</>
                                  : <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry</>}
                              </Button>
                            </div>
                          )}

                          {act.analysis_status === 'completed' && rerunningActivityId !== act.id && (
                            <div className="border-t pt-5 space-y-4">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-semibold text-lg">AI Insights</h3>
                              </div>

                              {/* Render insights from the most recent report's details.ai_insights */}
                              {(() => {
                                const insights = act._latestInsights;
                                if (!insights) return <p className="text-sm text-muted-foreground">Insights saved to report. View in Reports page.</p>;
                                return (
                                  <div className="space-y-4">
                                    {/* Fallback notice */}
                                    {insights._fallback && (
                                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                                        <span>
                                          <span className="font-semibold">Basic analysis only</span> — Gemini was temporarily busy when this ran.
                                          Use the <span className="font-semibold">Retry</span> button below to get full AI insights when the service recovers.
                                        </span>
                                      </div>
                                    )}
                                    {/* Summary */}
                                    <p className="text-sm text-gray-700 leading-relaxed bg-emerald-50 p-3 rounded-lg border border-emerald-200">{insights.summary}</p>

                                    {/* SPR Attainment */}
                                    {insights.spr_attainment?.length > 0 && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                          <Target className="h-4 w-4 text-blue-600" />
                                          <p className="text-base font-semibold text-gray-800">SPR Attainment Levels</p>
                                        </div>
                                        {insights.spr_attainment.map((spr, i) => (
                                          <div key={i} className="p-3 bg-white rounded-lg border space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-semibold text-gray-800">{spr.spr_code}</span>
                                              <Badge className={`text-xs ${
                                                spr.suggested_level === 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                : spr.suggested_level === 2 ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                : 'bg-amber-100 text-amber-700 border-amber-200'
                                              }`}>Level {spr.suggested_level}</Badge>
                                            </div>
                                            <p className="text-base text-muted-foreground font-semibold">{spr.spr_title}</p>
                                            <p className="text-sm text-gray-600 mt-1">{spr.justification}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Interventions */}
                                    {insights.interventions?.length > 0 && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                                          <p className="text-base font-semibold text-gray-800">Flagged Observations</p>
                                        </div>
                                        {insights.interventions.map((item, i) => (
                                          <div key={i} className={`p-3 rounded-lg border text-sm ${
                                            item.severity === 'urgent' ? 'bg-red-50 border-red-200 text-red-800'
                                            : item.severity === 'flag' ? 'bg-amber-50 border-amber-200 text-amber-800'
                                            : 'bg-gray-50 border-gray-200 text-gray-700'
                                          }`}>
                                            {item.detail}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Strengths & Improvements */}
                                    <div className="grid grid-cols-2 gap-3">
                                      {insights.strengths?.length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Strengths</p>
                                          <ul className="text-sm text-gray-600 space-y-1">
                                            {insights.strengths.map((s, i) => <li key={i} className="flex gap-1"><span>•</span><span>{s}</span></li>)}
                                          </ul>
                                        </div>
                                      )}
                                      {insights.areas_for_improvement?.length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-sm font-semibold text-amber-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> To Improve</p>
                                          <ul className="text-sm text-gray-600 space-y-1">
                                            {insights.areas_for_improvement.map((a, i) => <li key={i} className="flex gap-1"><span>•</span><span>{a}</span></li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {/* Recommendations */}
                                    {insights.recommendations?.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold text-blue-700">Recommendations</p>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                          {insights.recommendations.map((r, i) => <li key={i} className="flex gap-1"><span>•</span><span>{r}</span></li>)}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Re-run button */}
                                    <Button variant="outline" size="sm" className="text-sm cursor-pointer"
                                      disabled={rerunningActivityId === act.id}
                                      onClick={() => handleRerunAnalysis(act.id)}>
                                      {rerunningActivityId === act.id
                                        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running…</>
                                        : <><RefreshCw className="h-3 w-3 mr-1" /> Re-run Analysis</>}
                                    </Button>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Manual report generation — only show if no AI analysis yet */}
                          {!act.analysis_status && (
                            <>
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-semibold text-lg">Generate Report</h3>
                          </div>

                          {act.quiz_score != null ? (
                            <p className="text-sm text-muted-foreground">
                              Quiz results were saved from Classroom Mode and will be included in the report.
                            </p>
                          ) : act.activity_type === 'image' || act.activity_type === 'story' ? (
                            <p className="text-sm text-muted-foreground">
                              {act.results_data?.time_seconds != null
                                ? 'Activity duration was recorded from Classroom Mode.'
                                : 'No duration data saved. The report will note this activity was completed.'}
                            </p>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground">
                                No quiz data saved. Enter results manually to generate a performance report.
                              </p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">Score</Label>
                                  <Input type="number" min="0" placeholder="e.g. 6" value={reportScore} onChange={(e) => setReportScore(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">Total Questions</Label>
                                  <Input type="number" min="1" placeholder="e.g. 8" value={reportTotal} onChange={(e) => setReportTotal(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">Time (seconds)</Label>
                                  <Input type="number" min="0" placeholder="e.g. 90" value={reportTime} onChange={(e) => setReportTime(e.target.value)} />
                                </div>
                              </div>
                            </>
                          )}
                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            onClick={() => handleGenerateReport(act.id)}
                            disabled={generatingReport}
                          >
                            {generatingReport ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Report...</>
                            ) : (
                              <><FileText className="mr-2 h-4 w-4" /> Generate Performance Report</>
                            )}
                          </Button>
                            </>
                          )}
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons - Sticky Footer */}
                    <div className="border-t bg-background px-6 py-4 flex gap-3 shrink-0">
                      <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => dispatch({ type: "SELECT_ACTIVITY", payload: null })}>
                        Close
                      </Button>
                      {act.status !== "completed" && (
                        <Button className="flex-1 cursor-pointer" onClick={() => handleCompleteActivity(act.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as Complete
                        </Button>
                      )}
                      {act.generated_content && act.activity_type !== "image" && (
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => downloadActivityPDF(act)}
                        >
                          <Download className="mr-1 h-4 w-4" /> PDF
                        </Button>
                      )}
                      {act.activity_type === "image" && act.generated_content && (
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          onClick={async () => {
                            toast.info('Preparing flashcard ZIP…');
                            try {
                              const idToken = await getIdToken();
                              await downloadFlashcardZIP(act, idToken);
                              toast.success('ZIP downloaded!');
                            } catch (err) {
                              toast.error(err.message || 'Failed to download ZIP');
                            }
                          }}
                        >
                          <FileDown className="mr-1 h-4 w-4" /> ZIP
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        onClick={() => setDeleteTargetId(act.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>

          {/* Delete Activity Confirmation */}
          <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the activity and all its content. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  onClick={() => handleDeleteActivity(deleteTargetId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    </div>
  );
}
