import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { formatDateTime } from "../lib/utils";
import Duckpit from "./Duckpit";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Target,
  Clock,
  Users,
  Loader2,
  Trash2,
  Save,
  Pencil,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Plus,
  X,
  Monitor,
  Layers,
  ClipboardCheck,
  Gamepad2,
  ImageIcon,
  BookText,
  Calendar,
  Download,
  FileDown,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { lessonReducer, initialState } from "../reducers/lessonReducer";
import { downloadLessonPlanPDF } from "../lib/downloads";

import { API_BASE } from '../lib/api';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Not authenticated");
  return firebaseUser.getIdToken();
}

// Mascot images for the loading carousel
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
  "Analysing DSKP KSPK curriculum standards",
  "Aligning objectives with learning outcomes",
  "Designing age-appropriate activities",
  "Selecting suitable digital resources",
  "Crafting assessment strategies",
  "Adding adaptations for diverse learners",
  "Polishing and finalising your lesson plan",
  "Almost done! Putting the finishing touches",
];

const ACTIVITY_TYPE_OPTIONS = [
  {
    value: "quiz",
    label: "Quiz",
    icon: Gamepad2,
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    value: "image",
    label: "Flashcards",
    icon: ImageIcon,
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    value: "story",
    label: "Text Story",
    icon: BookText,
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
];

const LEARNING_AREA_LABELS = {
  literacy_bm: "Literacy (Bahasa Melayu)",
  literacy_en: "Literacy (English)",
  numeracy: "Numeracy",
  social: "Social Skills",
  motor: "Motor Skills",
  creative: "Creative Arts",
  cognitive: "Cognitive Development",
};

export function AILessonPlanning() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(lessonReducer, initialState);
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [activeTab, setActiveTab] = useState("generator");
  const [savingPlan, setSavingPlan] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null); // for "My Plans" detail view

  // Terminology helper — used throughout the generation flow
  const planLabel = state.planType === "unit" ? "Unit Plan" : "Lesson Plan";
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [activeWeekTab, setActiveWeekTab] = useState(0);
  const [viewingWeekTab, setViewingWeekTab] = useState(0);
  const [deletingPlanId, setDeletingPlanId] = useState(null);

  // Loading mascot carousel state
  const [mascotIndex, setMascotIndex] = useState(0);
  const mascotInterval = useRef(null);

  // Start/stop mascot carousel when generating
  useEffect(() => {
    if (state.step === "generating") {
      setMascotIndex(0);
      mascotInterval.current = setInterval(() => {
        setMascotIndex((prev) => (prev + 1) % MASCOT_IMAGES.length);
      }, 3000);
    } else {
      if (mascotInterval.current) clearInterval(mascotInterval.current);
    }
    return () => {
      if (mascotInterval.current) clearInterval(mascotInterval.current);
    };
  }, [state.step]);

  const fetchSavedPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/lesson-plans/my-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) setSavedPlans(await res.json());
    } catch (err) {
      console.error("Failed to fetch lesson plans:", err);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "teacher") fetchSavedPlans();
  }, [user?.id, fetchSavedPlans]);

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  // ────────────────────────────────────────────
  // Step I → III: Generate lesson plan via Gemini
  // ────────────────────────────────────────────
  const generateLessonPlan = async () => {
    if (!state.topic.trim()) {
      toast.error("Please enter a topic for the lesson");
      return;
    }

    dispatch({ type: "START_GENERATION" });

    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/ai-integrations/generate-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          topic: state.topic,
          age_group: state.ageGroup,
          learning_area: state.learningArea,
          duration: parseInt(state.duration),
          additional_notes: state.additionalNotes,
          moral_education:
            state.learningArea === "social" ? state.moralEducation : "moral",
          language:
            state.learningArea === "literacy_bm"
              ? "bm"
              : state.learningArea === "literacy_en"
                ? "en"
                : state.language,
          plan_type: state.planType,
          duration_weeks: state.planType === "unit" ? parseInt(state.durationWeeks) : 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to generate ${planLabel.toLowerCase()}`);
      }

      const plan = await res.json();
      dispatch({ type: "FINISH_GENERATION", payload: plan });
      toast.success(`${planLabel} generated!`);
    } catch (err) {
      console.error(err);
      dispatch({ type: "FINISH_GENERATION", payload: null });
      toast.error(
        err.message || `Failed to generate ${planLabel.toLowerCase()}. Please try again.`,
      );
    }
  };

  // ────────────────────────────────────────────
  // Step V: Save the (customised) lesson plan
  // ────────────────────────────────────────────
  const saveLessonPlan = async () => {
    if (!state.lessonPlan) return;
    setSavingPlan(true);
    try {
      const idToken = await getIdToken();
      const lp = state.lessonPlan;
      const res = await fetch(`${API_BASE}/lesson-plans/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          title: lp.title,
          age_group: lp.age_group,
          learning_area: lp.learning_area,
          duration_minutes: lp.duration_minutes,
          topic: lp.topic,
          additional_notes: lp.additional_notes,
          objectives: lp.objectives,
          materials: lp.materials,
          activities: lp.activities,
          assessment: lp.assessment,
          adaptations: lp.adaptations,
          dskp_standards: lp.dskp_standards,
          teacher_notes: lp.teacher_notes,
          language: lp.language,
          plan_type: lp.plan_type || state.planType,
          duration_weeks: lp.duration_weeks || (state.planType === "unit" ? parseInt(state.durationWeeks) : null),
          unit_theme: lp.unit_theme,
          weeks: lp.weeks,
          image_style: lp.image_style || state.imageStyle,
        }),
      });

      if (!res.ok) throw new Error(`Failed to save ${planLabel.toLowerCase()}`);

      toast.success(`${planLabel} saved!`);
      dispatch({ type: "RESET_FORM" });
      fetchSavedPlans();
      setActiveTab("list");
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save ${planLabel.toLowerCase()}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    const plan = savedPlans.find(p => p.id === planId);
    const label = plan?.plan_type === "unit" ? "Unit Plan" : "Lesson Plan";
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/lesson-plans/${planId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) {
        toast.success(`${label} deleted`);
        if (viewingPlan?.id === planId) setViewingPlan(null);
        setDeletingPlanId(null);
        fetchSavedPlans();
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.detail || errorData.message || `Failed to delete ${label}`;
        toast.error(errorMsg);
      }
    } catch (err) {
      toast.error("Failed to delete - network error");
      console.error("Delete error:", err);
    }
  };

  // Helper: update an array item in lessonPlan
  const updatePlanArrayItem = (field, index, value) => {
    const arr = [...(state.lessonPlan[field] || [])];
    arr[index] = value;
    dispatch({ type: "UPDATE_PLAN_FIELD", field, value: arr });
  };

  const removePlanArrayItem = (field, index) => {
    const arr = [...(state.lessonPlan[field] || [])];
    arr.splice(index, 1);
    dispatch({ type: "UPDATE_PLAN_FIELD", field, value: arr });
  };

  const addPlanArrayItem = (field, defaultValue) => {
    const arr = [...(state.lessonPlan[field] || []), defaultValue];
    dispatch({ type: "UPDATE_PLAN_FIELD", field, value: arr });
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
                  <Sparkles className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">
                    Lesson Planning Assistant Powered by AI
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate DSKP-aligned lesson plans powered by Gemini AI
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate("/teacher")}
                className="cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 min-h-[80vh]">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generator" className="cursor-pointer">
                Generator
              </TabsTrigger>
              <TabsTrigger value="list" className="cursor-pointer">
                My Plans
              </TabsTrigger>
            </TabsList>

            {/* ══════════════════════════════════════════════════════════
              TAB 1: GENERATOR  (form → generating → review)
              ══════════════════════════════════════════════════════════ */}
            <TabsContent value="generator" className="space-y-6 min-h-[500px]">
              {/* ─── STEP I: INPUT FORM ─── */}
              {state.step === "form" && (
              <div className="space-y-4">
                <Card className="border-2 border-indigo-200 shadow-md">
                  <CardHeader className="bg-linear-to-r from-indigo-100 to-purple-100">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <Lightbulb className="h-5 w-5 text-[#3090A0]" />
                      {planLabel} Generator
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-700 mb-2">
                      Fill in your lesson details below. AI will generate a DSKP
                      KSPK 2026-aligned {planLabel.toLowerCase()} for you.
                    </CardDescription>
                    <div className="pb-3"></div>
                  </CardHeader>

                  <CardContent className="space-y-4 text-base">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      {/* Plan Type */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          Plan Type
                        </Label>
                        <Select
                          value={state.planType}
                          onValueChange={(val) =>
                            dispatch({
                              type: "SET_FIELD",
                              field: "planType",
                              value: val,
                            })
                          }
                        >
                          <SelectTrigger className="text-sm font-medium">
                            <SelectValue placeholder="Select plan type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="subject">Single Topic</SelectItem>
                            <SelectItem value="unit">Unit Plan (Multi-Week)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Duration Weeks — only for unit plans */}
                      {state.planType === "unit" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Label className="text-sm font-semibold">
                              Unit Plan Duration
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="cursor-help" type="button">
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-sm">How many weeks will this unit plan span?</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Select
                            value={state.durationWeeks}
                            onValueChange={(val) =>
                              dispatch({
                                type: "SET_FIELD",
                                field: "durationWeeks",
                                value: val,
                              })
                            }
                          >
                            <SelectTrigger className="text-sm font-medium">
                              <SelectValue placeholder="Select weeks" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3 weeks</SelectItem>
                              <SelectItem value="4">4 weeks</SelectItem>
                              <SelectItem value="5">5 weeks</SelectItem>
                              <SelectItem value="6">6 weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Age Group */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          Age Group
                        </Label>
                        <Select
                          value={state.ageGroup}
                          onValueChange={(val) =>
                            dispatch({
                              type: "SET_FIELD",
                              field: "ageGroup",
                              value: val,
                            })
                          }
                        >
                          <SelectTrigger className="text-sm font-medium">
                            <SelectValue placeholder="Select age group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">4 years old</SelectItem>
                            <SelectItem value="5">5 years old</SelectItem>
                            <SelectItem value="6">6 years old</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Learning Area */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          Learning Area
                        </Label>
                        <Select
                          value={state.learningArea}
                          onValueChange={(val) => {
                            dispatch({
                              type: "SET_FIELD",
                              field: "learningArea",
                              value: val,
                            });
                            // Auto-set language from literacy selection
                            if (val === "literacy_bm")
                              dispatch({
                                type: "SET_FIELD",
                                field: "language",
                                value: "bm",
                              });
                            else if (val === "literacy_en")
                              dispatch({
                                type: "SET_FIELD",
                                field: "language",
                                value: "en",
                              });
                          }}
                        >
                          <SelectTrigger className="text-sm font-medium">
                            <SelectValue placeholder="Select learning area" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="literacy_bm">
                              Literacy (Bahasa Melayu)
                            </SelectItem>
                            <SelectItem value="literacy_en">
                              Literacy (English)
                            </SelectItem>
                            <SelectItem value="numeracy">Numeracy</SelectItem>
                            <SelectItem value="social">
                              Social Skills
                            </SelectItem>
                            <SelectItem value="motor">Motor Skills</SelectItem>
                            <SelectItem value="creative">
                              Creative Arts
                            </SelectItem>
                            <SelectItem value="cognitive">
                              Cognitive Development
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Moral Education Toggle — only for Social Skills */}
                      {state.learningArea === "social" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            Moral / Islam Education
                          </Label>
                          <Select
                            value={state.moralEducation}
                            onValueChange={(val) =>
                              dispatch({
                                type: "SET_FIELD",
                                field: "moralEducation",
                                value: val,
                              })
                            }
                          >
                            <SelectTrigger className="text-sm font-medium">
                              <SelectValue placeholder="Select education stream" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="moral">
                                Pendidikan Moral
                              </SelectItem>
                              <SelectItem value="islam">
                                Pendidikan Islam
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Language of Delivery — not shown for Literacy (implicit) */}
                      {state.learningArea !== "literacy_bm" &&
                        state.learningArea !== "literacy_en" && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Language of Delivery
                            </Label>
                            <Select
                              value={state.language}
                              onValueChange={(val) =>
                                dispatch({
                                  type: "SET_FIELD",
                                  field: "language",
                                  value: val,
                                })
                              }
                            >
                              <SelectTrigger className="text-sm font-medium">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bm">
                                  Bahasa Malaysia
                                </SelectItem>
                                <SelectItem value="en">English</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                      {/* Duration (minutes) */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm font-semibold">
                            {state.planType === "unit"
                              ? "Weekly Duration"
                              : "Session Duration"}
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help" type="button">
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="text-sm">
                                  {state.planType === "unit"
                                    ? "Total learning time per week. Activities will be designed to fit within this time budget each week."
                                    : "Total duration of this single lesson session."}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Select
                          value={state.duration}
                          onValueChange={(val) =>
                            dispatch({
                              type: "SET_FIELD",
                              field: "duration",
                              value: val,
                            })
                          }
                        >
                          <SelectTrigger className="text-sm font-medium">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="20">20 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Lesson Topic *
                      </Label>
                      <Textarea
                        className="text-sm"
                        placeholder="e.g., The letter 'B' and animals that start with B"
                        rows={2}
                        value={state.topic}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_FIELD",
                            field: "topic",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Additional Notes (Optional)
                      </Label>
                      <Textarea
                        className="text-sm"
                        placeholder="Any specific requirements, student considerations, or resources you'd like to include..."
                        rows={3}
                        value={state.additionalNotes}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_FIELD",
                            field: "additionalNotes",
                            value: e.target.value,
                          })
                        }
                      />
                    </div>

                    <Button
                      onClick={generateLessonPlan}
                      disabled={state.loading}
                      size="lg"
                      className="w-full bg-[#3090A0] hover:bg-[#2FBFA5] text-white font-semibold text-base cursor-pointer"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {state.planType === "unit"
                        ? `Generate ${state.durationWeeks}-Week Unit Plan`
                        : "Generate Lesson Plan"}
                    </Button>
                  </CardContent>
                </Card>
                </div>
              )}

              {/* ─── STEP III: GENERATING (mascot loading) ─── */}
              {state.step === "generating" && (
                <Card className="border-2 border-indigo-200 shadow-md">
                  <CardContent className="pt-8 pb-20 flex flex-col items-center justify-center text-center space-y-8">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      {/* Spinning ring behind the mascot */}
                      <div className="absolute inset-0 rounded-full border-4 border-[#3090A0]/20 border-t-[#3090A0] animate-spin" />
                      <img
                        key={mascotIndex}
                        src={MASCOT_IMAGES[mascotIndex]}
                        alt="SabahSprout mascot"
                        className="w-32 h-32 object-contain animate-in fade-in zoom-in-95 duration-500"
                        style={{
                          animation:
                            "fade-in 500ms ease-out, mascotWobble 2s ease-in-out infinite",
                        }}
                      />
                    </div>
                    <div className="space-y-3 max-w-md">
                      <h2 className="text-xl font-semibold text-gray-800">
                        Generating Your {planLabel}
                      </h2>
                      <p
                        key={mascotIndex}
                        className="text-sm text-muted-foreground animate-in fade-in duration-300"
                      >
                        {LOADING_MESSAGES[mascotIndex]}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ─── STEP IV: REVIEW & CUSTOMISE ─── */}
              {state.step === "review" && state.lessonPlan && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <h2 className="text-xl font-semibold text-gray-800">
                        Review & Customise Your {planLabel}
                      </h2>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <Card className="shadow-md border border-indigo-200">
                    <CardHeader className="bg-linear-to-r from-indigo-50 to-purple-50 pb-4">
                      <div className="space-y-3">
                        <Input
                          className="text-2xl font-bold text-gray-800 border-dashed border-gray-300 bg-white/50"
                          value={state.lessonPlan.title}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PLAN_FIELD",
                              field: "title",
                              value: e.target.value,
                            })
                          }
                        />
                        {state.lessonPlan.topic && (
                          <p className="text-sm text-muted-foreground">
                            Topic:{" "}
                            <span className="font-medium text-gray-700">
                              {state.lessonPlan.topic}
                            </span>
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                          <Badge className="bg-indigo-100 text-indigo-700">
                            <Users className="h-3 w-3 mr-1" /> Ages{" "}
                            {state.lessonPlan.age_group}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700">
                            <Clock className="h-3 w-3 mr-1" />{" "}
                            {state.lessonPlan.duration_minutes} minutes
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-700 capitalize">
                            {LEARNING_AREA_LABELS[
                              state.lessonPlan.learning_area
                            ] || state.lessonPlan.learning_area}
                          </Badge>
                          <Badge className="bg-teal-100 text-teal-700">
                            {state.lessonPlan.language === "en"
                              ? "English"
                              : "Bahasa Malaysia"}
                          </Badge>
                          {state.lessonPlan.learning_area === "social" && (
                            <Badge className="bg-amber-100 text-amber-700">
                              {state.lessonPlan.moral_education === "islam"
                                ? "Pendidikan Islam"
                                : "Pendidikan Moral"}
                            </Badge>
                          )}
                          {state.lessonPlan.plan_type === "unit" && (
                            <Badge className="bg-orange-100 text-orange-700">
                              <Calendar className="h-3 w-3 mr-1" />
                              {state.lessonPlan.duration_weeks || state.durationWeeks}-Week Unit Plan
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* DSKP Standards */}
                  {state.lessonPlan.dskp_standards?.length > 0 && (
                    <Card className="shadow-sm border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <BookOpen className="h-5 w-5 text-emerald-600" />
                          DSKP Standards Referenced
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TooltipProvider>
                          <div className="flex flex-wrap gap-2">
                            {state.lessonPlan.dskp_standards.map((std, i) => {
                              const code =
                                typeof std === "object" ? std.code : std;
                              const title =
                                typeof std === "object" ? std.title : null;
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-1"
                                >
                                  {title ? (
                                    <Tooltip>
                                      <TooltipTrigger className="cursor-help">
                                        <Badge
                                          variant="secondary"
                                          className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-sm"
                                        >
                                          {code}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-xs"
                                      >
                                        <p className="text-sm">{title}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-sm"
                                    >
                                      {code}
                                    </Badge>
                                  )}
                                  <button
                                    onClick={() =>
                                      removePlanArrayItem("dskp_standards", i)
                                    }
                                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                      </CardContent>
                    </Card>
                  )}

                  {/* Learning Objectives — editable */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Target className="h-5 w-5 text-emerald-600" />
                        Learning Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {state.lessonPlan.objectives?.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0 mt-1">
                            {i + 1}
                          </div>
                          <Input
                            className="flex-1 text-sm border-dashed"
                            value={obj}
                            onChange={(e) =>
                              updatePlanArrayItem(
                                "objectives",
                                i,
                                e.target.value,
                              )
                            }
                          />
                          <button
                            onClick={() => removePlanArrayItem("objectives", i)}
                            className="text-gray-400 hover:text-red-500 mt-1.5 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addPlanArrayItem("objectives", "")}
                        className="text-indigo-600 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Objective
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Materials — editable */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Monitor className="h-5 w-5 text-emerald-600" />
                        Digital Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {state.lessonPlan.materials?.map((mat, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-gray-400">•</span>
                          <Input
                            className="flex-1 text-sm border-dashed"
                            value={mat}
                            onChange={(e) =>
                              updatePlanArrayItem(
                                "materials",
                                i,
                                e.target.value,
                              )
                            }
                          />
                          <button
                            onClick={() => removePlanArrayItem("materials", i)}
                            className="text-gray-400 hover:text-red-500 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addPlanArrayItem("materials", "")}
                        className="text-indigo-600 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Resource
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Activity Steps — editable */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Layers className="h-5 w-5 text-emerald-600" />
                        Activities
                      </CardTitle>
                      {state.lessonPlan.plan_type === "unit" &&
                        state.lessonPlan.unit_theme && (
                          <CardDescription className="text-sm text-gray-700 font-medium">
                            Unit Theme: {state.lessonPlan.unit_theme}
                          </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* ── Unit Plan: week-tabbed activities ── */}
                      {state.lessonPlan.plan_type === "unit" &&
                      state.lessonPlan.weeks?.length > 0 ? (
                        <>
                          {/* Week navigation tabs */}
                          <div className="flex gap-1 border-b">
                            {state.lessonPlan.weeks.map((week, wi) => (
                              <button
                                key={wi}
                                type="button"
                                onClick={() => setActiveWeekTab(wi)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors cursor-pointer ${
                                  (activeWeekTab < state.lessonPlan.weeks.length ? activeWeekTab : 0) === wi
                                    ? "bg-orange-50 text-orange-700 border border-b-0 border-orange-200 -mb-px"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                Week {week.week_number || wi + 1}
                              </button>
                            ))}
                          </div>

                          {/* Active week content */}
                          {(() => {
                            const wi =
                              activeWeekTab < state.lessonPlan.weeks.length
                                ? activeWeekTab
                                : 0;
                            const week = state.lessonPlan.weeks[wi];
                            if (!week) return null;

                            const updateWeekActivity = (ai, patch) => {
                              const newWeeks = state.lessonPlan.weeks.map(
                                (w, k) =>
                                  k === wi
                                    ? {
                                        ...w,
                                        activities: w.activities.map((a, j) =>
                                          j === ai ? { ...a, ...patch } : a,
                                        ),
                                      }
                                    : w,
                              );
                              dispatch({
                                type: "UPDATE_PLAN_FIELD",
                                field: "weeks",
                                value: newWeeks,
                              });
                            };

                            return (
                              <div className="space-y-3">
                                {/* Week theme */}
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-orange-100 text-orange-700 shrink-0">
                                    Week {week.week_number || wi + 1}
                                  </Badge>
                                  <Input
                                    className="flex-1 text-sm font-semibold border-dashed"
                                    placeholder="Week theme"
                                    value={week.theme || ""}
                                    onChange={(e) => {
                                      const newWeeks = [
                                        ...state.lessonPlan.weeks,
                                      ];
                                      newWeeks[wi] = {
                                        ...newWeeks[wi],
                                        theme: e.target.value,
                                      };
                                      dispatch({
                                        type: "UPDATE_PLAN_FIELD",
                                        field: "weeks",
                                        value: newWeeks,
                                      });
                                    }}
                                  />
                                </div>

                                {/* Week activities */}
                                {week.activities?.map((activity, ai) => (
                                  <div
                                    key={ai}
                                    className="flex gap-3 p-4 border rounded-lg bg-gray-50 relative"
                                  >
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <Input
                                          className="font-semibold text-gray-800 border-dashed flex-1"
                                          value={activity.title}
                                          onChange={(e) =>
                                            updateWeekActivity(ai, {
                                              title: e.target.value,
                                            })
                                          }
                                        />
                                        <Input
                                          className="w-28 text-sm border-dashed text-blue-700"
                                          value={activity.duration || ""}
                                          onChange={(e) =>
                                            updateWeekActivity(ai, {
                                              duration: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <Textarea
                                        className="text-sm border-dashed"
                                        rows={2}
                                        value={activity.description || ""}
                                        onChange={(e) =>
                                          updateWeekActivity(ai, {
                                            description: e.target.value,
                                          })
                                        }
                                      />
                                      <div className="flex items-center gap-2 pt-1">
                                        <Label className="text-xs font-semibold text-gray-500 shrink-0">
                                          Type
                                        </Label>
                                        <Select
                                          value={activity.type || "quiz"}
                                          onValueChange={(val) =>
                                            updateWeekActivity(ai, {
                                              type: val,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="w-40 h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {ACTIVITY_TYPE_OPTIONS.map(
                                              (opt) => (
                                                <SelectItem
                                                  key={opt.value}
                                                  value={opt.value}
                                                >
                                                  <span className="flex items-center gap-1.5">
                                                    <opt.icon className="h-3.5 w-3.5" />
                                                    {opt.label}
                                                  </span>
                                                </SelectItem>
                                              ),
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const newWeeks =
                                          state.lessonPlan.weeks.map((w, k) =>
                                            k === wi
                                              ? {
                                                  ...w,
                                                  activities:
                                                    w.activities.filter(
                                                      (_, j) => j !== ai,
                                                    ),
                                                }
                                              : w,
                                          );
                                        dispatch({
                                          type: "UPDATE_PLAN_FIELD",
                                          field: "weeks",
                                          value: newWeeks,
                                        });
                                      }}
                                      className="text-gray-400 hover:text-red-500 absolute top-2 right-2 cursor-pointer"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newWeeks = [
                                      ...state.lessonPlan.weeks,
                                    ];
                                    newWeeks[wi] = {
                                      ...newWeeks[wi],
                                      activities: [
                                        ...(newWeeks[wi].activities || []),
                                        {
                                          title: "",
                                          description: "",
                                          duration: "30 minutes",
                                          type: "quiz",
                                        },
                                      ],
                                    };
                                    dispatch({
                                      type: "UPDATE_PLAN_FIELD",
                                      field: "weeks",
                                      value: newWeeks,
                                    });
                                  }}
                                  className="text-indigo-600 cursor-pointer"
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add
                                  Activity
                                </Button>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        /* ── Regular Lesson Plan: flat activity list ── */
                        <>
                          {state.lessonPlan.activities?.map((activity, i) => {
                            return (
                              <div
                                key={i}
                                className="flex gap-3 p-4 border rounded-lg bg-gray-50 relative"
                              >
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <Input
                                      className="font-semibold text-gray-800 border-dashed flex-1"
                                      value={activity.title}
                                      onChange={(e) => {
                                        const newActs = [
                                          ...state.lessonPlan.activities,
                                        ];
                                        newActs[i] = {
                                          ...newActs[i],
                                          title: e.target.value,
                                        };
                                        dispatch({
                                          type: "UPDATE_PLAN_FIELD",
                                          field: "activities",
                                          value: newActs,
                                        });
                                      }}
                                    />
                                    <Input
                                      className="w-28 text-sm border-dashed text-blue-700"
                                      value={activity.duration}
                                      onChange={(e) => {
                                        const newActs = [
                                          ...state.lessonPlan.activities,
                                        ];
                                        newActs[i] = {
                                          ...newActs[i],
                                          duration: e.target.value,
                                        };
                                        dispatch({
                                          type: "UPDATE_PLAN_FIELD",
                                          field: "activities",
                                          value: newActs,
                                        });
                                      }}
                                    />
                                  </div>
                                  <Textarea
                                    className="text-sm border-dashed"
                                    rows={2}
                                    value={activity.description}
                                    onChange={(e) => {
                                      const newActs = [
                                        ...state.lessonPlan.activities,
                                      ];
                                      newActs[i] = {
                                        ...newActs[i],
                                        description: e.target.value,
                                      };
                                      dispatch({
                                        type: "UPDATE_PLAN_FIELD",
                                        field: "activities",
                                        value: newActs,
                                      });
                                    }}
                                  />
                                  <div className="flex items-center gap-2 pt-1">
                                    <Label className="text-xs font-semibold text-gray-500 shrink-0">
                                      Type
                                    </Label>
                                    <Select
                                      value={activity.type || "quiz"}
                                      onValueChange={(val) => {
                                        const newActs = [
                                          ...state.lessonPlan.activities,
                                        ];
                                        newActs[i] = {
                                          ...newActs[i],
                                          type: val,
                                        };
                                        dispatch({
                                          type: "UPDATE_PLAN_FIELD",
                                          field: "activities",
                                          value: newActs,
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="w-40 h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                                          <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                          >
                                            <span className="flex items-center gap-1.5">
                                              <opt.icon className="h-3.5 w-3.5" />
                                              {opt.label}
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    removePlanArrayItem("activities", i)
                                  }
                                  className="text-gray-400 hover:text-red-500 absolute top-2 right-2 cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              addPlanArrayItem("activities", {
                                title: "",
                                description: "",
                                duration: "5 minutes",
                                type: "quiz",
                              })
                            }
                            className="text-indigo-600 cursor-pointer"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Activity
                            Step
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Assessment — editable */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                        Assessment Strategy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        className="text-sm border-dashed"
                        rows={3}
                        value={state.lessonPlan.assessment}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_PLAN_FIELD",
                            field: "assessment",
                            value: e.target.value,
                          })
                        }
                      />
                    </CardContent>
                  </Card>

                  {/* Adaptations — editable */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Lightbulb className="h-5 w-5 text-emerald-600" />
                        Adaptations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {state.lessonPlan.adaptations?.map((adp, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-indigo-600 shrink-0 mt-2" />
                          <Input
                            className="flex-1 text-sm border-dashed"
                            value={adp}
                            onChange={(e) =>
                              updatePlanArrayItem(
                                "adaptations",
                                i,
                                e.target.value,
                              )
                            }
                          />
                          <button
                            onClick={() =>
                              removePlanArrayItem("adaptations", i)
                            }
                            className="text-gray-400 hover:text-red-500 mt-1.5 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addPlanArrayItem("adaptations", "")}
                        className="text-indigo-600 cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Adaptation
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Teacher Notes — editable */}
                  {state.lessonPlan.teacher_notes !== undefined && (
                    <Card className="shadow-sm border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Pencil className="h-5 w-5 text-emerald-600" />
                          Teacher Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          className="text-sm border-dashed"
                          rows={3}
                          value={state.lessonPlan.teacher_notes}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_PLAN_FIELD",
                              field: "teacher_notes",
                              value: e.target.value,
                            })
                          }
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Bottom save bar */}
                  <div className="flex justify-end gap-3 pb-8">
                    <Button
                      variant="outline"
                      onClick={() => downloadLessonPlanPDF(state.lessonPlan)}
                      className="cursor-pointer"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <AlertDialog
                      open={showResetDialog}
                      onOpenChange={setShowResetDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="cursor-pointer">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Discard & Start Over
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will discard all changes to the {planLabel.toLowerCase()} and
                            return you to the form. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-3">
                          <AlertDialogCancel className="cursor-pointer">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              dispatch({ type: "RESET_FORM" });
                              setShowResetDialog(false);
                            }}
                            className="bg-red-600 hover:bg-red-700 cursor-pointer"
                          >
                            Discard
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      onClick={saveLessonPlan}
                      disabled={savingPlan}
                      className="bg-[#3090A0] hover:bg-[#2FBFA5] text-white cursor-pointer"
                    >
                      {savingPlan ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {savingPlan ? "Saving…" : "Save to My Plans"}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════
              TAB 2: MY PLANS LIST
              ══════════════════════════════════════════════════════════ */}
            <TabsContent value="list" className="space-y-6 min-h-[600px]">
              {/* Detail view of a saved plan */}
              {viewingPlan ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <Card className="shadow-md border border-indigo-200">
                    <CardHeader className="bg-linear-to-r from-indigo-50 to-purple-50 pb-5">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2">
                          <CardTitle className="text-2xl font-bold text-gray-800">
                            {viewingPlan.title}
                          </CardTitle>
                          {viewingPlan.topic && (
                            <p className="text-sm text-muted-foreground">
                              Topic:{" "}
                              <span className="font-medium text-gray-700">
                                {viewingPlan.topic}
                              </span>
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                            <Badge className="bg-indigo-100 text-indigo-700">
                              <Users className="h-3 w-3 mr-1" /> Ages{" "}
                              {viewingPlan.age_group}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-700">
                              <Clock className="h-3 w-3 mr-1" />{" "}
                              {viewingPlan.duration_minutes} min
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-700 capitalize">
                              {LEARNING_AREA_LABELS[
                                viewingPlan.learning_area
                              ] || viewingPlan.learning_area}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => downloadLessonPlanPDF(viewingPlan)}
                            className="cursor-pointer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                          </Button>
                          <Button
                            onClick={() => setViewingPlan(null)}
                            className="bg-[#3090A0] hover:bg-[#2FBFA5] text-white cursor-pointer"
                          >
                            Back to List
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* DSKP Standards */}
                  {viewingPlan.dskp_standards?.length > 0 && (
                    <Card className="shadow-sm border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <BookOpen className="h-5 w-5 text-emerald-600" />
                          DSKP Standards
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TooltipProvider>
                          <div className="flex flex-wrap gap-2">
                            {viewingPlan.dskp_standards.map((std, i) => {
                              const code =
                                typeof std === "object" ? std.code : std;
                              const title =
                                typeof std === "object" ? std.title : null;
                              return title ? (
                                <Tooltip key={i}>
                                  <TooltipTrigger className="cursor-help">
                                    <Badge
                                      variant="secondary"
                                      className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-sm"
                                    >
                                      {code}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs"
                                  >
                                    <p className="text-sm">{title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-sm"
                                >
                                  {code}
                                </Badge>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                      </CardContent>
                    </Card>
                  )}

                  {/* Objectives */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Target className="h-5 w-5 text-emerald-600" /> Learning
                        Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {(viewingPlan.objectives || []).map((obj, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <span className="text-gray-700 font-medium">
                              {obj}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Digital Resources */}
                  {viewingPlan.materials?.length > 0 && (
                    <Card className="shadow-sm border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Monitor className="h-5 w-5 text-emerald-600" />{" "}
                          Digital Resources
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {viewingPlan.materials.map((mat, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-700"
                            >
                              <span className="text-emerald-500 mt-0.5">•</span>
                              <span>{mat}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activities */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Layers className="h-5 w-5 text-emerald-600" />{" "}
                        Activities
                      </CardTitle>
                      {viewingPlan.plan_type === "unit" &&
                        viewingPlan.unit_theme && (
                          <p className="text-sm text-gray-700 font-medium">
                            Unit Theme: {viewingPlan.unit_theme}
                          </p>
                        )}
                    </CardHeader>
                    <CardContent>
                      {/* UNP: week-tabbed */}
                      {viewingPlan.plan_type === "unit" &&
                      viewingPlan.weeks?.length > 0 ? (
                        <>
                          <div className="flex gap-1 border-b mb-4">
                            {viewingPlan.weeks.map((week, wi) => (
                              <button
                                key={wi}
                                type="button"
                                onClick={() => setViewingWeekTab(wi)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors cursor-pointer ${
                                  (viewingWeekTab < viewingPlan.weeks.length
                                    ? viewingWeekTab
                                    : 0) === wi
                                    ? "bg-orange-50 text-orange-700 border border-b-0 border-orange-200 -mb-px"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <Calendar className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                                Week {week.week_number || wi + 1}
                              </button>
                            ))}
                          </div>
                          {(() => {
                            const wi =
                              viewingWeekTab < viewingPlan.weeks.length
                                ? viewingWeekTab
                                : 0;
                            const week = viewingPlan.weeks[wi];
                            if (!week) return null;
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <Badge className="bg-orange-100 text-orange-700">
                                    Week {week.week_number || wi + 1}
                                  </Badge>
                                  <span className="text-sm font-semibold text-gray-800">
                                    {week.theme}
                                  </span>
                                </div>
                                {(week.activities || []).map((act, ai) => {
                                  const typeOpt = ACTIVITY_TYPE_OPTIONS.find(
                                    (t) => t.value === act.type,
                                  );
                                  return (
                                    <div
                                      key={ai}
                                      className="flex gap-3 p-3 border rounded-lg bg-gray-50"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <h3 className="font-semibold text-gray-800">
                                            {act.title}
                                          </h3>
                                          <div className="flex items-center gap-2">
                                            {typeOpt && (
                                              <Badge className={typeOpt.color}>
                                                <typeOpt.icon className="h-3 w-3 mr-1" />
                                                {typeOpt.label}
                                              </Badge>
                                            )}
                                            {act.duration && (
                                              <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {act.duration}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          {act.description}
                                        </p>
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
                        <div className="space-y-4">
                          {(viewingPlan.activities || []).map((act, i) => {
                            const typeOpt = ACTIVITY_TYPE_OPTIONS.find(
                              (t) => t.value === act.type,
                            );
                            return (
                              <div
                                key={i}
                                className="flex gap-3 p-3 border rounded-lg bg-gray-50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-gray-800">
                                      {act.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      {typeOpt && (
                                        <Badge className={typeOpt.color}>
                                          <typeOpt.icon className="h-3 w-3 mr-1" />
                                          {typeOpt.label}
                                        </Badge>
                                      )}
                                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {act.duration}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {act.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Assessment */}
                  <Card className="shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <ClipboardCheck className="h-5 w-5 text-emerald-600" />{" "}
                        Assessment Strategy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-sm text-gray-700">
                          {viewingPlan.assessment}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Adaptations */}
                  {viewingPlan.adaptations?.length > 0 && (
                    <Card className="shadow-sm border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Lightbulb className="h-5 w-5 text-emerald-600" />{" "}
                          Adaptations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {viewingPlan.adaptations.map((adp, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200"
                            >
                              <Lightbulb className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                              <p className="text-sm text-gray-700">{adp}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Teacher Notes */}
                  {viewingPlan.teacher_notes && (
                    <Card className="shadow-sm border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Pencil className="h-5 w-5 text-emerald-600" />{" "}
                          Teacher Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {viewingPlan.teacher_notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                /* Plans list */
                <Card className="border-2 border-indigo-200 shadow-md">
                  <CardHeader className="bg-linear-to-r from-indigo-100 to-purple-100">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold">My Plans</CardTitle>
                    <CardDescription className="text-sm text-gray-700 mb-2">
                      Click a plan to view details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingPlans ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-gray-100 rounded animate-pulse w-2/5" />
                              <div className="flex gap-2">
                                <div className="h-5 bg-gray-100 rounded-full animate-pulse w-20" />
                                <div className="h-5 bg-gray-100 rounded-full animate-pulse w-14" />
                                <div className="h-5 bg-gray-100 rounded-full animate-pulse w-16" />
                              </div>
                            </div>
                            <div className="h-4 bg-gray-100 rounded animate-pulse w-16 ml-4" />
                          </div>
                        ))}
                      </div>
                    ) : savedPlans.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No plans yet. Go to the Generator tab to create one.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {savedPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => { setViewingPlan(plan); setViewingWeekTab(0); }}
                          >
                            <div>
                              <p className="text-lg font-semibold font-serif">{plan.title}</p>
                              <div className="flex gap-2 mt-1">
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
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {LEARNING_AREA_LABELS[plan.learning_area] ||
                                    plan.learning_area}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {plan.duration_minutes} min
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Ages {plan.age_group}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {plan.created_at
                                  ? formatDateTime(plan.created_at)
                                  : ""}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 h-8 w-8 p-0 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingPlanId(plan.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
        </div>

        {/* Delete Lesson Plan Dialog */}
        <AlertDialog open={!!deletingPlanId} onOpenChange={(open) => { if (!open) setDeletingPlanId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this lesson plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the lesson plan and all its content. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                onClick={() => handleDeletePlan(deletingPlanId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
