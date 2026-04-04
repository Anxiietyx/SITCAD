import { useReducer, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { mockStudents, getActivitiesByStudent } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, FileText, Download, Sparkles, Loader2, Printer, TrendingUp, Award, Target, Trophy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Duckpit from './Duckpit';
import { reportReducer, initialReportState } from '../reducers/reportReducer';

const API_BASE = 'http://localhost:8000';

async function getIdToken() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return firebaseUser.getIdToken();
}

export function ReportGeneration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reportReducer, initialReportState);
  const { reportType, reportPeriod, language, selectedStudents, generating, error, reports } = state;
  const [pastReports, setPastReports] = useState([]);
  const [viewingReport, setViewingReport] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/reports/my-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) setPastReports(await res.json());
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

  const students = mockStudents;

  const handleStudentToggle = (studentId) => {
    dispatch({ type: 'TOGGLE_STUDENT', payload: studentId });
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      dispatch({ type: 'SELECT_ALL_STUDENTS', payload: [] });
    } else {
      dispatch({ type: 'SELECT_ALL_STUDENTS', payload: students.map(s => s.id) });
    }
  };

  const generateReports = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    dispatch({ type: 'SET_GENERATING', payload: true });

    const studentsToGenerate = students
      .filter(s => selectedStudents.includes(s.id))
      .map(student => ({
        student_id: student.id,
        student_name: student.name,
        age: student.age,
        classroom: student.classroom,
        developmental_stage: student.developmentalStage,
        overall_progress: student.overallProgress,
        needs_intervention: student.needsIntervention || false,
        report_period: reportPeriod === 'term1' ? 'Term 1 (Sep - Dec 2025)' : reportPeriod === 'term2' ? 'Term 2 (Jan - Apr 2026)' : 'Term 3 (May - Aug 2026)',
        recent_activities: getActivitiesByStudent(student.id).map(a => ({
          type: a.type,
          title: a.title,
          score: a.score,
          feedback: a.feedback
        }))
      }));

    try {
      const response = await fetch('http://localhost:8000/ai/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: studentsToGenerate,
          report_type: reportType,
          language: language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate reports');
      }

      const data = await response.json();
      
      const mappedReports = data.reports.map(r => ({
        studentId: r.student_id,
        studentName: r.student_name,
        reportPeriod: r.report_period,
        summary: r.summary,
        strengths: r.strengths,
        areasForGrowth: r.areas_for_growth,
        recommendations: r.recommendations,
        progressData: r.progress_data.map(pd => ({
          area: pd.area,
          progress: pd.progress,
          comment: pd.comment
        })),
        dskpReferences: r.dskp_references
      }));

      dispatch({ type: 'SET_REPORTS', payload: mappedReports });
      dispatch({ type: 'SET_GENERATING', payload: false });
      toast.success(`Generated ${mappedReports.length} report(s) successfully!`);
    } catch (err) {
      console.error(err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
      toast.error(err.message);
    }
  };

  const downloadReport = (report) => {
    toast.success(`Report for ${report.studentName} downloaded!`);
  };

  const downloadAllReports = () => {
    toast.success(`Downloaded ${reports.length} reports as PDF bundle!`);
  };
  const handlePrint = () => window.print();

  if (viewingReport) {
    return (
      <div className="min-h-screen print:min-h-0">
        <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm print:hidden">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Report Details</h1>
                  <p className="text-sm text-muted-foreground mt-1">View activity report</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setViewingReport(null)} className="cursor-pointer">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Reports
                </Button>
                <Button onClick={handlePrint} className="cursor-pointer">
                  <Printer className="mr-2 h-4 w-4" />
                  Print / Save as PDF
                </Button>
              </div>
            </div>
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
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Reports</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage generated reports
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/teacher')} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Generate Reports Card */}
        {/* <Card className="border-2 border-[#bafde0] shadow-md">
          <CardHeader className="bg-[#edfff8] rounded-t-lg pb-5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-green-600" />
              Generate Reports
            </CardTitle>
            <CardDescription>Generate AI-powered student reports</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'reportType', value })}>
                  <SelectTrigger id="reportType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                    <SelectItem value="progress">Progress Summary</SelectItem>
                    <SelectItem value="brief">Brief Overview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportPeriod">Reporting Period</Label>
                <Select value={reportPeriod} onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'reportPeriod', value })}>
                  <SelectTrigger id="reportPeriod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term1">Term 1 (Sep - Dec)</SelectItem>
                    <SelectItem value="term2">Term 2 (Jan - Apr)</SelectItem>
                    <SelectItem value="term3">Term 3 (May - Aug)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Output Language</Label>
              <Select value={language} onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'language', value })}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bm">Bahasa Melayu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Students</Label>
                <Button variant="outline" size="sm" onClick={selectAllStudents}>
                  {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded border">
                    <Checkbox
                      id={student.id}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <Label htmlFor={student.id} className="flex-1 cursor-pointer flex items-center gap-3">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.classroom}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
              {selectedStudents.length > 0 && (
                <p className="text-sm text-green-600">
                  {selectedStudents.length} student(s) selected for report generation
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              onClick={generateReports}
              disabled={generating || selectedStudents.length === 0}
              size="lg"
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Reports...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Reports ({selectedStudents.length})
                </>
              )}
            </Button>
          </CardContent>
        </Card> */}

        {/* Past Activity Reports Card */}
        <Card className="border-2 border-[#bafde0] shadow-md">
          <CardHeader className="bg-[#edfff8] rounded-t-lg pb-5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5 text-green-600" />
              Activity Reports ({pastReports.length})
            </CardTitle>
            <CardDescription>View and print past reports</CardDescription>
          </CardHeader>
          <CardContent>
            {pastReports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No reports generated yet. Generate a report from the Activities page after completing an activity.
              </p>
            ) : (
              <div className="space-y-3">
                {pastReports.map(report => (
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

        {reports.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Generated Reports ({reports.length})</h2>
              <Button onClick={downloadAllReports}>
                <Download className="mr-2 h-4 w-4" />
                Download All as PDF
              </Button>
            </div>

            {reports.map((report) => (
              <Card key={report.studentId} className="border-2">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{report.studentName}</CardTitle>
                      <CardDescription className="mt-1">{report.reportPeriod}</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => downloadReport(report)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Overall Summary</h3>
                    <p className="text-sm text-muted-foreground italic">"{report.summary}"</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Developmental Progress</h3>
                    <div className="space-y-3">
                      {report.progressData.map((data, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{data.area}</span>
                            <span className="text-blue-600 font-semibold">{data.progress}%</span>
                          </div>
                          <Progress value={data.progress} />
                          <p className="text-xs text-muted-foreground">{data.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {report.dskpReferences && report.dskpReferences.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Curriculum Standards (DSKP)</h3>
                      <div className="flex flex-wrap gap-2">
                        {report.dskpReferences.map((ref, idx) => (
                          <Badge key={idx} variant="secondary">{ref}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-600" />
                      Strengths
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {report.strengths.map((strength, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded text-sm">
                          <div className="w-2 h-2 rounded-full bg-green-600 mt-1.5" />
                          <span>{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Areas for Growth
                    </h3>
                    <ul className="space-y-2">
                      {report.areasForGrowth.map((area, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      Recommendations for Parents
                    </h3>
                    <div className="space-y-2">
                      {report.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <span className="text-purple-600">•</span>
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
