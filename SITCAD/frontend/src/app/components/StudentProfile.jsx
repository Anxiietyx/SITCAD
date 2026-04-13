import { useParams, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { API_BASE } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Calendar, MapPin, TrendingUp, TrendingDown, Award, AlertCircle, Loader2, Star, GraduationCap, Target, Sparkles, Minus, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';

export function StudentProfile() {
  const { studentId } = useParams(); // Removed type annotation
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user?.id) return;
      try {
        setIsLoading(true);
        const idToken = await auth.currentUser.getIdToken();
        
        // Determine which endpoint to use based on user role
        const endpoint = user.role === 'teacher' 
          ? `${API_BASE}/teachers/my-students`
          : `${API_BASE}/parents/my-children`;
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        
        if (!res.ok) throw new Error('Failed to fetch student');
        const students = await res.json();
        const found = students.find(s => s.id === studentId);
        
        if (!found) {
          setError('Student not found');
        } else {
          setStudent(found);
        }

        // Fetch analysis
        try {
          const analysisRes = await fetch(`${API_BASE}/ai-integrations/child-analysis/${studentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken }),
          });
          if (analysisRes.ok) {
            const data = await analysisRes.json();
            if (data) setAnalysis(data);
          }
        } catch (err) {
          console.warn('Could not fetch analysis:', err);
        }
      } catch (err) {
        console.error('Error fetching student:', err);
        setError(err.message || 'Failed to load student');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [user?.id, studentId]);

  if (!user || !studentId) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="font-medium">{error || 'Student not found'}</p>
            <Button 
              className="mt-4 w-full" 
              onClick={() => {
                if (location.state?.from === 'interventions') {
                  navigate('/teacher/interventions');
                } else {
                  navigate(user.role === 'teacher' ? '/teacher' : '/parent');
                }
              }}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBack = () => {
    // If coming from interventions page, navigate back to interventions
    if (location.state?.from === 'interventions') {
      navigate('/teacher/interventions');
    } else {
      navigate(user.role === 'teacher' ? '/teacher' : '/parent');
    }
  };

  const getCategoryColor = (category) => { // Removed type annotation
    const colors = {
      literacy: 'bg-blue-100 text-blue-700',
      numeracy: 'bg-green-100 text-green-700',
      social: 'bg-purple-100 text-purple-700',
      motor: 'bg-orange-100 text-orange-700',
      creative: 'bg-pink-100 text-pink-700',
      cognitive: 'bg-cyan-100 text-cyan-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700'; // Removed type assertion
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{student.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">Student profile and learning activities</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleBack} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {location.state?.from === 'interventions' ? 'Interventions' : 'Dashboard'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Student Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-purple-200"
              >
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-semibold mb-2">{student.name}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Age {student.age}
                      </span>
                      {student.classroom && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {student.classroom}
                        </span>
                      )}
                      <span>Enrolled: {formatDateTime(student.enrollment_date)}</span>
                    </div>
                  </div>
                  {student.needs_intervention && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Needs Support
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
            <TabsTrigger value="insights" className="cursor-pointer">AI Insights</TabsTrigger>
            <TabsTrigger value="progress" className="cursor-pointer" onClick={() => navigate(`/${user.role}/student/${studentId}/progress`, { state: location.state })}>Progress Report</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
                <CardDescription>
                  Basic details and enrollment information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg font-semibold">{student.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Age</p>
                    <p className="text-lg font-semibold">{student.age} years old</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Classroom</p>
                    <p className="text-lg font-semibold">{student.classroom || 'Not assigned yet'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Enrollment Date</p>
                    <p className="text-lg font-semibold">{formatDateTime(student.enrollment_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>
                  Extended learning profile (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Detailed learning progress, developmental milestones, and activity history will be available here once integrated with the learning tracking system.
                </p>
              </CardContent>
            </Card> */}

            {/* <Card>
              <CardHeader>
                <CardTitle>Support Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">
                      {student.needs_intervention ? 'Requires Intervention' : 'No Intervention Required'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {student.needs_intervention 
                        ? `${user.role === 'parent' ? 'Your child has' : 'This student has'} been flagged as needing additional support.`
                        : `${user.role === 'parent' ? 'Your child is' : 'This student is'} progressing well without additional interventions.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {!analysis ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">No analysis available yet</p>
                  <p className="text-sm mt-1">AI insights will appear here after the student completes activities.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overall Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      Overall Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{analysis.overall_summary}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {analysis.improvement_data?.trend && (
                        <Badge className={`gap-1 ${
                          analysis.improvement_data.trend === 'improving' ? 'bg-green-100 text-green-700 border-green-200' :
                          analysis.improvement_data.trend === 'declining' ? 'bg-red-100 text-red-700 border-red-200' :
                          analysis.improvement_data.trend === 'stable' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {analysis.improvement_data.trend === 'improving' && <TrendingUp className="h-3 w-3" />}
                          {analysis.improvement_data.trend === 'declining' && <TrendingDown className="h-3 w-3" />}
                          {analysis.improvement_data.trend === 'stable' && <Minus className="h-3 w-3" />}
                          {analysis.improvement_data.trend === 'insufficient_data' && <Brain className="h-3 w-3" />}
                          Trend: {analysis.improvement_data.trend.replace('_', ' ')}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Last analysed: {formatDateTime(analysis.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Improvement Tracking */}
                {analysis.improvement_data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        Improvement Tracking
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{analysis.improvement_data.details}</p>
                      {analysis.improvement_data.comparison_points?.length > 0 && (
                        <div className="grid gap-2">
                          {analysis.improvement_data.comparison_points.map((cp, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{cp.area}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cp.previous} → {cp.current}
                                </p>
                              </div>
                              <Badge variant="outline" className={`gap-1 ${
                                cp.direction === 'up' ? 'text-green-600 border-green-200' :
                                cp.direction === 'down' ? 'text-red-600 border-red-200' :
                                'text-gray-600 border-gray-200'
                              }`}>
                                {cp.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                                {cp.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                                {cp.direction === 'stable' && <Minus className="h-3 w-3" />}
                                {cp.direction}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Strengths & Inclinations */}
                {analysis.inclinations?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-purple-500" />
                        Strengths & Inclinations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {analysis.inclinations.map((inc, i) => (
                          <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm font-medium text-purple-900">{inc.area}</p>
                            <p className="text-sm text-purple-800 mt-1">{inc.observation}</p>
                            {inc.suggestion && (
                              <p className="text-xs text-purple-600 mt-1 italic">Suggestion: {inc.suggestion}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* School Readiness */}
                {analysis.school_readiness && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-indigo-500" />
                        School Readiness Assessment
                        <Badge className={`ml-2 ${
                          analysis.school_readiness.level === 'ready' ? 'bg-green-100 text-green-700' :
                          analysis.school_readiness.level === 'almost_ready' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {analysis.school_readiness.level?.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{analysis.school_readiness.assessment}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysis.school_readiness.cognitive_readiness && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-medium text-blue-900">Cognitive</p>
                            <p className="text-xs text-blue-800 mt-1">{analysis.school_readiness.cognitive_readiness}</p>
                          </div>
                        )}
                        {analysis.school_readiness.language_readiness && (
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs font-medium text-green-900">Language</p>
                            <p className="text-xs text-green-800 mt-1">{analysis.school_readiness.language_readiness}</p>
                          </div>
                        )}
                        {analysis.school_readiness.socioemotional_readiness && (
                          <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                            <p className="text-xs font-medium text-pink-900">Socioemotional</p>
                            <p className="text-xs text-pink-800 mt-1">{analysis.school_readiness.socioemotional_readiness}</p>
                          </div>
                        )}
                        {analysis.school_readiness.motor_readiness && (
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-xs font-medium text-orange-900">Motor Skills</p>
                            <p className="text-xs text-orange-800 mt-1">{analysis.school_readiness.motor_readiness}</p>
                          </div>
                        )}
                      </div>
                      {analysis.school_readiness.recommendations?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mt-2">Recommendations:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                            {analysis.school_readiness.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Interventions */}
                {analysis.interventions?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-500" />
                        Active Interventions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {analysis.interventions.map((intv, i) => (
                          <div key={i} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{intv.area}</span>
                              <Badge className={`text-xs ${
                                intv.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                                intv.priority === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                              }`}>
                                {intv.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{intv.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{intv.concern}</p>
                            {intv.recommended_actions?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Recommended Actions:</p>
                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                                  {intv.recommended_actions.map((action, j) => (
                                    <li key={j}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}