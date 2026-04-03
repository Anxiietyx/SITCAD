import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, FileText, Clock, Users, Printer, Trophy, Target } from 'lucide-react';

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

  const students = mockStudents;

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const generateReports = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Mock AI-generated reports
    const newReports = selectedStudents.map(studentId => {
      const student = students.find(s => s.id === studentId); // Removed '!' assertion
      return {
        studentId,
        studentName: student.name,
        reportPeriod: reportPeriod === 'term1' ? 'Term 1 (Sep - Dec 2025)' : 'Term 2 (Jan - Apr 2026)',
        summary: `${student.name} has shown ${student.developmentalStage === 'advanced' || student.developmentalStage === 'proficient' ? 'excellent' : 'steady'} progress throughout the reporting period. ${student.name} demonstrates ${student.developmentalStage === 'advanced' ? 'exceptional curiosity and advanced skills' : student.developmentalStage === 'proficient' ? 'strong engagement and growing independence' : student.developmentalStage === 'developing' ? 'positive growth and increasing confidence' : 'emerging skills with supportive guidance'}. Overall progress is tracking well with age-appropriate developmental milestones.`,
        strengths: [
          'Shows enthusiasm for learning activities',
          'Demonstrates good social interaction with peers',
          'Follows classroom routines and instructions well',
          student.overallProgress > 75 ? 'Excels in problem-solving activities' : 'Making consistent progress in all areas',
        ],
        areasForGrowth: [
          'Continue practicing letter recognition at home',
          'Develop fine motor skills through drawing and crafts',
          'Increase independence in self-help tasks',
        ],
        recommendations: [
          'Read together for 15-20 minutes daily',
          'Practice counting objects during everyday activities',
          'Encourage creative play and imagination',
          'Maintain consistent routines at home',
        ],
        progressData: [
          { area: 'Literacy Skills', progress: student.overallProgress, comment: 'Making good progress with letter recognition' },
          { area: 'Numeracy Skills', progress: student.overallProgress + 5, comment: 'Strong counting and number sense' },
          { area: 'Social-Emotional', progress: student.overallProgress - 5, comment: 'Growing confidence in group settings' },
          { area: 'Physical Development', progress: student.overallProgress, comment: 'Developing fine and gross motor skills' },
        ],
      };
    });

    setReports(newReports);
    setGenerating(false);
    toast.success(`Generated ${newReports.length} report(s) successfully!`);
  };

  const downloadReport = (report) => {
    toast.success(`Report for ${report.studentName} downloaded!`);
  };

  const downloadAllReports = () => {
    toast.success(`Downloaded ${reports.length} reports as PDF bundle!`);
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">AI Progress Report Generation</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically generate comprehensive student reports
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/teacher')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Configuration Card */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-linear-to-r from-green-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              Configure Report Generation
            </CardTitle>
            <CardDescription>
              Select students and report parameters
            </CardDescription>
            <div className="pb-3"></div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
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
                ))}
              </div>
              {selectedStudents.length > 0 && (
                <p className="text-sm text-green-600">
                  {selectedStudents.length} student(s) selected for report generation
                </p>
              )}
            </div>

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
        </Card>

        {/* Generated Reports */}
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
                <CardHeader className="bg-linear-to-r from-blue-50 to-purple-50">
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
