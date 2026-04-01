import { useReducer } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { mockStudents, getActivitiesByStudent } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, FileText, Download, Sparkles, Loader2, TrendingUp, Award, Target, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Duckpit from './Duckpit';
import { reportReducer, initialReportState } from '../reducers/reportReducer';

export function ReportGeneration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reportReducer, initialReportState);
  const { reportType, reportPeriod, language, selectedStudents, generating, reports, error } = state;

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Duckpit count={24} gravity={0.5} friction={0.9975} wallBounce={0.9} className="h-full w-full opacity-100" />
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/72 via-white/58 to-emerald-50/72" />

      <div className="relative z-10">
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
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
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
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
    </div>
  );
}