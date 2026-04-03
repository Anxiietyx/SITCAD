import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, FileText, Printer, Trophy, Target } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return firebaseUser.getIdToken();
}

export function ReportGeneration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [viewingReport, setViewingReport] = useState(null);

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
      fetchReports();
    }
  }, [user, fetchReports]);

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const handlePrint = () => window.print();

  if (viewingReport) {
    return (
      <div className="min-h-screen print:min-h-0">
        <header className="bg-white border-b shadow-sm sticky top-0 z-10 print:hidden">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setViewingReport(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{viewingReport.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(viewingReport.created_at).toLocaleString()}
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
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Assessment:</strong> {viewingReport.details.performance_description}
                  </p>
                </div>
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
        </main>
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
              <h1 className="text-2xl font-semibold">Reports</h1>
              <p className="text-sm text-muted-foreground">
                View and manage generated reports
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Generated Reports */}
        <Card className="border-2 border-[#bafde0] shadow-md">
          <CardHeader className="bg-[#edfff8] rounded-t-lg pb-5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5 text-green-600" />
              Generated Reports ({reports.length})
            </CardTitle>
            <CardDescription>View and print past reports</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            {reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No reports generated yet. Generate a report from the Activities page after completing an activity.
              </p>
            ) : (
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
