import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Checkbox } from "./ui/checkbox";
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
} from "lucide-react";
import { toast } from "sonner";

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
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [creationMode, setCreationMode] = useState("manual");

  // Backend data
  const [activities, setActivities] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("literacy");
  const [duration, setDuration] = useState("20");
  const [assignTo, setAssignTo] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState(null);

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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("literacy");
    setDuration("20");
    setAssignTo("all");
    setSelectedStudents([]);
    setSelectedLessonPlanId(null);
    setCreationMode("manual");
  };

  const handleCreateActivity = async () => {
    if (!title || !description) {
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
          title,
          description,
          learning_area: type,
          duration_minutes: parseInt(duration),
          assigned_to: assignTo === "all" ? "class" : "individual",
          student_ids: assignTo === "individual" ? selectedStudents : undefined,
          lesson_plan_id: selectedLessonPlanId || undefined,
          source: selectedLessonPlanId ? "lesson_plan" : "manual",
        }),
      });

      if (!res.ok) throw new Error("Failed to create activity");
      toast.success(`Activity "${title}" created successfully!`);
      resetForm();
      setOpen(false);
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
      setSelectedActivity(null);
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
        setSelectedActivity(null);
        fetchActivities();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-Black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Activity Management</h1>
                <p className="text-sm text-muted-foreground">
                  Create and assign learning activities to students
                </p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="lg">
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
                  <Tabs value={creationMode} onValueChange={setCreationMode}>
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
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Learning Area</Label>
                          <Select value={type} onValueChange={setType}>
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
                          <Select value={duration} onValueChange={setDuration}>
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
                                      setTitle(act.title);
                                      setDescription(act.description);
                                      setType(plan.learning_area);
                                      setDuration(String(plan.duration_minutes));
                                      setSelectedLessonPlanId(plan.id);
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

                          {selectedLessonPlanId && (
                            <div className="space-y-3 pt-2">
                              <div className="space-y-2">
                                <Label>Activity Title *</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Description *</Label>
                                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
                    <Tabs value={assignTo} onValueChange={setAssignTo}>
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
                                  checked={selectedStudents.includes(student.id)}
                                  onCheckedChange={() => handleStudentToggle(student.id)}
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
                    <Button variant="outline" className="flex-1" onClick={() => { setOpen(false); resetForm(); }}>
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
          <CardHeader>
            <CardTitle className="text-2xl font-bold mb-2">Created Activities</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mb-4 font-medium">
              Manage and track all learning activities
            </CardDescription>
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
                      onClick={() => setSelectedActivity(activity)}
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

      {/* Activity Details Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent className="max-w-2xl">
          {selectedActivity && (() => {
            const activityType = activityTypes.find((t) => t.value === selectedActivity.learning_area);
            const Icon = activityType?.icon || Book;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-16 h-16 rounded-lg ${activityType?.color || "bg-gray-100"} flex items-center justify-center shrink-0`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-2xl">{selectedActivity.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={activityType?.color}>
                          {activityType?.label}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{selectedActivity.status.replace("_", " ")}</Badge>
                        {selectedActivity.source === "lesson_plan" && (
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
                        <p className="text-lg font-semibold">{selectedActivity.duration_minutes} min</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-base">Created</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {selectedActivity.created_at ? new Date(selectedActivity.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
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
                          {selectedActivity.assigned_to === "class" ? "Whole Class" : selectedActivity.student_names?.join(", ") || "Individual"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Activity Description</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{selectedActivity.description}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedActivity(null)}>
                      Close
                    </Button>
                    {selectedActivity.status !== "completed" && (
                      <Button className="flex-1" onClick={() => handleCompleteActivity(selectedActivity.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteActivity(selectedActivity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
