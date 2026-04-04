import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import Duckpit from './Duckpit';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { activityReducer, initialState } from "../reducers/activityReducer";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Checkbox } from "./ui/checkbox";
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
} from "lucide-react";


const API_BASE = "http://localhost:8000";

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
  quiz: { label: "Quiz Game", icon: Gamepad2, color: "bg-violet-100 text-violet-700 border-violet-200" },
  image: { label: "Images", icon: ImageIcon, color: "bg-sky-100 text-sky-700 border-sky-200" },
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
  { value: "literacy_bm", label: "Literacy (BM)", icon: Book, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
  { value: "literacy_en", label: "Literacy (EN)", icon: Book, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
  { value: "numeracy", label: "Numeracy", icon: Calculator, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
  { value: "social", label: "Social Skills", icon: Users, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
  { value: "motor", label: "Motor Skills", icon: ActivityIcon, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
  { value: "creative", label: "Creative Arts", icon: Palette, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
  { value: "cognitive", label: "Cognitive", icon: Brain, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
];



export function ActivityManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(activityReducer, initialState);

  const [activities, setActivities] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("create");
  const [savingActivities, setSavingActivities] = useState(false);

  // Report generation state
  const [reportScore, setReportScore] = useState("");
  const [reportTotal, setReportTotal] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);

  // Mascot carousel
  const [mascotIndex, setMascotIndex] = useState(0);
  const mascotInterval = useRef(null);

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
    }
  }, []);

  const fetchLessonPlans = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    if (user?.role === "teacher") {
      fetchActivities();
      fetchLessonPlans();
    }
  }, [user, fetchActivities, fetchLessonPlans]);

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
    if (!window.confirm("Delete this activity?")) return;
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
    const score = activity?.quiz_score ?? (reportScore ? parseInt(reportScore) : undefined);
    const total = activity?.quiz_total ?? (reportTotal ? parseInt(reportTotal) : undefined);
    const time = activity?.quiz_time_seconds ?? (reportTime ? parseInt(reportTime) : undefined);

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
          {img.image_b64 ? (
            <img
              src={`data:image/png;base64,${img.image_b64}`}
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
            {page.image_b64 ? (
              <img
                src={`data:image/png;base64,${page.image_b64}`}
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
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Duckpit count={24} gravity={0.5} friction={0.9975} wallBounce={0.9} className="h-full w-full opacity-100" />
      </div>
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-emerald-50/72" />

      <div className="relative z-10">
      {/* Header */}
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-black" />
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

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="cursor-pointer">Create Activities</TabsTrigger>
            <TabsTrigger value="list" className="cursor-pointer">My Activities</TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════════════════
              TAB 1: CREATE ACTIVITIES (select → generating → results)
              ════════════════════════════════════════════════════ */}
          <TabsContent value="create" className="space-y-6">

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
                    {lessonPlans.length === 0 ? (
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
                                onClick={() => dispatch({ type: "SELECT_PLAN", payload: isSelected ? null : plan.id })}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-semibold text-gray-800">{plan.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
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
                                  {plan.activities.map((act, idx) => {
                                    const typeMeta = ACTIVITY_TYPE_META[act.type] || ACTIVITY_TYPE_META.quiz;
                                    const TypeIcon = typeMeta.icon;
                                    const isChecked = state.selectedActivities.includes(idx);
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isChecked ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                                        onClick={() => dispatch({ type: "TOGGLE_ACTIVITY", payload: idx })}
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          className="mt-0.5"
                                          onCheckedChange={() => dispatch({ type: "TOGGLE_ACTIVITY", payload: idx })}
                                        />
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
                                        </div>
                                      </div>
                                    );
                                  })}
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
                            <CardTitle className="text-lg font-bold text-gray-800">{result.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                          </div>
                          <Badge variant="outline" className={`${typeMeta.color} text-sm`}>
                            <TypeIcon className="h-4 w-4 mr-1.5" />{typeMeta.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
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
          <TabsContent value="list" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {learningAreaStats.map(({ value, label, icon: Icon, color }) => (
                <Card key={value}>
                  <CardContent className="pt-4 pb-3">
                    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-bold mb-0.5">
                      {activities.filter((a) => a.learning_area === value).length}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Activity list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">My Activities</CardTitle>
                <CardDescription>Click an activity to view details</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
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
                              {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : ""}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleDeleteActivity(activity.id); }}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {state.selectedActivity && (() => {
            const act = state.selectedActivity;
            const typeMeta = ACTIVITY_TYPE_META[act.activity_type];
            const TypeIcon = typeMeta?.icon;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      {act.lesson_plan_title && (
                        <div className="text-xs text-muted-foreground mb-2">From Lesson Plan: <span className="font-semibold text-foreground">{act.lesson_plan_title}</span></div>
                      )}
                      <DialogTitle className="text-xl">{act.title}</DialogTitle>
                      <DialogDescription className="mt-1">{act.description}</DialogDescription>
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
                    <Badge variant="outline" className="text-xs capitalize gap-1">
                      {act.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                      {act.status.replace("_", " ")}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Generated Content */}
                  {act.generated_content && (
                    <div>
                      <h3 className="font-semibold mb-3">Generated Content</h3>
                      {renderGeneratedContent({ type: act.activity_type, generated_content: act.generated_content })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => dispatch({ type: "SELECT_ACTIVITY", payload: null })}>
                      Close
                    </Button>
                    {act.status !== "completed" && (
                      <Button className="flex-1 cursor-pointer" onClick={() => handleCompleteActivity(act.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                      onClick={() => handleDeleteActivity(act.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Generate Report Section (completed activities only) */}
                  {act.status === "completed" && (
                    <div className="border-t pt-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-lg">Generate Report</h3>
                      </div>

                      {act.quiz_score != null ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Quiz results were saved from Classroom Mode and will be included in the report.
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-2xl font-bold text-emerald-700">{act.quiz_score}/{act.quiz_total}</p>
                              <p className="text-xs text-muted-foreground mt-1">Score</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-2xl font-bold text-emerald-700">{act.quiz_total ? Math.round(act.quiz_score / act.quiz_total * 100) : 0}%</p>
                              <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-2xl font-bold text-emerald-700">
                                {act.quiz_time_seconds != null
                                  ? act.quiz_time_seconds >= 60
                                    ? `${Math.floor(act.quiz_time_seconds / 60)}m ${act.quiz_time_seconds % 60}s`
                                    : `${act.quiz_time_seconds}s`
                                  : "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Time Taken</p>
                            </div>
                          </div>
                        </>
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
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
