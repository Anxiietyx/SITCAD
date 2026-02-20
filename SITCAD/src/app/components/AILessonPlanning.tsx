import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ArrowLeft, Sparkles, Lightbulb, Target, Clock, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LessonPlan {
  id: string;
  title: string;
  ageGroup: string;
  learningArea: string;
  duration: string;
  objectives: string[];
  materials: string[];
  activities: {
    step: number;
    title: string;
    description: string;
    duration: string;
  }[];
  assessment: string;
  adaptations: string[];
}

export function AILessonPlanning() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  
  const [ageGroup, setAgeGroup] = useState('4-5');
  const [learningArea, setLearningArea] = useState('literacy');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('30');
  const [additionalNotes, setAdditionalNotes] = useState('');

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const generateLessonPlan = async () => {
    if (!topic) {
      toast.error('Please enter a topic for the lesson');
      return;
    }

    setLoading(true);
    
    // Simulate AI generation with a delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock AI-generated lesson plan
    const mockLessonPlan: LessonPlan = {
      id: `lesson_${Date.now()}`,
      title: `${topic} Exploration`,
      ageGroup,
      learningArea,
      duration: `${duration} minutes`,
      objectives: [
        `Introduce basic concepts of ${topic}`,
        'Develop fine motor skills through hands-on activities',
        'Encourage verbal expression and communication',
        'Foster curiosity and exploration',
      ],
      materials: [
        'Visual aids and picture cards',
        'Hands-on manipulatives',
        'Art supplies (crayons, paper, scissors)',
        'Interactive storybooks',
        'Music player for transitions',
      ],
      activities: [
        {
          step: 1,
          title: 'Circle Time Introduction',
          description: `Gather students in a circle and introduce the topic of ${topic}. Use visual aids and encourage students to share what they know.`,
          duration: '5-7 minutes',
        },
        {
          step: 2,
          title: 'Interactive Story',
          description: `Read an engaging story related to ${topic}. Pause to ask questions and encourage predictions.`,
          duration: '8-10 minutes',
        },
        {
          step: 3,
          title: 'Hands-On Activity',
          description: `Students explore ${topic} through a structured activity with manipulatives. Teacher circulates to provide support.`,
          duration: '10-12 minutes',
        },
        {
          step: 4,
          title: 'Creative Expression',
          description: 'Students create artwork or crafts related to the lesson topic, reinforcing concepts learned.',
          duration: '8-10 minutes',
        },
        {
          step: 5,
          title: 'Closing & Review',
          description: 'Gather students to review what they learned. Sing a related song and preview upcoming activities.',
          duration: '3-5 minutes',
        },
      ],
      assessment: 'Observe student participation, listen to verbal responses, and review completed activities. Note students who may need additional support or enrichment.',
      adaptations: [
        'For visual learners: Provide extra visual supports and diagrams',
        'For kinesthetic learners: Include more movement-based activities',
        'For advanced students: Offer extension activities with increased complexity',
        'For students needing support: Provide one-on-one assistance and simplified instructions',
        'For English language learners: Use visual cues and gestures to support understanding',
      ],
    };

    setLessonPlan(mockLessonPlan);
    setLoading(false);
    toast.success('Lesson plan generated successfully!');
  };

  const saveLessonPlan = () => {
    // Mock save - in production, this would save to Supabase
    toast.success('Lesson plan saved to your library!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/teacher')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">AI Lesson Planning Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Generate personalized lesson plans powered by AI
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Input Form */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              Lesson Plan Generator
            </CardTitle>
            <CardDescription>
              Tell us about your lesson and we'll create a comprehensive plan
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger id="ageGroup">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-4">3-4 years old</SelectItem>
                    <SelectItem value="4-5">4-5 years old</SelectItem>
                    <SelectItem value="5-6">5-6 years old</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="learningArea">Learning Area</Label>
                <Select value={learningArea} onValueChange={setLearningArea}>
                  <SelectTrigger id="learningArea">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="literacy">Literacy</SelectItem>
                    <SelectItem value="numeracy">Numeracy</SelectItem>
                    <SelectItem value="social">Social Skills</SelectItem>
                    <SelectItem value="motor">Motor Skills</SelectItem>
                    <SelectItem value="creative">Creative Arts</SelectItem>
                    <SelectItem value="cognitive">Cognitive Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Lesson Topic *</Label>
              <Textarea
                id="topic"
                placeholder="e.g., The letter 'B' and animals that start with B"
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any specific requirements, student considerations, or resources you'd like to include..."
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={generateLessonPlan}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Lesson Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Lesson Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Lesson Plan */}
        {lessonPlan && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{lessonPlan.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        Ages {lessonPlan.ageGroup}
                      </Badge>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {lessonPlan.duration}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {lessonPlan.learningArea}
                      </Badge>
                    </div>
                  </div>
                  <Button onClick={saveLessonPlan}>
                    Save Plan
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Learning Objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lessonPlan.objectives.map((obj, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader>
                <CardTitle>Materials Needed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {lessonPlan.materials.map((material, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                      <span className="text-sm">{material}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Sequence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lessonPlan.activities.map((activity) => (
                    <div key={activity.step} className="flex gap-4 p-4 border-2 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
                        {activity.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{activity.title}</h3>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {activity.duration}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{lessonPlan.assessment}</p>
              </CardContent>
            </Card>

            {/* Adaptations */}
            <Card>
              <CardHeader>
                <CardTitle>Differentiation & Adaptations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lessonPlan.adaptations.map((adaptation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <Lightbulb className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <p className="text-sm">{adaptation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
