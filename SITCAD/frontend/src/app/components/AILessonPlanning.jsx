import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
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

const API_BASE = "http://localhost:8000";

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Not authenticated");
  return firebaseUser.getIdToken();
}
import Duckpit from './Duckpit';

export function AILessonPlanning() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("generator");

  const [ageGroup, setAgeGroup] = useState("5");
  const [learningArea, setLearningArea] = useState("literacy");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30");
  const [additionalNotes, setAdditionalNotes] = useState("");

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
    if (!topic) {
      toast.error("Please enter a topic for the lesson");
      return;
    }

    setLoading(true);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/lesson-plans/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          title: `${topic}`,
          age_group: ageGroup,
          learning_area: learningArea,
          duration_minutes: parseInt(duration),
          topic,
          additional_notes: additionalNotes || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate lesson plan");
      const plan = await res.json();
      setLessonPlan(plan);
      toast.success("Lesson plan generated and saved!");
      fetchSavedPlans();
      setActiveTab("list");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate lesson plan");
    } finally {
      setLoading(false);
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
        if (lessonPlan?.id === planId) setLessonPlan(null);
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Lesson Planning Assistant Powered by AI</h1>
                <p className="text-sm text-muted-foreground mt-1">Generate planning lesson powered by AI</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate("/teacher")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
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
                <Select value={ageGroup} onValueChange={setAgeGroup}>
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
                <Select value={learningArea} onValueChange={setLearningArea}>
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
                <Select value={duration} onValueChange={setDuration}>
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
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
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
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={generateLessonPlan}
              disabled={loading}
              size="lg"
              className="w-full bg-[#3090A0] hover:bg-[#2FBFA5] text-white font-semibold text-base"
            >
              {loading ? (
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
        {!lessonPlan && (
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
                    onClick={() => setLessonPlan(plan)}
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
        {lessonPlan && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <Card className="shadow-md border border-indigo-200">
              <CardHeader className="bg-linear-to-r from-indigo-50 to-purple-50">
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
                      {lessonPlan.title}
                    </CardTitle>

                    <div className="flex flex-wrap gap-2 mt-2 text-xs md:text-sm">
                      <Badge className="bg-indigo-100 text-indigo-700 font-medium">
                        <Users className="h-3 w-3 mr-1" />
                        Ages {lessonPlan.age_group}
                      </Badge>

                      <Badge className="bg-blue-100 text-blue-700 font-medium">
                        <Clock className="h-3 w-3 mr-1" />
                        {lessonPlan.duration_minutes} minutes
                      </Badge>

                      <Badge className="bg-purple-100 text-purple-700 capitalize font-medium">
                        {lessonPlan.learning_area}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setLessonPlan(null)}
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
                  {lessonPlan.objectives?.map((obj, index) => (
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
                  {lessonPlan.activities?.map((activity) => (
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
                    {lessonPlan.assessment}
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
                  {lessonPlan.adaptations?.map((adaptation, index) => (
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
