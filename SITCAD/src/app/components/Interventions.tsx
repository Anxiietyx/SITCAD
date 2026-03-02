import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getAllInterventions, Intervention } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Target } from 'lucide-react';

export function Interventions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const interventions = getAllInterventions();
  const pendingInterventions = interventions.filter(i => i.status === 'pending');
  const inProgressInterventions = interventions.filter(i => i.status === 'in-progress');
  const resolvedInterventions = interventions.filter(i => i.status === 'resolved');

  const handleBack = () => {
    navigate('/teacher');
  };

  const getPriorityColor = (priority: Intervention['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusIcon = (status: Intervention['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-orange-600" />;
      case 'in-progress': return <Target className="h-5 w-5 text-blue-600" />;
      case 'resolved': return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const renderInterventionCard = (intervention: Intervention) => (
    <Card key={intervention.id} className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(intervention.status)}
              <CardTitle className="text-lg">{intervention.studentName}</CardTitle>
            </div>
            <CardDescription className="text-base font-medium">
              {intervention.area}
            </CardDescription>
          </div>
          <Badge className={`${getPriorityColor(intervention.priority)} border`}>
            {intervention.priority} priority
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Concern */}
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
          <p className="text-sm font-medium text-orange-900 mb-1">Concern Identified:</p>
          <p className="text-sm text-muted-foreground">{intervention.concern}</p>
        </div>

        {/* Recommended Actions */}
        <div>
          <p className="text-sm font-medium mb-3">Recommended Actions:</p>
          <ul className="space-y-3">
            {intervention.recommendedActions.map((action, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-300 text-black-600 flex items-center justify-center text-xs font-medium shrink-1 mt-1.15">
                  {index + 1}
                </div>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Status and Date */}
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <span>Created: {new Date(intervention.createdDate).toLocaleDateString()}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/teacher/student/${intervention.studentId}`)}
          >
            View Student
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-300 via-green-200 to-green-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-black"/>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Early Intervention Support</h1>
              <p className="text-sm text-muted-foreground">
                Data-driven insights and recommendations for students needing additional support
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-3xl">{pendingInterventions.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-red-600">
                <Clock className="mr-2 h-4 w-4" />
                Requires attention
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl">{inProgressInterventions.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-orange-600">
                <Target className="mr-2 h-4 w-4" />
                Active interventions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Resolved</CardDescription>
              <CardTitle className="text-3xl">{resolvedInterventions.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="mr-2 h-4 w-4" />
                Successfully addressed
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Banner */}
        <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-100 to-yellow-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-red-600 flex items-center justify-center">
                <Target className="h-4 w-4 text-black"/>
              </div>
              Early Intervention System Powered by AI
            </CardTitle>
            <CardDescription>
              AI analyzes student performance data across multiple developmental areas to identify learning gaps early.
              Interventions are prioritized based on severity, frequency, and impact on overall development.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Interventions Tabs */}
        <Tabs defaultValue="in-progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="in-progress" className="gap-2">
              <Target className="h-4 w-4" />
              In Progress ({inProgressInterventions.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingInterventions.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolved ({resolvedInterventions.length})
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
  );
}
