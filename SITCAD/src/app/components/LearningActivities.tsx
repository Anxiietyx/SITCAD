import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getStudentById, getActivitiesByStudent, Activity } from '../data/mockData';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ArrowLeft, Book, Calculator, Users, Activity as ActivityIcon, Palette, Brain, Clock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const activityIcons = {
  literacy: Book,
  numeracy: Calculator,
  social: Users,
  motor: ActivityIcon,
  creative: Palette,
  cognitive: Brain,
};

const activityColors = {
  literacy: 'bg-[#55D6BE]/20 text-[#55D6BE] border-[#55D6BE]/30',
  numeracy: 'bg-[#ACFCD9]/20 text-[#55D6BE] border-[#ACFCD9]/30',
  social: 'bg-[#EFCA08]/20 text-[#EFCA08] border-[#EFCA08]/30',
  motor: 'bg-[#F46197]/20 text-[#F46197] border-[#F46197]/30',
  creative: 'bg-[#55D6BE]/20 text-[#55D6BE] border-[#55D6BE]/30',
  cognitive: 'bg-[#ACFCD9]/20 text-[#55D6BE] border-[#ACFCD9]/30',
};

export function LearningActivities() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  if (!user || !studentId) return null;

  const student = getStudentById(studentId);
  const activities = getActivitiesByStudent(studentId);

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

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h1 className="text-xl font-semibold">{student.name}'s Learning Activities</h1>
              <p className="text-sm text-muted-foreground">
                Track daily activities and learning progress
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(activityIcons).map(([type, Icon]) => {
                const count = activities.filter(a => a.type === type).length;
                return (
                  <div
                    key={type}
                    className={`p-4 rounded-lg border-2 ${activityColors[type as keyof typeof activityColors]}`}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <p className="text-2xl font-semibold">{count}</p>
                    <p className="text-xs capitalize">{type}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              {activities.length} activities completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No activities recorded yet
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map(activity => {
                  const Icon = activityIcons[activity.type];
                  return (
                    <Card 
                      key={activity.id} 
                      className="border-2 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Activity Icon and Type */}
                          <div
                            className={`flex items-center justify-center w-16 h-16 rounded-lg ${activityColors[activity.type]}`}
                          >
                            <Icon className="h-8 w-8" />
                          </div>

                          {/* Activity Details */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-lg">{activity.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {activity.description}
                                </p>
                              </div>
                              {activity.completed && (
                                <Badge variant="secondary" className="gap-1 shrink-0">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Completed
                                </Badge>
                              )}
                            </div>

                            {/* Activity Meta */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {activity.duration} minutes
                              </span>
                              <span>
                                {new Date(activity.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <Badge variant="outline" className={`${activityColors[activity.type]} border`}>
                                {activity.type}
                              </Badge>
                            </div>

                            {/* Score Preview */}
                            {activity.score !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Performance:</span>
                                <span className={`font-semibold ${getScoreColor(activity.score)}`}>
                                  {activity.score}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Activity Details Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedActivity && (() => {
            const Icon = activityIcons[selectedActivity.type];
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-16 h-16 rounded-lg ${activityColors[selectedActivity.type]} flex items-center justify-center shrink-0`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-2xl">{selectedActivity.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={activityColors[selectedActivity.type]}>
                          {selectedActivity.type}
                        </Badge>
                        {selectedActivity.completed && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Activity Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs">Duration</span>
                        </div>
                        <p className="text-lg font-semibold">{selectedActivity.duration} min</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Date</span>
                        </div>
                        <p className="text-sm font-semibold">
                          {new Date(selectedActivity.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="font-semibold mb-2">Activity Description</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{selectedActivity.description}</p>
                    </div>
                  </div>

                  {/* Performance Score */}
                  {selectedActivity.score !== undefined && (
                    <div>
                      <h3 className="font-semibold mb-3">Performance</h3>
                      <Card className="border-2">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Score</span>
                              <span className={`text-2xl font-semibold ${getScoreColor(selectedActivity.score)}`}>
                                {selectedActivity.score}%
                              </span>
                            </div>
                            <Progress value={selectedActivity.score} className="h-3" />
                            <div className="text-xs text-muted-foreground">
                              {selectedActivity.score >= 90 && '🌟 Excellent work!'}
                              {selectedActivity.score >= 75 && selectedActivity.score < 90 && '✨ Great job!'}
                              {selectedActivity.score >= 60 && selectedActivity.score < 75 && '👍 Good effort!'}
                              {selectedActivity.score < 60 && '💪 Keep practicing!'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Teacher Feedback */}
                  {selectedActivity.feedback && (
                    <div>
                      <h3 className="font-semibold mb-2">Teacher Feedback</h3>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm">{selectedActivity.feedback}</p>
                      </div>
                    </div>
                  )}

                  {/* Learning Outcomes */}
                  <div>
                    <h3 className="font-semibold mb-2">Learning Outcomes</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Practiced {selectedActivity.type} skills</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Completed activity in {selectedActivity.duration} minutes</span>
                      </li>
                      {selectedActivity.completed && (
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>Successfully finished all requirements</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    <Button className="w-full" onClick={() => setSelectedActivity(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}