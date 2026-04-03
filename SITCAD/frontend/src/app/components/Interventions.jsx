import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { getAllInterventions } from "../data/mockData";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react";
import Duckpit from './Duckpit';

export function Interventions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== "teacher") {
    navigate("/");
    return null;
  }

  const interventions = getAllInterventions();
  const pendingInterventions = interventions.filter(
    (i) => i.status === "pending",
  );
  const inProgressInterventions = interventions.filter(
    (i) => i.status === "in-progress",
  );
  const resolvedInterventions = interventions.filter(
    (i) => i.status === "resolved",
  );

  const handleBack = () => {
    navigate("/teacher");
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-base px-8 py-1 bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "text-base px-8 py-1 bg-orange-100 text-orange-700 border-orange-200";
      case "low":
        return "text-base px-8 py-1 bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "text-base px-8 py-1 bg-gray-100 text-gray-700 border-gray-200"; // Added default for safety
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "in-progress":
        return <Target className="h-5 w-5 text-blue-600" />;
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />; // Added default for safety
    }
  };

  const renderInterventionCard = (intervention) => (
    <Card key={intervention.id} className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(intervention.status)}
              <CardTitle className="text-xl font-bold">
                {intervention.studentName}
              </CardTitle>
            </div>
            <CardDescription className="mt-2 text-lg leading-relaxed">
              {intervention.area}
            </CardDescription>
          </div>
          <Badge
            className={`${getPriorityColor(intervention.priority)} border`}
          >
            {intervention.priority} priority
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Concern */}
        <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
          <p className="text-lg font-medium text-orange-900 mb-1">
            Concern Identified:
          </p>
          <p className="text-base text-muted-foreground">
            {intervention.concern}
          </p>
        </div>

        {/* Recommended Actions */}
        <div>
          <p className="text-lg font-medium mb-3">Recommended Actions:</p>
          <ul className="space-y-3">
            {intervention.recommendedActions.map((action, index) => (
              <li key={index} className="flex items-start gap-2 text-base">
                <div className="w-5 h-5 rounded-full bg-green-300 text-black-600 flex items-center justify-center text-xs font-medium shrink mt-1.15">
                  {index + 1}
                </div>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Status and Date */}
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <span>
            Created: {new Date(intervention.createdDate).toLocaleDateString()}
          </span>
          <Button
            variant="outline"
            size="sm" className="px-3 border-2"
            onClick={() =>
              navigate(`/teacher/student/${intervention.studentId}`)
            }
          >
            View Student
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
              <div className="w-8 h-8 bg-linear-to-br from-yellow-500 to-orange-300 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">AI-Powered Student Interventions</h1>
                <p className="text-sm text-muted-foreground mt-1">Identify, review, and take action on students who need extra support based on AI-detected learning gaps and developmental needs.</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Intervention Overview</h2>
          <p className="text-lg text-muted-foreground mb-4 font-medium">
            A quick summary of students who need attention, ongoing support, and
            successfully completed interventions.
          </p>
        </div>
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="pb-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                Pending Review
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {pendingInterventions.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-lg text-red-600">
                <Clock className="mr-2 h-5 w-5" />
                Needs teacher review
              </div>
            </CardContent>
          </Card>

          <Card className="pb-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                Active Interventions
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {inProgressInterventions.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-lg text-orange-600">
                <Target className="mr-2 h-5 w-5" />
                Support currently ongoing
              </div>
            </CardContent>
          </Card>

          <Card className="pb-2">
            <CardHeader className="pb-2">
              <CardDescription className="text-lg font-medium">
                Successful Interventions
              </CardDescription>
              <CardTitle className="text-5xl font-medium">
                {resolvedInterventions.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-lg text-green-600">
                <CheckCircle className="mr-2 h-5 w-5" />
                Student progress improved
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Banner */}
        <Card className="border-2 border-yellow-300 bg-linear-to-r from-yellow-100 to-yellow-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Target className="h-5 w-5 text-amber-600" />
              AI Intervention Insights
            </CardTitle>

            <CardDescription className="mb-4 font-medium text-base">
              The system analyzes student performance and behavior to detect
              learning gaps early and generate targeted intervention plans. Each
              intervention is prioritized to help you focus on students who need
              the most support.
            </CardDescription>
            <div className="pb-3"></div>
            {/* TO-DO: Find a better solution to the spacing instead of using this <div> */}
          </CardHeader>
        </Card>

        {/* Interventions Tabs */}
        <Tabs defaultValue="in-progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="in-progress" className="text-base gap-2">
              <Target className="h-4 w-4" />
              Active Support ({inProgressInterventions.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-base gap-2">
              <Clock className="h-4 w-4" />
              Needs Review ({pendingInterventions.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-base gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({resolvedInterventions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="space-y-4">
            {inProgressInterventions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No interventions currently in progress
                </CardContent>
              </Card>
            ) : (
              inProgressInterventions.map(renderInterventionCard)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingInterventions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No pending interventions
                </CardContent>
              </Card>
            ) : (
              pendingInterventions.map(renderInterventionCard)
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            {resolvedInterventions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No resolved interventions yet
                </CardContent>
              </Card>
            ) : (
              resolvedInterventions.map(renderInterventionCard)
            )}
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
}
