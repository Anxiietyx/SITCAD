import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { ParentDashboard } from "./components/ParentDashboard";
import { StudentProfile } from "./components/StudentProfile";
import { LearningActivities } from "./components/LearningActivities";
import { ProgressTracking } from "./components/ProgressTracking";
import { Interventions } from "./components/Interventions";
import { ActivityManagement } from "./components/ActivityManagement";
import { AILessonPlanning } from "./components/AILessonPlanning";
import { ReportGeneration } from "./components/ReportGeneration";
import { Communication } from "./components/Communication";
import { ClassroomTeachingMode } from "./components/ClassroomTeachingMode";
import { AIAnalysisDashboard } from "./components/AIAnalysisDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/teacher",
    element: <ProtectedRoute allowedRoles={["teacher"]} />,
    children: [
      { index: true, Component: TeacherDashboard },
      { path: "student/:studentId", Component: StudentProfile },
      { path: "student/:studentId/activities", Component: LearningActivities },
      { path: "student/:studentId/progress", Component: ProgressTracking },
      { path: "interventions", Component: Interventions },
      { path: "activities", Component: ActivityManagement },
      { path: "ai-lesson-planning", Component: AILessonPlanning },
      { path: "reports", Component: ReportGeneration },
      { path: "communication", Component: Communication },
      { path: "classroom-mode", Component: ClassroomTeachingMode },
      { path: "ai-analysis", Component: AIAnalysisDashboard },
    ],
  },
  {
    path: "/parent",
    element: <ProtectedRoute allowedRoles={["parent"]} />,
    children: [
      { index: true, Component: ParentDashboard },
      { path: "student/:studentId", Component: StudentProfile },
      { path: "student/:studentId/activities", Component: LearningActivities },
      { path: "student/:studentId/progress", Component: ProgressTracking },
      { path: "communication", Component: Communication },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);