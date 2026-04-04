import { useReducer, useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import Duckpit from './Duckpit';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import {
  ArrowLeft,
  Plus,
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
} from "lucide-react";


const API_BASE = "http://localhost:8000";

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Not authenticated");
  return firebaseUser.getIdToken();
}

const activityTypes = [
  { value: "literacy", label: "Literacy", icon: Book, color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30" },
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

  // Backend data
  const [activities, setActivities] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);

  // Report generation state
  const [reportScore, setReportScore] = useState("");
  const [reportTotal, setReportTotal] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);

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

  const fetchStudents = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/teachers/my-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) setStudents(await res.json());
    } catch (err) {
      console.error("Failed to fetch students:", err);
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
      fetchStudents();
      fetchLessonPlans();
    }
  }, [user, fetchActivities, fetchStudents, fetchLessonPlans]);

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  const handleBack = () => navigate("/teacher");

  const handleCreateActivity = async () => {
    if (!state.title || !state.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          title: state.title,
          description: state.description,
          learning_area: state.type,
          duration_minutes: parseInt(state.duration),
          assigned_to: state.assignTo === "all" ? "class" : "individual",
          student_ids: state.assignTo === "individual" ? state.selectedStudents : undefined,
          lesson_plan_id: state.lessonPlanId || undefined,
          source: state.lessonPlanId ? "lesson_plan" : "manual",
        }),
      });

      if (!res.ok) throw new Error("Failed to create activity");
      toast.success(`Activity "${state.title}" created successfully!`);
      dispatch({ type: "RESET_FORM" });
      dispatch({ type: "SET_OPEN", payload: false });
      fetchActivities();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create activity");
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
                <p className="text-sm text-muted-foreground mt-1">Create and assign learning activities to students</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleBack} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Activity Type Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {activityTypes.map(({ value, label, icon: Icon, color }) => (
            <Card key={value}>
              <CardContent className="pt-6">
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-3`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-4xl font-bold mb-1">
                  {activities.filter((a) => a.learning_area === value).length}
                </p>
                <p className="text-base font-medium text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activities List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold mb-2">Created Activities</CardTitle>
              <CardDescription className="text-lg text-muted-foreground mb-4 font-medium">
                Manage and track all learning activities
              </CardDescription>
            </div>
            <Dialog open={state.open} onOpenChange={(v) => { dispatch({ type: "SET_OPEN", payload: v }); if (!v) dispatch({ type: "RESET_FORM" }); }}>
              <DialogTrigger asChild>
                <Button size="lg" className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Activity</DialogTitle>
                  <DialogDescription>
                    Design a learning activity for your students
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Tabs */}
                  <Tabs value={state.creationMode} onValueChange={(val) => dispatch({ type: "SET_FIELD", field: "creationMode", value: val })}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Manual</TabsTrigger>
                      <TabsTrigger value="lesson">From Lesson Plan</TabsTrigger>
                    </TabsList>

                    {/* MANUAL */}
                    <TabsContent value="manual" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Activity Title *</Label>
                        <Input
                          placeholder="e.g., Letter Recognition Practice"
                          value={state.title}
                          onChange={(e) => dispatch({ type: "SET_FIELD", field: "title", value: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea
                          rows={3}
                          value={state.description}
                          onChange={(e) => dispatch({ type: "SET_FIELD", field: "description", value: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Learning Area</Label>
                          <Select value={state.type} onValueChange={(val) => dispatch({ type: "SET_FIELD", field: "type", value: val })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {activityTypes.map((at) => (
                                <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Select value={state.duration} onValueChange={(val) => dispatch({ type: "SET_FIELD", field: "duration", value: val })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 min</SelectItem>
                              <SelectItem value="20">20 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                              <SelectItem value="45">45 min</SelectItem>
                              <SelectItem value="60">60 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    {/* FROM LESSON PLAN */}
                    <TabsContent value="lesson" className="space-y-4 pt-4">
                      {lessonPlans.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No lesson plans found. Please create one in AI Lesson Planning first.
                        </p>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">Select a lesson plan, then choose an activity step:</p>
                          {lessonPlans.map((plan) => (
                            <div key={plan.id} className="border rounded-lg">
                              <div className="p-3 bg-indigo-50 border-b border-indigo-200">
                                <p className="font-medium text-sm text-indigo-700">{plan.title}</p>
                                <p className="text-xs text-indigo-600 capitalize">{plan.learning_area} &bull; {plan.duration_minutes} min</p>
                              </div>
                              <div className="space-y-2 p-3 max-h-48 overflow-y-auto">
                                {plan.activities?.map((act, index) => (
                                  <div
                                    key={index}
                                    className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                                    onClick={() => {
                                      dispatch({ type: "SET_FIELD", field: "title", value: act.title });
                                      dispatch({ type: "SET_FIELD", field: "description", value: act.description });
                                      dispatch({ type: "SET_FIELD", field: "type", value: plan.learning_area });
                                      dispatch({ type: "SET_FIELD", field: "duration", value: String(plan.duration_minutes) });
                                      dispatch({ type: "SET_FIELD", field: "lessonPlanId", value: plan.id });
                                      toast.success("Activity loaded from lesson plan!");
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-3 w-3 text-indigo-500" />
                                      <p className="font-medium text-sm">{act.title}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 ml-5">{act.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {state.lessonPlanId && (
                            <div className="space-y-3 pt-2">
                              <div className="space-y-2">
                                <Label>Activity Title *</Label>
                                <Input value={state.title} onChange={(e) => dispatch({ type: "SET_FIELD", field: "title", value: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label>Description *</Label>
                                <Textarea rows={3} value={state.description} onChange={(e) => dispatch({ type: "SET_FIELD", field: "description", value: e.target.value })} />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Assign Section */}
                  <div className="space-y-3">
                    <Label>Assign To</Label>
                    <Tabs value={state.assignTo} onValueChange={(val) => dispatch({ type: "SET_FIELD", field: "assignTo", value: val })}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">Whole Class</TabsTrigger>
                        <TabsTrigger value="individual">Individual Students</TabsTrigger>
                      </TabsList>

                      <TabsContent value="all" className="pt-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900">
                            This activity will be assigned to all {students.length} student{students.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="individual" className="space-y-3 pt-4">
                        {students.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No students assigned to you yet.</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                            {students.map((student) => (
                              <div key={student.id} className="flex items-center space-x-3">
                                <Checkbox
                                  checked={state.selectedStudents.includes(student.id)}
                                  onCheckedChange={() => dispatch({ type: "TOGGLE_STUDENT", studentId: student.id })}
                                />
                                <span className="text-sm">{student.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => { dispatch({ type: "SET_OPEN", payload: false }); dispatch({ type: "RESET_FORM" }); }}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleCreateActivity}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Activity
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border border-dashed rounded-lg">
                No activities yet. Click "Create Activity" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const activityType = activityTypes.find((t) => t.value === activity.learning_area);
                  const Icon = activityType?.icon || Book;

                  return (
                    <Card
                      key={activity.id}
                      className="border-2 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => dispatch({ type: "SELECT_ACTIVITY", payload: activity })}
                    >
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <div className={`w-16 h-16 rounded-lg ${activityType?.color || "bg-gray-100"} flex items-center justify-center shrink-0`}>
                            <Icon className="h-8 w-8" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-xl">{activity.title}</h3>
                                <p className="text-base text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className={activityType?.color}>
                                  {activityType?.label || activity.learning_area}
                                </Badge>
                                {activity.source === "lesson_plan" && (
                                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-600 border-indigo-200">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    From Lesson Plan
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {activity.duration_minutes} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : "N/A"}
                              </span>
                              <Badge variant="secondary">
                                {activity.assigned_to === "class" ? "Whole Class" : `${activity.student_names?.length || 0} Student(s)`}
                              </Badge>
                              <Badge variant={activity.status === "completed" ? "default" : activity.status === "in_progress" ? "secondary" : "outline"} className="gap-1 capitalize">
                                {activity.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                {activity.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!state.selectedActivity} onOpenChange={() => dispatch({ type: "SELECT_ACTIVITY", payload: null })}>
        <DialogContent className="max-w-2xl">
          {state.selectedActivity && (() => {
            const activityType = activityTypes.find((t) => t.value === state.selectedActivity.learning_area);
            const Icon = activityType?.icon || Book;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-16 h-16 rounded-lg  ${activityType?.color || "bg-gray-100"} flex items-center justify-center shrink-0`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-2xl">{state.selectedActivity.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={activityType?.color}>
                          {activityType?.label}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{state.selectedActivity.status.replace("_", " ")}</Badge>
                        {state.selectedActivity.source === "lesson_plan" && (
                          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-600 border-indigo-200">
                            <Sparkles className="h-3 w-3 mr-1" /> Lesson Plan
                          </Badge>
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-base">Duration</span>
                        </div>
                        <p className="text-lg font-semibold">{state.selectedActivity.duration_minutes} min</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-base">Created</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {state.selectedActivity.created_at ? new Date(state.selectedActivity.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-base">Assigned</span>
                        </div>
                        <p className="text-lg font-semibold line-clamp-2">
                          {state.selectedActivity.assigned_to === "class" ? "Whole Class" : state.selectedActivity.student_names?.join(", ") || "Individual"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                    {/* Description */}
                    <div>
                      <h3 className="font-semibold mb-2">Activity Description</h3>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm">{state.selectedActivity.description}</p>
                      </div>
                    </div>

                    {/* Objectives Section */}
                    <div>
                      <h3 className="font-semibold mb-2">Learning Objectives</h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>Develop {state.selectedActivity.learning_area} skills through hands-on practice</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>Build confidence and competence in target area</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>Foster engagement and enjoyment in learning</span>
                        </li>
                      </ul>
                    </div>

                    {/* Materials Needed */}
                    <div>
                      <h3 className="font-semibold mb-2">Materials Needed</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="text-sm" variant="outline">Worksheets</Badge>
                        <Badge className="text-sm" variant="outline">Pencils</Badge>
                        <Badge className="text-sm" variant="outline">Manipulatives</Badge>
                        <Badge className="text-sm" variant="outline">Visual Aids</Badge>
                      </div>
                    </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: "SELECT_ACTIVITY", payload: null })}>
                      Close
                    </Button>
                    {state.selectedActivity.status !== "completed" && (
                      <Button className="flex-1" onClick={() => handleCompleteActivity(state.selectedActivity.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteActivity(state.selectedActivity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Generate Report Section (completed activities only) */}
                  {state.selectedActivity.status === "completed" && (
                    <div className="border-t pt-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-lg">Generate Report</h3>
                      </div>

                      {/* Show saved quiz data if available */}
                      {state.selectedActivity.quiz_score != null ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Quiz results were saved from Classroom Mode and will be included in the report.
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-2xl font-bold text-emerald-700">
                                {state.selectedActivity.quiz_score}/{state.selectedActivity.quiz_total}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Score</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-2xl font-bold text-emerald-700">
                                {state.selectedActivity.quiz_total ? Math.round(state.selectedActivity.quiz_score / state.selectedActivity.quiz_total * 100) : 0}%
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-2xl font-bold text-emerald-700">
                                {state.selectedActivity.quiz_time_seconds != null
                                  ? state.selectedActivity.quiz_time_seconds >= 60
                                    ? `${Math.floor(state.selectedActivity.quiz_time_seconds / 60)}m ${state.selectedActivity.quiz_time_seconds % 60}s`
                                    : `${state.selectedActivity.quiz_time_seconds}s`
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
                              <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 6"
                                value={reportScore}
                                onChange={(e) => setReportScore(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Total Questions</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="e.g. 8"
                                value={reportTotal}
                                onChange={(e) => setReportTotal(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Time (seconds)</Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 90"
                                value={reportTime}
                                onChange={(e) => setReportTime(e.target.value)}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleGenerateReport(state.selectedActivity.id)}
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
