import { useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { mockStudents } from "../data/mockData";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Target,
  Users,
  BarChart3,
} from "lucide-react";
import Duckpit from './Duckpit';

export function AIAnalysisDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  const students = mockStudents;

  // Mock AI analysis data
  const classAnalytics = {
    overallPerformance: 76,
    trend: "improving",
    atRiskStudents: students.filter((s) => s.needsIntervention).length,
    excellingStudents: students.filter(
      (s) =>
        s.developmentalStage === "advanced" ||
        s.developmentalStage === "proficient",
    ).length,
    engagementScore: 80,
  };

  const learningPatterns = [
    {
      pattern: "Peak Learning Time",
      insight: "Students show highest engagement between 9:00 AM - 11:00 AM",
      recommendation:
        "Schedule complex learning activities during morning hours",
      confidence: 89,
    },
    {
      pattern: "Collaborative Learning",
      insight:
        "Group activities lead to 23% better comprehension than individual work",
      recommendation:
        "Increase peer learning opportunities in literacy activities",
      confidence: 85,
    },
    {
      pattern: "Visual Learning Preference",
      insight: "68% of students demonstrate strong visual learning preferences",
      recommendation:
        "Incorporate more visual aids, diagrams, and picture books",
      confidence: 92,
    },
    {
      pattern: "Attention Span Patterns",
      insight:
        "Average attention span is 12-15 minutes for structured activities",
      recommendation:
        "Break longer activities into shorter segments with transitions",
      confidence: 88,
    },
  ];

  const developmentalInsights = [
    {
      area: "Literacy Development",
      status: "strong",
      average: 78,
      insights: [
        "4 students ready for advanced phonics",
        "2 students need additional letter recognition support",
        "Storytelling activities showing exceptional engagement",
      ],
    },
    {
      area: "Numeracy Skills",
      status: "excellent",
      average: 84,
      insights: [
        "Strong performance in counting and number recognition",
        "Ready to introduce basic addition concepts",
        "Consider more hands-on math manipulatives",
      ],
    },
    // vvv TEMPORARILY COMMENTED OUT vvv
    // {
    //   area: "Social-Emotional",
    //   status: "developing",
    //   average: 72,
    //   insights: [
    //     "Improved conflict resolution skills observed",
    //     "1 student may benefit from social skills support",
    //     "Positive peer interactions during group activities",
    //   ],
    // },
    // {
    //   area: "Physical Development",
    //   status: "strong",
    //   average: 80,
    //   insights: [
    //     "Fine motor skills progressing well",
    //     "Gross motor activities highly engaging",
    //     "Consider more outdoor physical activities",
    //   ],
    // },
  ];

  const predictiveInsights = [
    {
      id: "1",
      type: "opportunity",
      title: "Advanced Learning Readiness",
      description:
        "3 students showing readiness for kindergarten transition skills earlier than expected",
      students: ["Little Sprout1", "Little Sprout2", "Little Sprout5"],
      action: "Consider introducing early kindergarten preparation activities",
      priority: "medium",
    },
    {
      id: "2",
      type: "concern",
      title: "Fine Motor Skills Support",
      description:
        "1 students may benefit from additional fine motor skill development",
      students: ["Little Sprout3"],
      action: "Implement daily fine motor skill exercises and adaptive tools",
      priority: "high",
    },
    {
      id: "3",
      type: "success",
      title: "Literacy Breakthrough",
      description:
        "Class average in letter recognition improved 15% this month",
      students: ["Whole Class"],
      action: "Continue current literacy curriculum with minor enhancements",
      priority: "low",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "excellent":
        return "text-green-600 bg-green-50 border-green-200";
      case "strong":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "developing":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const [timeFilter, setTimeFilter] = useState("daily");

  const learningPatternsData = {
    daily: [
      {
        category: "Learning Time",
        pattern: "Morning Focus",
        insight: "Students are most attentive during morning sessions",
        impact: "Important concepts are better understood during this time",
        recommendation: "Schedule key lessons in the morning",
        confidence: 82,
      },
      {
        category: "Attention",
        pattern: "Post-Lunch Drop",
        insight: "Attention decreases after lunch",
        impact: "Students may struggle to absorb new information",
        recommendation: "Use interactive or game-based activities after lunch",
        confidence: 78,
      },
      {
        category: "Attention",
        pattern: "Short Attention Span",
        insight: "Students focus for around 10–12 minutes per activity",
        impact: "Long sessions reduce learning effectiveness",
        recommendation: "Break lessons into shorter segments",
        confidence: 85,
      },
    ],

    weekly: [
      {
        category: "Learning Time",
        pattern: "Peak Learning Hours",
        insight: "Highest engagement between 9:00 AM - 11:00 AM",
        impact: "Students perform best during this period",
        recommendation: "Schedule complex tasks during peak hours",
        confidence: 89,
      },
      {
        category: "Learning Style",
        pattern: "Collaborative Learning",
        insight: "Students perform better in group activities",
        impact: "Peer interaction improves understanding",
        recommendation: "Increase group-based activities",
        confidence: 87,
      },
      {
        category: "Engagement",
        pattern: "Active Participation",
        insight: "Students participated actively this week",
        impact: "Higher engagement leads to better retention",
        recommendation: "Maintain interactive teaching strategies",
        confidence: 84,
      },
    ],

    monthly: [
      {
        category: "Learning Style",
        pattern: "Visual Preference",
        insight: "Students respond better to visual materials",
        impact: "Visual aids improve comprehension",
        recommendation: "Use more images, charts, and videos",
        confidence: 91,
      },
      {
        category: "Performance",
        pattern: "Literacy Improvement",
        insight: "Students improved in reading and recognition",
        impact: "Foundation skills are strengthening",
        recommendation: "Introduce more advanced reading materials",
        confidence: 88,
      },
      {
        category: "Attention",
        pattern: "Improved Focus",
        insight: "Attention span has increased",
        impact: "Students can handle longer activities",
        recommendation: "Gradually extend lesson duration",
        confidence: 86,
      },
    ],

    yearly: [
      {
        category: "Performance",
        pattern: "Overall Growth",
        insight: "Students improved across key subjects",
        impact: "Students are ready for next level",
        recommendation: "Prepare advanced curriculum",
        confidence: 94,
      },
      {
        category: "Learning Style",
        pattern: "Structured Learning",
        insight: "Students prefer structured environments",
        impact: "Consistency improves learning outcomes",
        recommendation: "Maintain structured routines",
        confidence: 90,
      },
      {
        category: "Social",
        pattern: "Collaboration Skills",
        insight: "Students improved in teamwork",
        impact: "Better peer interaction enhances learning",
        recommendation: "Encourage more group activities",
        confidence: 89,
      },
    ],
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Duckpit count={24} gravity={0.5} friction={0.9975} wallBounce={0.9} className="h-full w-full opacity-100" />
      </div>
      <div className="absolute inset-0 z-0 bg-linear-to-b from-white/72 via-white/58 to-emerald-50/72" />

      <div className="relative z-10">
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Student Development Analysis By AI</h1>
                <p className="text-sm text-muted-foreground mt-1">Insight powered by Artificial intelligent</p>
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
        {/* 🔥 Overview Section Title */}
        <div>
          <h2 className="text-2xl font-bold mb-2">Class Overview</h2>
          <p className="text-lg text-muted-foreground mb-4 font-medium">
            A quick summary of your class performance and student progress
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                Overall Class Score
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {classAnalytics.overallPerformance}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-lg text-green-600">
                <TrendingUp className="mr-1 h-6 w-6" />
                Improving
              </div>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                Student Participation
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {classAnalytics.engagementScore}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={classAnalytics.engagementScore}
                className="h-4"
              />
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                High Performers
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {classAnalytics.excellingStudents}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-lg text-green-600">
                <Target className="mr-1 h-5 w-5" />
                On track
              </div>
            </CardContent>
          </Card>

          {/* 🔥 Highlight important card */}
          <Card className="p-2 border-2 border-red-300 bg-red-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                Students at Risk
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {classAnalytics.atRiskStudents}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-lg text-red-600">
                <AlertTriangle className="mr-1 h-5 w-5" />
                Needs attention
              </div>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                Total Students
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {students.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-lg text-green-600">
                <Users className="mr-1 h-5 w-5" />
                Total in class
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="patterns" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="patterns" className="text-base py-2">
              Learning Pattern Insight
            </TabsTrigger>
            <TabsTrigger value="developmental" className="text-base py-2">
              Developmental Progress
            </TabsTrigger>
            <TabsTrigger value="predictive" className="text-base py-2">
              Predictive Insights
            </TabsTrigger>
          </TabsList>

          {/*===LEARNING PATTERN===*/}
          <TabsContent value="patterns" className="space-y-4">
            {/* Header */}
            <Card className="border-2 border-pink-300 bg-linear-to-r from-pink-100 to-pink-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-lg font-bold">
                  <Sparkles className="h-5 w-5 text-pink-600" />
                  AI-Detected Learning Patterns
                </CardTitle>
                <CardDescription className="mb-4 font-medium text-base">
                  These insights show how your students learn best and what you
                  can do to improve their learning.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 🔥 Dropdown Filter */}
            <div className="flex items-center justify-between">
              <select
                className="border rounded-md px-6 py-2 text-base bg-white border-black/40 font-medium text-muted-foreground"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <p className="text-base text-muted-foreground font-medium">
                Showing:{" "}
                {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}{" "}
                Insights
              </p>
            </div>

            {/* Patterns */}
            {learningPatternsData[timeFilter].map((pattern, index) => (
              <Card key={index} className="hover:shadow-md transition p-2">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold">
                        {pattern.pattern}
                      </CardTitle>
                      <CardDescription className="mt-2 text-lg leading-relaxed">
                        {pattern.insight}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-base px-3 py-1 bg-[#e7e3fc]"
                    >
                      Category: {pattern.category}
                    </Badge>
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {pattern.confidence}% confidence
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-start gap-2 p-3 bg-pink-100 rounded-lg border border-pink-300">
                    <TrendingUp className="h-6 w-6 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1 text-lg">
                        Recommended Action:
                      </p>
                      <p className="text-lg leading-relaxed">
                        {pattern.recommendation}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/*===Developmental Areas===*/}
          <TabsContent value="developmental" className="space-y-4">
            {/* 🔥 Header */}
            <Card className="border-2 border-blue-300 bg-linear-to-r from-blue-200 to-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-lg font-bold">
                  📊 Developmental Progress
                </CardTitle>
                <CardDescription className="mb-4 font-medium text-base">
                  This section shows how your students are progressing in key
                  development areas and highlights where they are doing well or
                  need support.
                </CardDescription>
              </CardHeader>
            </Card>

            {/*===Development Cards===*/}
            {developmentalInsights.map((area, index) => (
              <Card key={index} className="p-2 hover:shadow-md transition">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold">
                        {area.area}
                      </CardTitle>
                      <CardDescription className="mt-2 text-lg leading-relaxed">
                        Class Average: {area.average}%
                      </CardDescription>
                    </div>

                    <Badge
                      className={`${getStatusColor(area.status)} border text-base px-5 py-1`}
                    >
                      {area.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Bigger Progress Bar */}
                  <Progress value={area.average} className="h-4" />

                  {/* Insights */}
                  <div className="space-y-2">
                    <p className="font-semibold text-base">Key Insights:</p>

                    {area.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 text-base">
                        <div className="w-2 h-2 rounded-full bg-pink-600 mt-2" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/*===Predictive Insights===*/}
          <TabsContent value="predictive" className="space-y-4">
            {/* 🔥 Header Card */}
            <Card className="border-2 border-indigo-200 bg-linear-to-r from-indigo-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-lg font-bold">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Predictive Analytics
                </CardTitle>
                <CardDescription className="mb-4 font-medium text-base">
                  These insights predict future student performance and
                  highlight potential risks or opportunities, helping you take
                  early action to support your students.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Predictive Cards */}
            {predictiveInsights.map((insight) => (
              <Card
                key={insight.id}
                className="border-2 p-2 hover:shadow-md transition"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {insight.type === "opportunity" && (
                          <Target className="h-6 w-6 text-blue-600" />
                        )}
                        {insight.type === "concern" && (
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        )}
                        {insight.type === "success" && (
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        )}

                        <CardTitle className="text-xl font-bold">
                          {insight.title}
                        </CardTitle>
                      </div>

                      <CardDescription className="mt-2 text-lg leading-relaxed">
                        {insight.description}
                      </CardDescription>
                    </div>

                    <Badge
                      className={`${getPriorityColor(insight.priority)} text-base px-3 py-1`}
                    >
                      {insight.priority} priority
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Affected Students */}
                  <div>
                    <p className="text-base font-semibold mb-2">
                      Affected Students:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {insight.students.map((student, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-sm px-2 py-1"
                        >
                          {student}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 🔥 Bigger Recommendation Box */}
                  <div className="p-5 bg-pink-200 rounded-lg border border-pink-100">
                    <p className="font-semibold mb-1 text-lg">
                      Recommended Action:
                    </p>
                    <p className="text-lg leading-relaxed">{insight.action}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
}
