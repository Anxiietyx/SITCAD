import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
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
import {
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Target,
  Clock,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function AILessonPlanning() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);

  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const [targetScore, setTargetScore] = useState("70");
  const [scoringType, setScoringType] = useState("percentage");

  const [ageGroup, setAgeGroup] = useState("4-5");
  const [learningArea, setLearningArea] = useState("literacy");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30");
  const [additionalNotes, setAdditionalNotes] = useState("");

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

    // Simulate AI generation with a delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock AI-generated lesson plan
    const mockLessonPlan = {
      id: `lesson_${Date.now()}`,
      title: `${topic} Exploration`,
      ageGroup,
      learningArea,
      duration: `${duration} minutes`,
      targetScore,
      scoringType,
      objectives: [
        `Introduce basic concepts of ${topic}`,
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
          description: `Gather students in a circle and introduce the topic of ${topic}. Use visual aids and encourage students to share what they know.`,
          duration: "5-7 minutes",
        },
        {
          step: 2,
          title: "Interactive Story",
          description: `Read an engaging story related to ${topic}. Pause to ask questions and encourage predictions.`,
          duration: "8-10 minutes",
        },
        {
          step: 3,
          title: "Hands-On Activity",
          description: `Students explore ${topic} through a structured activity with manipulatives. Teacher circulates to provide support.`,
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

    setLessonPlan(mockLessonPlan);
    setLoading(false);
    toast.success("Lesson plan generated successfully!");
  };

  const saveLessonPlan = () => {
    toast.success("Lesson plan saved to your library!");

    setShowSavedMsg(true);

    setTimeout(() => {
      setShowSavedMsg(false);
    }, 2000); // disappears after 2s
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#66D0BC]-30 via-[#66D0BC]-20 to-[#66D0BC]-10">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/teacher")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">
                Lesson Planning Assistant Powered by AI
              </h1>
              <p className="text-sm text-muted-foreground">
                Generate planning lesson powered by AI
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Input Form */}
        <Card className="border-2 border-indigo-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-100 to-purple-100">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Lightbulb className="h-5 w-5 text-indigo-600" />
              Lesson Plan Generator
            </CardTitle>
            <CardDescription className="text-sm text-gray-700">
              Enter your lesson details and let AI generate a structured lesson
              plan with objectives, activities, and assessment strategies.
            </CardDescription>
            <div className="pb-3"></div>
          </CardHeader>

          <CardContent className="pt-2 space-y-4 text-base">
            <div className="grid grid-cols-10 md:grid-cols-1 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Age Group</Label>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger className="text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5-6">5-6 years old</SelectItem>
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
              <Label className="text-sm font-semibold">
                Activity Target (%)
              </Label>
              <Select value={targetScore} onValueChange={setTargetScore}>
                <SelectTrigger className="text-sm font-medium">
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
              <Label className="text-sm font-semibold">Scoring Method</Label>
              <Select value={scoringType} onValueChange={setScoringType}>
                <SelectTrigger className="text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="points">Points Based</SelectItem>
                </SelectContent>
              </Select>
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base"
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

        {/* Generated Lesson Plan */}
        {lessonPlan && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <Card className="shadow-md border border-indigo-200">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left Section */}
                  <div className="space-y-2">
                    <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
                      {lessonPlan.title}
                    </CardTitle>

                    <div className="flex flex-wrap gap-2 mt-2 text-xs md:text-sm">
                      <Badge className="bg-indigo-100 text-indigo-700 font-medium">
                        <Users className="h-3 w-3 mr-1" />
                        Ages {lessonPlan.ageGroup}
                      </Badge>

                      <Badge className="bg-blue-100 text-blue-700 font-medium">
                        <Clock className="h-3 w-3 mr-1" />
                        {lessonPlan.duration}
                      </Badge>

                      <Badge className="bg-purple-100 text-purple-700 capitalize font-medium">
                        {lessonPlan.learningArea}
                      </Badge>

                      <Badge className="bg-green-100 text-green-700 font-medium">
                        🎯 Target: {lessonPlan.targetScore}%
                      </Badge>

                      <Badge className="bg-orange-100 text-orange-700 font-medium">
                        📊 {lessonPlan.scoringType}
                      </Badge>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="flex justify-end md:justify-start">
                    <Button
                      onClick={saveLessonPlan}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2"
                    >
                      Save Plan
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
                  {lessonPlan.objectives.map((obj, index) => (
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
                  {lessonPlan.activities.map((activity) => (
                    <div
                      key={activity.step}
                      className="flex gap-3 p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-white flex items-center justify-center text-lg font-bold shrink-0">
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
                  {lessonPlan.adaptations.map((adaptation, index) => (
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
      </main>
    </div>
  );
}
