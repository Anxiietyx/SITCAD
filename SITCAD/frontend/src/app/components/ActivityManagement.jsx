import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { mockStudents } from "../data/mockData";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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
} from "lucide-react";
import { toast } from "sonner";

const activityTypes = [
  {
    value: "literacy",
    label: "Literacy",
    icon: Book,
    color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30",
  },
  {
    value: "numeracy",
    label: "Numeracy",
    icon: Calculator,
    color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30",
  },
  {
    value: "social",
    label: "Social Skills",
    icon: Users,
    color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30",
  },
  {
    value: "motor",
    label: "Motor Skills",
    icon: ActivityIcon,
    color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30",
  },
  {
    value: "creative",
    label: "Creative Arts",
    icon: Palette,
    color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30",
  },
  {
    value: "cognitive",
    label: "Cognitive",
    icon: Brain,
    color: "text-sm bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30",
  },
];

export function ActivityManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [creationMode, setCreationMode] = useState("manual");

  const [targetScore, setTargetScore] = useState("70");
  const [scoringType, setScoringType] = useState("percentage");

  const handleBack = () => {
    navigate("/teacher");
  };

  const savedLessonPlan = JSON.parse(localStorage.getItem("lessonPlan"));

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("literacy");
  const [duration, setDuration] = useState("20");
  const [assignTo, setAssignTo] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState([]);

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  const students = mockStudents;

  const handleCreateActivity = () => {
    if (!title || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Mock activity creation
    const newActivity = {
      id: `act_${Date.now()}`,
      type,
      title,
      description,
      date: new Date().toISOString().split("T")[0],
      duration: parseInt(duration),
      targetScore,
      scoringType,
      completed: false,
      assignedTo: assignTo === "all" ? "all" : selectedStudents,
    };

    toast.success(`Activity "${title}" created successfully!`);

    // Reset form
    setTitle("");
    setDescription("");
    setType("literacy");
    setDuration("20");
    setAssignTo("all");
    setSelectedStudents([]);
    setOpen(false);
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const mockActivities = [
    {
      id: "act1",
      studentId: "all",
      type: "literacy",
      title: "Letter Recognition: A-Z",
      description: "Identify and trace uppercase letters A through Z",
      date: "2026-02-19",
      duration: 30,
      completed: false,
      assignedTo: "Whole Class",
    },
    {
      id: "act2",
      studentId: "student1",
      type: "numeracy",
      title: "Counting Practice 1-20",
      description: "Count objects and match with numbers",
      date: "2026-02-19",
      duration: 30,
      completed: false,
      assignedTo: "Whole Class",
    },
  ];

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
                  Create and assign learning activities to student
                </p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
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

                    {/* ========================= */}
                    {/* ✅ MANUAL (your original form) */}
                    {/* ========================= */}
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
                          <Label>Target Score (%)</Label>
                          <Select
                            value={targetScore}
                            onValueChange={setTargetScore}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="60">60%</SelectItem>
                              <SelectItem value="70">70%</SelectItem>
                              <SelectItem value="80">80%</SelectItem>
                              <SelectItem value="90">90%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Scoring Method</Label>
                          <Select
                            value={scoringType}
                            onValueChange={setScoringType}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">
                                Percentage (%)
                              </SelectItem>
                              <SelectItem value="points">
                                Points Based
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ========================= */}
                    {/* 🔥 LESSON PLAN LIBRARY */}
                    {/* ========================= */}
                    <TabsContent value="lesson" className="space-y-4 pt-4">
                      {!savedLessonPlan ? (
                        <p className="text-sm text-muted-foreground">
                          No lesson plan found. Please create one first.
                        </p>
                      ) : (
                        <>
                          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <p className="font-medium text-sm text-indigo-700">
                              {savedLessonPlan.title}
                            </p>
                            <p className="text-xs text-indigo-600">
                              {savedLessonPlan.learningArea} •{" "}
                              {savedLessonPlan.duration}
                            </p>
                          </div>

                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {savedLessonPlan.activities.map((act, index) => (
                              <div
                                key={index}
                                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setTitle(act.title);
                                  setDescription(act.description);
                                  setDuration(parseInt(act.duration));
                                  setType(savedLessonPlan.learningArea);

                                  toast.success(
                                    "Activity loaded from lesson plan!",
                                  );
                                }}
                              >
                                <p className="font-medium text-sm">
                                  {act.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {act.description}
                                </p>
                                <span className="text-xs text-blue-600">
                                  {act.duration}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* ========================= */}
                  {/* Assign Section (UNCHANGED) */}
                  {/* ========================= */}
                  <div className="space-y-3">
                    <Label>Assign To</Label>
                    <Tabs value={assignTo} onValueChange={setAssignTo}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">Whole Class</TabsTrigger>
                        <TabsTrigger value="individual">
                          Individual Students
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="all" className="pt-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900">
                            This activity will be assigned to all{" "}
                            {students.length} students
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="individual"
                        className="space-y-3 pt-4"
                      >
                        <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                          {students.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center space-x-3"
                            >
                              <Checkbox
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={() =>
                                  handleStudentToggle(student.id)
                                }
                              />
                              <span className="text-sm">{student.name}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setOpen(false)}
                    >
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
                <div
                  className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-3`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-4xl font-bold mb-1">
                  {mockActivities.filter((a) => a.type === value).length}
                </p>
                <p className="text-base font-medium text-muted-foreground">
                  {label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold mb-2">
              Created Activities
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground mb-4 font-medium">
              Manage and track all learning activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.map((activity) => {
                const activityType = activityTypes.find(
                  (t) => t.value === activity.type,
                );
                const Icon = activityType?.icon || Book;

                return (
                  <Card
                    key={activity.id}
                    className="border-2 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div
                          className={`w-16 h-16 rounded-lg ${activityType?.color} flex items-center justify-center shrink-0`}
                        >
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-xl">
                                {activity.title}
                              </h3>
                              <p className="text-base text-muted-foreground mt-1 line-clamp-2">
                                {activity.description}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={activityType?.color}
                            >
                              {activityType?.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {activity.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(activity.date).toLocaleDateString()}
                            </span>
                            <Badge variant="secondary">
                              {activity.assignedTo}
                            </Badge>
                            {activity.completed && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Activity Details Modal */}
      <Dialog
        open={!!selectedActivity}
        onOpenChange={() => setSelectedActivity(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedActivity &&
            (() => {
              const activityType = activityTypes.find(
                (t) => t.value === selectedActivity.type,
              );
              const Icon = activityType?.icon || Book;

              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <div
                        className={`w-16 h-16 rounded-lg${activityType?.color} flex items-center justify-center shrink-0`}
                      >
                        <Icon className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <DialogTitle className="text-2xl">
                          {selectedActivity.title}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={activityType?.color}
                          >
                            {activityType?.label}
                          </Badge>
                          {selectedActivity.completed && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          )}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Activity Details */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-base">Duration</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {selectedActivity.duration} min
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="text-base">Date</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {new Date(selectedActivity.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
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
                            {selectedActivity.assignedTo}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Description */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Activity Description
                      </h3>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm">
                          {selectedActivity.description}
                        </p>
                      </div>
                    </div>

                    {/* Objectives Section */}
                    <div>
                      <h3 className="font-semibold mb-2">
                        Learning Objectives
                      </h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>
                            Develop {selectedActivity.type} skills through
                            hands-on practice
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>
                            Build confidence and competence in target area
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>
                            Foster engagement and enjoyment in learning
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Materials Needed */}
                    <div>
                      <h3 className="font-semibold mb-2">Materials Needed</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="text-sm" variant="outline">
                          Worksheets
                        </Badge>
                        <Badge className="text-sm" variant="outline">
                          Pencils
                        </Badge>
                        <Badge className="text-sm" variant="outline">
                          Manipulatives
                        </Badge>
                        <Badge className="text-sm" variant="outline">
                          Visual Aids
                        </Badge>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedActivity(null)}
                      >
                        Close
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          toast.success("Activity marked as completed!");

                          setTimeout(() => {
                            toast.success(
                              "🤖 AI Analysis & Intervention generated!",
                            );
                          }, 1000);

                          setSelectedActivity(null);
                        }}
                      >
                        Mark as Complete
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
