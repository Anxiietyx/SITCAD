import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, FileText, Sparkles, Loader2, CheckCircle2, Clock, Users, Printer, Trophy, Target } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:8000';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return firebaseUser.getIdToken();
}

export function ReportGeneration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedActivities, setCompletedActivities] = useState([]);
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(null); // activity id being generated
  const [viewingReport, setViewingReport] = useState(null);

  const fetchCompletedActivities = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/activities/my-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) {
        const all = await res.json();
        setCompletedActivities(all.filter(a => a.status === 'completed'));
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/reports/my-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) setReports(await res.json());
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchCompletedActivities();
      fetchReports();
    }
  }, [user, fetchCompletedActivities, fetchReports]);

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const generateReport = async (activityId) => {
    setGenerating(activityId);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, activity_id: activityId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to generate report');
      }
      const report = await res.json();
      toast.success('Report generated successfully!');
      setViewingReport(report);
      fetchReports();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Check which completed activities already have a report
  const reportedActivityIds = new Set(reports.map(r => r.activity_id));

  if (viewingReport) {
    return (
      <div className="min-h-screen bg-white">
        {/* Print-friendly report view */}
        <div className="max-w-3xl mx-auto px-8 py-8 print:p-0">
          <div className="print:hidden mb-6 flex items-center gap-3">
            <Button variant="ghost" onClick={() => setViewingReport(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>

          <div className="space-y-6">
            <div className="text-center border-b pb-6">
              <h1 className="text-3xl font-bold">{viewingReport.title}</h1>
              <p className="text-muted-foreground mt-2">
                Generated on {new Date(viewingReport.created_at).toLocaleDateString('en-MY', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>

            {/* Summary */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Summary</h2>
              <p className="text-gray-700 leading-relaxed">{viewingReport.summary}</p>
            </div>

            {/* Activity Details */}
            {viewingReport.details && (
              <div className="bg-gray-50 rounded-lg p-5 space-y-2 print:bg-white print:border">
                <h2 className="text-xl font-semibold mb-3">Activity Details</h2>
                <p><strong>Activity:</strong> {viewingReport.details.activity_title}</p>
                {viewingReport.details.activity_description && (
                  <p><strong>Description:</strong> {viewingReport.details.activity_description}</p>
                )}
                <p><strong>Learning Area:</strong> <span className="capitalize">{viewingReport.details.learning_area}</span></p>
                <p><strong>Duration:</strong> {viewingReport.details.duration_minutes} minutes</p>
                <p><strong>Assigned To:</strong> {viewingReport.details.assigned_to === 'class' ? 'Whole Class' : 'Individual'}</p>
                <p><strong>Students Involved:</strong> {viewingReport.details.student_count}</p>
                {viewingReport.details.completed_at && (
                  <p><strong>Completed:</strong> {new Date(viewingReport.details.completed_at).toLocaleString()}</p>
                )}
              </div>
            )}

            {/* Quiz Performance */}
            {viewingReport.details?.quiz_score != null && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Quiz Performance</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                    <Trophy className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-emerald-700">
                      {viewingReport.details.quiz_score}/{viewingReport.details.quiz_total}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Score ({viewingReport.details.score_percentage}%)</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                    <Clock className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-emerald-700">
                      {viewingReport.details.quiz_time_seconds != null
                        ? viewingReport.details.quiz_time_seconds >= 60
                          ? `${Math.floor(viewingReport.details.quiz_time_seconds / 60)}m ${viewingReport.details.quiz_time_seconds % 60}s`
                          : `${viewingReport.details.quiz_time_seconds}s`
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Time Taken</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                    <Target className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className={`text-xl font-bold ${
                      viewingReport.details.performance_level === 'Excellent' ? 'text-emerald-700' :
                      viewingReport.details.performance_level === 'Good' ? 'text-green-600' :
                      viewingReport.details.performance_level === 'Developing' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {viewingReport.details.performance_level}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Performance Level</p>
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Assessment:</strong> {viewingReport.details.performance_description}
                  </p>
                </div>
              </div>
            )}

            {/* Student Summaries */}
            {viewingReport.details?.student_summaries?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Student Performance</h2>
                <div className="space-y-3">
                  {viewingReport.details.student_summaries.map((ss, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                        {ss.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{ss.student_name}</p>
                          {ss.performance_level && (
                            <Badge className={`text-xs ${
                              ss.performance_level === 'Excellent' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              ss.performance_level === 'Good' ? 'bg-green-100 text-green-700 border-green-200' :
                              ss.performance_level === 'Developing' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              ss.performance_level === 'Needs Support' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {ss.performance_level}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Participation: <Badge variant="secondary">{ss.participation}</Badge>
                        </p>
                        <p className="text-sm mt-1">{ss.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Students list */}
            {viewingReport.students?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Students Involved</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {viewingReport.students.map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 border rounded">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">Age {s.age}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/teacher')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#bafde0] rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Report Generation</h1>
              <p className="text-sm text-muted-foreground">
                Generate reports from completed activities
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Completed Activities – Generate Reports */}
          <Card className="border-2 border-[#bafde0] shadow-md">
            <CardHeader className="bg-[#edfff8] rounded-t-lg pb-5">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-green-600" />
                Completed Activities
              </CardTitle>
              <CardDescription>
                Select a completed activity to generate a report
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {completedActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No completed activities yet. Complete an activity in Classroom Mode to generate a report.
                </p>
              ) : (
                <div className="space-y-3">
                  {completedActivities.map(activity => {
                    const hasReport = reportedActivityIds.has(activity.id);
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{activity.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {activity.learning_area}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {activity.duration_minutes} min
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" /> {activity.student_names?.length || 0} students
                              </span>
                            </div>
                          </div>
                        </div>
                        {hasReport ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Report Generated
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => generateReport(activity.id)}
                            disabled={generating === activity.id}
                          >
                            {generating === activity.id ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-3 w-3" />
                                Generate Report
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Reports */}
          {reports.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Generated Reports ({reports.length})
                </CardTitle>
                <CardDescription>View and print past reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports.map(report => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setViewingReport(report)}
                    >
                      <div>
                        <p className="font-medium">{report.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {report.summary}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {report.activity_learning_area && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {report.activity_learning_area}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {report.students?.length || 0} students
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
    </div>
  );
}
