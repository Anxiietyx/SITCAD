import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getStudentById, getDevelopmentalAreas } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Award, Target } from 'lucide-react';

export function ProgressTracking() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || !studentId) return null;

  const student = getStudentById(studentId);
  const developmentalAreas = getDevelopmentalAreas(studentId);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Student not found</p>
      </div>
    );
  }

  const handleBack = () => {
    navigate(`/${user.role}/student/${studentId}`);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      literacy: 'from-blue-500 to-blue-600',
      numeracy: 'from-green-500 to-green-600',
      social: 'from-purple-500 to-purple-600',
      motor: 'from-orange-500 to-orange-600',
      creative: 'from-pink-500 to-pink-600',
      cognitive: 'from-cyan-500 to-cyan-600',
    };
    return colors[category as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  // Calculate statistics
  const totalMilestones = developmentalAreas.reduce((acc, area) => acc + area.milestones.length, 0);
  const achievedMilestones = developmentalAreas.reduce(
    (acc, area) => acc + area.milestones.filter(m => m.achieved).length,
    0
  );
  const progressPercentage = totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
          <div className="flex items-center gap-4">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h1 className="text-xl font-semibold">{student.name}'s Progress Report</h1>
              <p className="text-sm text-muted-foreground">
                Detailed developmental milestones and achievements
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Overall Progress Card */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="text-2xl">Overall Development Progress</CardTitle>
            <CardDescription className="text-base">
              Tracking growth across all learning areas
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="text-4xl font-bold text-green-600 mb-2">{achievedMilestones}</div>
                <div className="text-sm text-muted-foreground">Milestones Achieved</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-4xl font-bold text-blue-600 mb-2">{totalMilestones - achievedMilestones}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="text-4xl font-bold text-purple-600 mb-2">{progressPercentage}%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Progress</span>
                <span className="text-2xl font-semibold text-purple-600">{student.overallProgress}%</span>
              </div>
              <Progress value={student.overallProgress} className="h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Developmental Areas Progress */}
        <div className="space-y-6">
          {developmentalAreas.map(area => {
            const achievedCount = area.milestones.filter(m => m.achieved).length;
            const percentage = (area.level / area.maxLevel) * 100;

            return (
              <Card key={area.name} className="border-2">
                <CardHeader className={`bg-gradient-to-r ${getCategoryColor(area.category)} text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white text-xl">{area.name}</CardTitle>
                      <CardDescription className="text-white/90 capitalize mt-1">
                        {area.category} Development
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">Level {area.level}</div>
                      <div className="text-sm text-white/80">of {area.maxLevel}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Area Progress</span>
                      <span className="font-semibold">{Math.round(percentage)}%</span>
                    </div>
                    <Progress value={percentage} className="h-3" />
                  </div>

                  {/* Milestones Summary */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Milestones</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-green-600">{achievedCount}</p>
                      <p className="text-xs text-muted-foreground">of {area.milestones.length} achieved</p>
                    </div>
                  </div>

                  {/* Milestones List */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Milestone Details</h4>
                    {area.milestones.map(milestone => (
                      <div
                        key={milestone.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                          milestone.achieved
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="mt-0.5">
                          {milestone.achieved ? (
                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                              <Award className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${milestone.achieved ? 'text-green-900' : 'text-gray-700'}`}>
                            {milestone.description}
                          </p>
                          {milestone.achieved && milestone.achievedDate ? (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                ✓ Achieved
                              </Badge>
                              <span className="text-sm text-green-600">
                                {new Date(milestone.achievedDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="mt-2">
                              In Progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* AI Insights (Mock) */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <CardTitle>AI-Powered Insights</CardTitle>
            </div>
            <CardDescription>
              Personalized recommendations based on {student.name}'s learning patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
              <TrendingUp className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Strong Progress in Numeracy</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {student.name} is excelling in number recognition and counting. Consider introducing simple addition concepts.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
              <Minus className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Steady Development in Literacy</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Letter recognition is progressing well. Continue daily reading activities to reinforce learning.
                </p>
              </div>
            </div>
            {student.needsIntervention && (
              <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <TrendingDown className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Additional Support Recommended</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Some areas may benefit from targeted intervention. Review the interventions section for specific recommendations.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
