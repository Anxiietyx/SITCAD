import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { ArrowLeft, BookOpen, Brain, Heart, Palette, Activity, Languages, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Progress } from './ui/progress';
import { useState, useEffect } from 'react';

const domainConfig = {
  sosioemosi:               { icon: Heart,     color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  kognitif:                 { icon: Brain,     color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  fizikal_dan_kemahiran:    { icon: Activity,  color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  kreativiti_dan_estetika:  { icon: Palette,   color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  lang_and_lit_malay:       { icon: Languages, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  lang_and_lit_english:     { icon: Languages, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  knw_pendidikan_islam:     { icon: BookOpen,  color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  knw_pendidikan_moral:     { icon: BookOpen,  color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  knw_pendidikan_kewarganegaraan: { icon: BookOpen, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
};

const defaultConfig = { icon: BookOpen, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' };

export function ProgressTracking() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [domains, setDomains] = useState([]);
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [domainDetail, setDomainDetail] = useState({});
  const [scores, setScores] = useState({});  // keyed by `${domain_key}::${spr_code}` → level
  const [savingScore, setSavingScore] = useState(null); // tracks which score is being saved
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the student from API
  useEffect(() => {
    const fetchStudent = async () => {
      if (!user?.id) return;
      try {
        const idToken = await auth.currentUser.getIdToken();
        const endpoint = user.role === 'teacher'
          ? 'http://localhost:8000/teachers/my-students'
          : 'http://localhost:8000/parents/my-children';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        if (!res.ok) throw new Error('Failed to fetch student');
        const students = await res.json();
        const found = students.find(s => s.id === studentId);
        if (!found) {
          setError(user.role === 'parent' ? 'Child not found' : 'Student not found');
        } else {
          setStudent(found);
        }
      } catch (err) {
        console.error('Error fetching student:', err);
        setError(err.message || 'Failed to load student');
      } finally {
        setIsLoadingStudent(false);
      }
    };
    fetchStudent();
  }, [user?.id, studentId]);

  // Fetch curriculum domain list
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await fetch('http://localhost:8000/curriculum/domains');
        if (!res.ok) throw new Error('Failed to fetch curriculum');
        const data = await res.json();
        setDomains(data);
      } catch (err) {
        console.error('Error fetching curriculum domains:', err);
      } finally {
        setIsLoadingDomains(false);
      }
    };
    fetchDomains();
  }, []);

  // Fetch existing scores for this student
  useEffect(() => {
    const fetchScores = async () => {
      if (!user?.id || !studentId) return;
      try {
        const idToken = await auth.currentUser.getIdToken();
        const endpoint = user.role === 'teacher'
          ? `http://localhost:8000/teachers/student-progress/${studentId}`
          : `http://localhost:8000/parents/child-progress/${studentId}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        if (!res.ok) throw new Error('Failed to fetch scores');
        const data = await res.json();
        const scoreMap = {};
        data.forEach(s => { scoreMap[`${s.domain_key}::${s.spr_code}`] = s.level; });
        setScores(scoreMap);
      } catch (err) {
        console.error('Error fetching scores:', err);
      } finally {
        setIsLoadingScores(false);
      }
    };
    fetchScores();
  }, [user?.id, studentId]);

  // Teacher saves a score
  const handleScore = async (domainKey, sprCode, level) => {
    const scoreKey = `${domainKey}::${sprCode}`;
    setSavingScore(scoreKey);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('http://localhost:8000/teachers/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken,
          student_id: studentId,
          domain_key: domainKey,
          spr_code: sprCode,
          level,
        }),
      });
      if (res.ok) {
        setScores(prev => ({ ...prev, [scoreKey]: level }));
      }
    } catch (err) {
      console.error('Error saving score:', err);
    } finally {
      setSavingScore(null);
    }
  };

  // Fetch domain detail when a domain is expanded
  const handleExpandDomain = async (domainKey) => {
    if (expandedDomain === domainKey) {
      setExpandedDomain(null);
      return;
    }
    setExpandedDomain(domainKey);
    if (domainDetail[domainKey]) return; // already loaded
    try {
      const res = await fetch(`http://localhost:8000/curriculum/domains/${domainKey}`);
      if (!res.ok) throw new Error('Failed to fetch domain');
      const data = await res.json();
      setDomainDetail(prev => ({ ...prev, [domainKey]: data }));
    } catch (err) {
      console.error('Error fetching domain detail:', err);
    }
  };

  if (!user || !studentId) return null;

  if (isLoadingStudent) {
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
              onClick={() => navigate(user.role === 'teacher' ? '/teacher' : '/parent')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBack = () => {
    navigate(`/${user.role}/student/${studentId}`);
  };

  const childLabel = user.role === 'parent' ? 'Your child' : student.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{student.name}'s Progress Report</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Developmental progress across all learning domains
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleBack} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Curriculum Domains */}
        {isLoadingDomains ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading curriculum domains...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall fill progress */}
            {!isLoadingScores && (() => {
              const totalSpr = domains.reduce((sum, d) => sum + (d.spr_count || 0), 0);
              const filledSpr = domains.reduce((sum, d) => {
                const filled = Object.keys(scores).filter(k => k.startsWith(d.key + '::')).length;
                return sum + Math.min(filled, d.spr_count || 0);
              }, 0);
              const pct = totalSpr > 0 ? Math.round((filledSpr / totalSpr) * 100) : 0;
              return (
                <Card className="border-2 border-[#bafde0] bg-[#edfff8]">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-base font-semibold">Overall SPR Progress</p>
                      <span className="text-sm font-semibold text-green-700">{filledSpr} / {totalSpr} filled ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-2">SPR = Standard Prestasi — assessment rubrics across all learning domains</p>
                  </CardContent>
                </Card>
              );
            })()}
            <h2 className="text-lg font-semibold">Tunjang Pembelajaran (Learning Domains)</h2>
            {domains.map(domain => {
              const config = domainConfig[domain.key] || defaultConfig;
              const Icon = config.icon;
              const isExpanded = expandedDomain === domain.key;
              const detail = domainDetail[domain.key];
              const totalDomainSpr = domain.spr_count || 0;
              const filledDomainSpr = !isLoadingScores
                ? Object.keys(scores).filter(k => k.startsWith(domain.key + '::')).length
                : null;

              return (
                <Card key={domain.key} className={`border-2 ${isExpanded ? config.border : 'border-gray-200'} transition-all`}>
                  <CardHeader
                    className={`cursor-pointer pt-4 pb-3 ${isExpanded ? `bg-gradient-to-r ${config.color} text-white` : 'hover:bg-gray-50'} transition-all`}
                    onClick={() => handleExpandDomain(domain.key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isExpanded ? 'bg-white/20' : config.bg}`}>
                          <Icon className={`h-5 w-5 ${isExpanded ? 'text-white' : config.text}`} />
                        </div>
                        <div>
                          <CardTitle className={`text-base ${isExpanded ? 'text-white' : ''}`}>
                            {domain.domain}
                          </CardTitle>
                          <CardDescription className={`text-sm mt-0.5 ${isExpanded ? 'text-white/80' : ''}`}>
                            {domain.domain_identifier} — {domain.description?.skills?.length || 0} Kemahiran
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {filledDomainSpr !== null && totalDomainSpr > 0 && (
                          <div className="text-right">
                            <span className={`text-xs font-semibold ${isExpanded ? 'text-white/90' : filledDomainSpr === totalDomainSpr ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {filledDomainSpr}/{totalDomainSpr} filled
                            </span>
                            <div className={`h-1.5 w-20 rounded-full mt-1 ${isExpanded ? 'bg-white/30' : 'bg-gray-200'}`}>
                              <div
                                className={`h-full rounded-full transition-all ${isExpanded ? 'bg-white' : 'bg-green-500'}`}
                                style={{ width: `${Math.round((filledDomainSpr / totalDomainSpr) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90 text-white' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-6">
                      {/* Domain description */}
                      <div className={`p-4 rounded-lg ${config.bg} ${config.border} border`}>
                        <p className="text-sm leading-relaxed">
                          {domain.description?.kandungan_pembelajaran}
                        </p>
                      </div>

                      {/* Focus areas */}
                      {domain.description?.focus?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Fokus Pembelajaran</h4>
                          <ul className="space-y-1">
                            {domain.description.focus.map((f, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${config.badge.split(' ')[0]} shrink-0`} />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Skills overview */}
                      {domain.description?.skills?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Kemahiran (Skills)</h4>
                          <div className="flex flex-wrap gap-2">
                            {domain.description.skills.map(skill => (
                              <Badge key={skill.kn_code} variant="outline" className={config.badge}>
                                {skill.kn_code}: {skill.kn_title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Detailed content — Standard Kemahiran & Standard Pembelajaran */}
                      {detail ? (
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm">Standard Kemahiran (SK) & Standard Pembelajaran (SPE)</h4>
                          <Accordion type="multiple" className="space-y-2">
                            {detail.domain_content?.map((kn, idx, arr) => (
                              <AccordionItem key={kn.kn_code} value={kn.kn_code} className={`border rounded-lg ${idx === arr.length - 1 ? 'border-b-2' : ''}`}>
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                  <div className="flex items-center gap-2 text-left">
                                    <Badge variant="outline" className={config.badge}>{kn.kn_code}</Badge>
                                    <span className="font-medium text-sm">{kn.kn_title}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="space-y-4">
                                    {kn.kn_component_sks?.map((sk) => (
                                      <div key={sk.sk_code} className={`p-4 rounded-lg border ${config.border} ${config.bg}`}>
                                        <div className="flex items-start gap-2 mb-3">
                                          <Badge className={`${config.badge} shrink-0`}>{sk.sk_code}</Badge>
                                          <p className="font-medium text-sm">{sk.sk_title}</p>
                                        </div>
                                        <div className="space-y-2 ml-2">
                                          {sk.sk_component_spes?.map((spe) => (
                                            <div key={spe.spe_code} className="flex items-start gap-2 text-sm bg-white/80 rounded p-2 border border-white">
                                              <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">{spe.spe_code}</span>
                                              <div>
                                                <p>{spe.spe_title}</p>
                                                {spe.spe_note && (
                                                  <p className="text-xs text-muted-foreground mt-1 italic">{spe.spe_note}</p>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>

                          {/* Performance Standards */}
                          {detail.performance_metrics?.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Standard Prestasi (SPR) — Assessment Rubrics</h4>
                              {detail.performance_metrics.map(spr => {
                                const scoreKey = `${domain.key}::${spr.spr_code}`;
                                const currentLevel = scores[scoreKey] || null;
                                const isSaving = savingScore === scoreKey;

                                return (
                                  <Card key={spr.spr_code} className={`border ${config.border}`}>
                                    <CardHeader className="pb-2">
                                      <div className="flex items-start gap-2">
                                        <Badge className={config.badge}>{spr.spr_code}</Badge>
                                        <CardTitle className="text-sm font-medium">{spr.spr_title}</CardTitle>
                                      </div>
                                      <CardDescription className="text-xs">
                                        Covers: {spr.spr_component_sks?.join(', ')}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-2">
                                        {spr.spr_rubric?.map(level => {
                                          const isSelected = currentLevel === level.level;
                                          const isTeacher = user.role === 'teacher';
                                          return (
                                            <div
                                              key={level.level}
                                              className={`flex items-start gap-3 p-2 rounded-lg border transition-all ${
                                                isSelected
                                                  ? 'bg-green-50 border-green-300'
                                                  : 'border-transparent'
                                              } ${isTeacher ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                              onClick={() => {
                                                if (isTeacher && !isSaving) {
                                                  handleScore(domain.key, spr.spr_code, level.level);
                                                }
                                              }}
                                            >
                                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                                isSelected
                                                  ? 'bg-green-500 text-white ring-2 ring-green-300'
                                                  : 'bg-green-100 text-green-700'
                                              }`}>
                                                {level.level}
                                              </div>
                                              <div className="flex-1">
                                                <p className={`text-sm pt-1 ${isSelected ? 'font-medium' : ''}`}>{level.explanation}</p>
                                              </div>
                                              {isSelected && (
                                                <Badge variant="outline" className="shrink-0 text-xs border-green-300 text-green-700">
                                                  {isSaving ? 'Saving...' : '✓ Scored'}
                                                </Badge>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {!currentLevel && user.role === 'teacher' && (
                                        <p className="text-xs text-muted-foreground mt-2 italic">Click a level above to score this student.</p>
                                      )}
                                      {!currentLevel && user.role === 'parent' && (
                                        <p className="text-xs text-muted-foreground mt-2 italic">Not yet scored by teacher.</p>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading curriculum details...</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
