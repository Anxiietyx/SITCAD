import { useReducer, useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import Duckpit from './Duckpit';
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Target,
  Clock,
  Users,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { lessonReducer, initialState } from "../reducers/lessonReducer";

const API_BASE = "http://localhost:8000";

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Not authenticated");
  return firebaseUser.getIdToken();
}

export function AILessonPlanning() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(lessonReducer, initialState);
  const [savedPlans, setSavedPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("generator");

  const fetchSavedPlans = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    if (user?.role === "teacher") fetchSavedPlans();
  }, [user, fetchSavedPlans]);

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  const generateLessonPlan = async () => {
    if (!state.topic) {
      toast.error("Please enter a topic for the lesson");
      return;
    }

    dispatch({ type: "START_GENERATION" });

    // Simulate AI generation with a delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock AI-generated lesson plan
    const mockLessonPlan = {
      id: `lesson_${Date.now()}`,
      title: `${state.topic} Exploration`,
      ageGroup: state.ageGroup,
      learningArea: state.learningArea,
      duration: `${state.duration} minutes`,
      targetScore: state.targetScore,
      scoringType: state.scoringType,
      objectives: [
        `Introduce basic concepts of ${state.topic}`,
        "Develop fine motor skills through hands-on activities",
        "Encourage verbal expression and communication",
        "Foster curiosity and exploration",
      ],
      materials: [
        "Visual aids and picture cards",
        "Hands-on manipulatives",
        "Art supplies (crayons, paper, scissors)",
        "Interactive storybooks",
        "Music player for transitions",
      ],
      activities: [
        {
          step: 1,
          title: "Circle Time Introduction",
          description: `Gather students in a circle and introduce the topic of ${state.topic}. Use visual aids and encourage students to share what they know.`,
          duration: "5-7 minutes",
        },
        {
          step: 2,
          title: "Interactive Story",
          description: `Read an engaging story related to ${state.topic}. Pause to ask questions and encourage predictions.`,
          duration: "8-10 minutes",
        },
        {
          step: 3,
          title: "Hands-On Activity",
          description: `Students explore ${state.topic} through a structured activity with manipulatives. Teacher circulates to provide support.`,
          duration: "10-12 minutes",
        },
        {
          step: 4,
          title: "Creative Expression",
          description:
            "Students create artwork or crafts related to the lesson topic, reinforcing concepts learned.",
          duration: "8-10 minutes",
        },
        {
          step: 5,
          title: "Closing & Review",
          description:
            "Gather students to review what they learned. Sing a related song and preview upcoming activities.",
          duration: "3-5 minutes",
        },
      ],
      assessment:
        "Observe student participation, listen to verbal responses, and review completed activities. Note students who may need additional support or enrichment.",
      adaptations: [
        "For visual learners: Provide extra visual supports and diagrams",
        "For kinesthetic learners: Include more movement-based activities",
        "For advanced students: Offer extension activities with increased complexity",
        "For students needing support: Provide one-on-one assistance and simplified instructions",
        "For English language learners: Use visual cues and gestures to support understanding",
      ],
    };

    dispatch({ type: "FINISH_GENERATION", payload: mockLessonPlan });
    toast.success("Lesson plan generated successfully!");
  };

  const saveLessonPlan = async () => {
    dispatch({ type: "SET_SAVED_MSG", payload: true });
    setTimeout(() => {
      dispatch({ type: "SET_SAVED_MSG", payload: false });
    }, 2000);
    dispatch({ type: "START_GENERATION" });
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/lesson-plans/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          title: state.topic,
          age_group: state.ageGroup,
          learning_area: state.learningArea,
          duration_minutes: parseInt(state.duration),
          topic: state.topic,
          additional_notes: state.additionalNotes || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate lesson plan");
      const plan = await res.json();
      dispatch({ type: "FINISH_GENERATION", payload: plan });
      toast.success("Lesson plan generated and saved!");
      fetchSavedPlans();
      setActiveTab("list");
    } catch (err) {
      console.error(err);
      dispatch({ type: "FINISH_GENERATION", payload: null });
      toast.error("Failed to generate lesson plan");
    }
  };

  const deletePlan = async (planId) => {
    if (!window.confirm("Delete this lesson plan?")) return;
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/lesson-plans/${planId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) {
        toast.success("Lesson plan deleted");
        if (state.lessonPlan?.id === planId) dispatch({ type: "FINISH_GENERATION", payload: null });
        fetchSavedPlans();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
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
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Lesson Planning Assistant Powered by AI</h1>
                <p className="text-sm text-muted-foreground mt-1">Generate planning lesson powered by AI</p>
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
            <TabsTrigger value="generator">Generator</TabsTrigger>
            <TabsTrigger value="list">My Plans</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Generator ── */}
          <TabsContent value="generator" className="space-y-6">
        {/* Input Form */}
        <Card className="border-2 border-indigo-200 shadow-md">
          <CardHeader className="bg-linear-to-r from-indigo-100 to-purple-100">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Lightbulb className="h-5 w-5 text-[#3090A0]" />
              Lesson Plan Generator
            </CardTitle>
            <CardDescription className="text-sm text-gray-700">
              Enter your lesson details and let AI generate a structured lesson
              plan with objectives, activities, and assessment strategies.
            </CardDescription>
            <div className="pb-3"></div>
          </CardHeader>

          <CardContent className="pt-2 space-y-4 text-base">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Age Group</Label>
                <Select value={state.ageGroup} onValueChange={(val) => dispatch({ type: "SET_FIELD", field: "ageGroup", value: val })}>
                  <SelectTrigger className="text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 years old</SelectItem>
                    <SelectItem value="5">5 years old</SelectItem>
                    <SelectItem value="6">6 years old</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Learning Area</Label>
                <Select value={state.learningArea} onValueChange={(val) => dispatch({ type: "SET_FIELD", field: "learningArea", value: val })}>
                  <SelectTrigger className="text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="literacy">Literacy</SelectItem>
                    <SelectItem value="numeracy">Numeracy</SelectItem>
                    <SelectItem value="social">Social Skills</SelectItem>
                    <SelectItem value="motor">Motor Skills</SelectItem>
                    <SelectItem value="creative">Creative Arts</SelectItem>
                    <SelectItem value="cognitive">
                      Cognitive Development
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Duration (minutes)
                </Label>
                <Select value={state.duration} onValueChange={(val) => dispatch({ type: "SET_FIELD", field: "duration", value: val })}>
                  <SelectTrigger className="text-sm font-medium">
                    <SelectValue />
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
              <Label className="text-sm font-semibold">Lesson Topic *</Label>
              <Textarea
                className="text-sm"
                placeholder="e.g., The letter 'B' and animals that start with B"
                rows={2}
                value={state.topic}
                onChange={(e) => dispatch({ type: "SET_FIELD", field: "topic", value: e.target.value })}
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
                onChange={(e) => dispatch({ type: "SET_FIELD", field: "additionalNotes", value: e.target.value })}
              />
            </div>

            <Button
              onClick={generateLessonPlan}
              disabled={state.loading}
              size="lg"
              className="w-full bg-[#3090A0] hover:bg-[#2FBFA5] text-white font-semibold text-base"
            >
              {state.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Lesson Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Lesson Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
          </TabsContent>

          {/* ── Tab 2: My Plans ── */}
          <TabsContent value="list" className="space-y-6">

        {/* Saved Lesson Plans Library */}
        {!state.lessonPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Lesson Plans</CardTitle>
              <CardDescription>Click a plan to view details</CardDescription>
            </CardHeader>
            <CardContent>
              {savedPlans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No lesson plans yet. Go to the Generator tab to create one.
                </p>
              ) : (
              <div className="space-y-3">
                {savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => dispatch({ type: "FINISH_GENERATION", payload: {
                      id: plan.id,
                      title: plan.title,
                      ageGroup: plan.age_group,
                      learningArea: plan.learning_area,
                      duration: `${plan.duration_minutes} minutes`,
                      targetScore: plan.target_score ?? "70",
                      scoringType: plan.scoring_type ?? "percentage",
                      objectives: plan.objectives ?? [],
                      activities: plan.activities ?? [],
                      assessment: plan.assessment ?? "",
                      adaptations: plan.adaptations ?? [],
                    }})}
                  >
                    <div>
                      <p className="font-medium">{plan.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">{plan.learning_area}</Badge>
                        <Badge variant="outline" className="text-xs">{plan.duration_minutes} min</Badge>
                        <Badge variant="outline" className="text-xs">Ages {plan.age_group}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : ""}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
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

        {/* Generated / Viewed Lesson Plan */}
        {state.lessonPlan && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <Card className="shadow-md border border-indigo-200">
              <CardHeader className="bg-linear-to-r from-indigo-50 to-purple-50">
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
                      {state.lessonPlan.title}
                    </CardTitle>

                    <div className="flex flex-wrap gap-2 mt-2 text-xs md:text-sm">
                      <Badge className="bg-indigo-100 text-indigo-700 font-medium">
                        <Users className="h-3 w-3 mr-1" />
                        Ages {state.lessonPlan.ageGroup}
                      </Badge>

                      <Badge className="bg-blue-100 text-blue-700 font-medium">
                        <Clock className="h-3 w-3 mr-1" />
                        {state.lessonPlan.duration}
                      </Badge>

                      <Badge className="bg-purple-100 text-purple-700 capitalize font-medium">
                        {state.lessonPlan.learningArea}
                      </Badge>

                      <Badge className="bg-green-100 text-green-700 font-medium">
                        🎯 Target: {state.lessonPlan.targetScore}%
                      </Badge>

                      <Badge className="bg-orange-100 text-orange-700 font-medium">
                        📊 {state.lessonPlan.scoringType}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => dispatch({ type: "FINISH_GENERATION", payload: null })}
                    >
                      Back to List
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Learning Objectives */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Target className="h-5 w-5 text-indigo-600" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 text-base">
                  {state.lessonPlan.objectives.map((obj, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-gray-700 font-medium">{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Activity Steps */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Activity Sequence
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {state.lessonPlan.activities.map((activity) => (
                    <div
                      key={activity.step}
                      className="flex gap-3 p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-400 to-purple-400 text-white flex items-center justify-center text-lg font-bold shrink-0">
                        {activity.step}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-800">
                            {activity.title}
                          </h3>

                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="h-3 w-3 mr-1" />
                            {activity.duration}
                          </Badge>
                        </div>

                        <p className="text-base text-gray-600">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Assessment */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Assessment Strategy
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-base text-gray-700 font-medium">
                    {state.lessonPlan.assessment}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Adaptations */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Adaptations
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {state.lessonPlan.adaptations.map((adaptation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200"
                    >
                      <Lightbulb className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-base text-gray-700 font-medium">
                        {adaptation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
}
