import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { mockStudents, Student } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, FileText, Download, Sparkles, Loader2, TrendingUp, Award, Target } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedReport {
  studentId: string;
  studentName: string;
  reportPeriod: string;
  summary: string;
  strengths: string[];
  areasForGrowth: string[];
  recommendations: string[];
  progressData: {
    area: string;
    progress: number;
    comment: string;
  }[];
}

export function ReportGeneration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('comprehensive');
  const [reportPeriod, setReportPeriod] = useState('term1');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<GeneratedReport[]>([]);

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const students = mockStudents;

  const handleStudentToggle = (studentId: string) => {
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
    const newReports: GeneratedReport[] = selectedStudents.map(studentId => {
      const student = students.find(s => s.id === studentId)!;
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

  const downloadReport = (report: GeneratedReport) => {
    toast.success(`Report for ${report.studentName} downloaded!`);
  };

  const downloadAllReports = () => {
    toast.success(`Downloaded ${reports.length} reports as PDF bundle!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/teacher')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">AI Progress Report Generation</h1>
              <p className="text-sm text-muted-foreground">
                Automatically generate comprehensive student reports
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Configuration Card */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              Configure Report Generation
            </CardTitle>
            <CardDescription>
              Select students and report parameters
            </CardDescription>
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

              <div className="space-y-2">
                <Label htmlFor="reportPeriod">Reporting Period</Label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
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
                  {/* Summary */}
                  <div>
                    <h3 className="font-semibold mb-2">Overall Summary</h3>
                    <p className="text-sm text-muted-foreground">{report.summary}</p>
                  </div>

                  {/* Progress Data */}
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

                  {/* Strengths */}
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

                  {/* Areas for Growth */}
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

                  {/* Recommendations */}
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
