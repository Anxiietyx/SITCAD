import { useReducer, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { formatDateTime } from '../lib/utils';
import { mockStudents, getActivitiesByStudent } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, FileText, Download, Sparkles, Loader2, Printer, TrendingUp, Award, Target, Trophy, AlertCircle, AlertTriangle, Clock, Save, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Duckpit from './Duckpit';
import { reportReducer, initialReportState } from '../reducers/reportReducer';

import { API_BASE } from '../lib/api';

const LEARNING_AREA_LABELS = {
  literacy_bm: 'Literacy (BM)',
  literacy_en: 'Literacy (EN)',
  numeracy: 'Numeracy',
  social: 'Social Skills',
  motor: 'Motor Skills',
  creative: 'Creative Arts',
  cognitive: 'Cognitive',
};

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
  const [loadingReports, setLoadingReports] = useState(true);
  const [viewingReport, setViewingReport] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  // key: `${studentId}::${sprCode}`, value: true (saved) | 'saving'
  const [savedSprs, setSavedSprs] = useState({});

  // SPR code prefix → domain_key mapping
  const SPR_PREFIX_TO_DOMAIN = {
    SE: 'sosioemosi', KF: 'kognitif', FK: 'fizikal_dan_kemahiran',
    KE: 'kreativiti_dan_estetika', BM: 'lang_and_lit_malay',
    BI: 'lang_and_lit_english', PI: 'knw_pendidikan_islam',
    PM: 'knw_pendidikan_moral', KW: 'knw_pendidikan_kewarganegaraan',
  };

  const handleSaveSpr = async (sprCode, level, students) => {
    const prefix = sprCode.split(' ')[0];
    const domainKey = SPR_PREFIX_TO_DOMAIN[prefix];
    if (!domainKey) { toast.error(`Unknown SPR domain for code ${sprCode}`); return; }
    try {
      const idToken = await getIdToken();
      const saves = students.map(async (student) => {
        const key = `${student.id}::${sprCode}`;
        setSavedSprs(prev => ({ ...prev, [key]: 'saving' }));
        const res = await fetch(`${API_BASE}/teachers/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken, student_id: student.id, domain_key: domainKey, spr_code: sprCode, level }),
        });
        if (res.ok) { setSavedSprs(prev => ({ ...prev, [key]: true })); }
        else { setSavedSprs(prev => ({ ...prev, [key]: false })); }
      });
      await Promise.all(saves);
      toast.success(`Saved ${sprCode} Level ${level} for ${students.length} student(s)`);
    } catch (err) {
      toast.error('Failed to save SPR score');
    }
  };

  const handleDeleteReport = async () => {
    if (!deleteTargetId) return;
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${API_BASE}/reports/${deleteTargetId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (!res.ok) throw new Error('Failed to delete report');
      toast.success('Report deleted.');
      setDeleteTargetId(null);
      fetchReports();
    } catch (err) {
      toast.error(err.message || 'Failed to delete report');
    }
  };

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
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
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchReports();
    }
  }, [user?.id, fetchReports]);

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
      const response = await fetch(`${API_BASE}/ai/generate-report`, {
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
          <div className="max-w-7xl mx-auto px-6 py-4">
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
              <Button variant="ghost" onClick={() => setViewingReport(null)} className="cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Reports
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Card className="shadow-md border">
            <CardHeader className="bg-[#edfff8] rounded-t-lg pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center">{viewingReport.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(viewingReport.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="ml-auto print:hidden">
                  <Button variant="outline" onClick={handlePrint} className="cursor-pointer">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

          {/* Summary */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Summary</h2>
            <p className="text-gray-700 leading-relaxed">{viewingReport.summary}</p>
          </div>

          {/* Activity Details */}
          {viewingReport.details && (
            <div className="bg-gray-50 rounded-lg p-5 space-y-2 print:bg-white print:border">
              <h2 className="text-xl font-semibold mb-3">Activity Details</h2>
              {viewingReport.details.activity_title && <p><strong>Activity:</strong> {viewingReport.details.activity_title}</p>}
              {viewingReport.details.activity_description && (
                <p><strong>Description:</strong> {viewingReport.details.activity_description}</p>
              )}
              {viewingReport.details.learning_area && (
                <p><strong>Learning Area:</strong> {LEARNING_AREA_LABELS[viewingReport.details.learning_area] || viewingReport.details.learning_area}</p>
              )}
              {viewingReport.details.duration_minutes != null && (
                <p><strong>Duration:</strong> {viewingReport.details.duration_minutes} minutes</p>
              )}
              {viewingReport.details.assigned_to && (
                <p><strong>Assigned To:</strong> {viewingReport.details.assigned_to === 'class' ? 'Whole Class' : 'Individual'}</p>
              )}
              {(viewingReport.details.student_count ?? viewingReport.details.results_summary?.student_count) != null && (
                <p><strong>Students Involved:</strong> {viewingReport.details.student_count ?? viewingReport.details.results_summary?.student_count}</p>
              )}
              {viewingReport.details.completed_at && (
                <p><strong>Completed:</strong> {new Date(viewingReport.details.completed_at).toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Quiz Results for AI-insights reports (uses results_summary) */}
          {viewingReport.details?.ai_insights && viewingReport.details?.results_summary?.total != null && (() => {
            const rs = viewingReport.details.results_summary;
            return (
              <div className="border-t pt-5 space-y-4">
                <h2 className="text-xl font-semibold">Quiz Results</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                    <Trophy className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-emerald-700">
                      {rs.first_attempt_correct ?? 0}/{rs.total}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Score{rs.score_percentage != null ? ` (${rs.score_percentage}%)` : ''}</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                    <Target className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-emerald-700">
                      {rs.score_percentage != null ? `${rs.score_percentage}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
                  </div>
                  {rs.time_seconds != null && (
                    <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 print:bg-white">
                      <Clock className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-emerald-700">
                        {rs.time_seconds >= 60
                          ? `${Math.floor(rs.time_seconds / 60)}m ${rs.time_seconds % 60}s`
                          : `${rs.time_seconds}s`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Time Taken</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* AI Insights (new-format reports) */}
          {viewingReport.details?.ai_insights && (() => {
            const ins = viewingReport.details.ai_insights;
            return (
              <div className="border-t pt-5 space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-semibold">AI Insights</h2>
                </div>

                {/* Summary */}
                {ins.summary && (
                  <p className="text-sm text-gray-700 leading-relaxed bg-emerald-50 p-4 rounded-lg border border-emerald-200">{ins.summary}</p>
                )}

                {/* SPR Attainment */}
                {ins.spr_attainment?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-blue-600" />
                        <p className="text-base font-semibold text-gray-800">SPR Attainment Levels</p>
                      </div>
                      {/* {viewingReport.students?.length > 0 && (
                        <Button
                          size="sm"
                          className="text-xs bg-[#3090A0] hover:bg-[#2FBFA5] text-white gap-1.5 print:hidden cursor-pointer"
                          onClick={() => ins.spr_attainment.forEach(spr =>
                            handleSaveSpr(spr.spr_code, spr.suggested_level, viewingReport.students)
                          )}
                        >
                          <Save className="h-3 w-3" /> Save All to Progress
                        </Button>
                      )} */}
                    </div>
                    {ins.spr_attainment.map((spr, i) => {
                      const allSaved = viewingReport.students?.every(
                        s => savedSprs[`${s.id}::${spr.spr_code}`] === true
                      );
                      const anySaving = viewingReport.students?.some(
                        s => savedSprs[`${s.id}::${spr.spr_code}`] === 'saving'
                      );
                      return (
                        <div key={i} className={`p-4 bg-white rounded-lg border space-y-1 transition-colors ${allSaved ? 'border-emerald-300 bg-emerald-50' : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-800">{spr.spr_code}</span>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${
                                spr.suggested_level === 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : spr.suggested_level === 2 ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>Level {spr.suggested_level}</Badge>
                              {viewingReport.students?.length > 0 && (
                                allSaved ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium print:hidden">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-6 px-2.5 text-xs bg-[#3090A0] hover:bg-[#2FBFA5] text-white print:hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={anySaving}
                                    onClick={() => handleSaveSpr(spr.spr_code, spr.suggested_level, viewingReport.students)}
                                  >
                                    {anySaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                    {anySaving ? 'Saving…' : 'Save'}
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{spr.spr_title}</p>
                          <p className="text-xs text-gray-600 mt-1">{spr.justification}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Interventions */}
                {ins.interventions?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="text-base font-semibold text-gray-800">Flagged Observations</p>
                    </div>
                    {ins.interventions.map((item, i) => (
                      <div key={i} className={`p-3 rounded-lg border text-sm ${
                        item.severity === 'urgent' ? 'bg-red-50 border-red-200 text-red-800'
                        : item.severity === 'flag' ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}>
                        {item.detail}
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths & Improvements */}
                {(ins.strengths?.length > 0 || ins.areas_for_improvement?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ins.strengths?.length > 0 && (
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                        <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Strengths</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {ins.strengths.map((s, i) => <li key={i} className="flex gap-1.5"><span>•</span><span>{s}</span></li>)}
                        </ul>
                      </div>
                    )}
                    {ins.areas_for_improvement?.length > 0 && (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                        <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Areas to Improve</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {ins.areas_for_improvement.map((a, i) => <li key={i} className="flex gap-1.5"><span>•</span><span>{a}</span></li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendations */}
                {ins.recommendations?.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                    <p className="text-sm font-semibold text-blue-700">Recommendations</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {ins.recommendations.map((r, i) => <li key={i} className="flex gap-1.5"><span>•</span><span>{r}</span></li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}

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
            <div className="mb-3">
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

            </CardContent>
            {/* Print button moved to header */}
          </Card>
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
            {loadingReports ? (
              <div className="space-y-3 py-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-20 bg-gray-100 rounded-full" />
                      <div className="h-5 w-16 bg-gray-100 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pastReports.length === 0 ? (
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {report.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {report.activity_learning_area && (
                          <Badge variant="outline" className="text-xs">
                            {LEARNING_AREA_LABELS[report.activity_learning_area] || report.activity_learning_area}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(report.created_at)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {report.students?.length || 0} students
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTargetId(report.id); }}
                      className="ml-3 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors shrink-0 cursor-pointer"
                      title="Delete report"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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

      {/* Delete Report Confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the report. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              onClick={handleDeleteReport}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
