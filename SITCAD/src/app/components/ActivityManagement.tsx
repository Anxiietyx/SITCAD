import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { mockStudents, Activity } from '../data/mockData';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, Plus, Calendar, Clock, Book, Calculator, Users, Activity as ActivityIcon, Palette, Brain, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const activityTypes = [
  { value: 'literacy', label: 'Literacy', icon: Book, color: 'bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30' },
  { value: 'numeracy', label: 'Numeracy', icon: Calculator, color: 'bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30' },
  { value: 'social', label: 'Social Skills', icon: Users, color: 'bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30' },
  { value: 'motor', label: 'Motor Skills', icon: ActivityIcon, color: 'bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30' },
  { value: 'creative', label: 'Creative Arts', icon: Palette, color: 'bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30' },
  { value: 'cognitive', label: 'Cognitive', icon: Brain, color: 'bg-[#f46197]/20 text-[#f46197] border-[#f46197]/30' },
];

export function ActivityManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<(Activity & { assignedTo: string }) | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Activity['type']>('literacy');
  const [duration, setDuration] = useState('20');
  const [assignTo, setAssignTo] = useState<'all' | 'individual'>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  const students = mockStudents;

  const handleCreateActivity = () => {
    if (!title || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Mock activity creation - in production, this would save to Supabase
    const newActivity = {
      id: `act_${Date.now()}`,
      type,
      title,
      description,
      date: new Date().toISOString().split('T')[0],
      duration: parseInt(duration),
      completed: false,
      assignedTo: assignTo === 'all' ? 'all' : selectedStudents,
    };

    toast.success(`Activity "${title}" created successfully!`);
    
    // Reset form
    setTitle('');
    setDescription('');
    setType('literacy');
    setDuration('20');
    setAssignTo('all');
    setSelectedStudents([]);
    setOpen(false);
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const mockActivities: (Activity & { assignedTo: string })[] = [
    {
      id: 'act1',
      studentId: 'all',
      type: 'literacy',
      title: 'Letter Recognition: A-Z',
      description: 'Identify and trace uppercase letters A through Z',
      date: '2026-02-19',
      duration: 30,
      completed: false,
      assignedTo: 'Whole Class',
    },
    {
      id: 'act2',
      studentId: 'student1',
      type: 'numeracy',
      title: 'Counting Practice 1-20',
      description: 'Count objects and match with numbers',
      date: '2026-02-19',
      duration: 30,
      completed: false,
      assignedTo: 'Whole Class',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#55D6BE] to-[#ACFCD9] rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-Black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Activity Management</h1>
                <p className="text-sm text-muted-foreground">
                  Create and assign learning activities to student
                </p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Activity</DialogTitle>
                  <DialogDescription>
                    Design a learning activity for your students
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Activity Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Letter Recognition Practice"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the activity objectives and instructions..."
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Activity Type</Label>
                      <Select value={type} onValueChange={(value) => setType(value as Activity['type'])}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {activityTypes.map(({ value, label, icon: Icon }) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="5"
                        max="60"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Assign To</Label>
                    <Tabs value={assignTo} onValueChange={(value) => setAssignTo(value as 'all' | 'individual')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">Whole Class</TabsTrigger>
                        <TabsTrigger value="individual">Individual Students</TabsTrigger>
                      </TabsList>
                      <TabsContent value="all" className="pt-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900">
                            This activity will be assigned to all {students.length} students in your class
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent value="individual" className="space-y-3 pt-4">
                        <p className="text-sm text-muted-foreground">
                          Select students to assign this activity:
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                          {students.map((student) => (
                            <div key={student.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                              <Checkbox
                                id={student.id}
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={() => handleStudentToggle(student.id)}
                              />
                              <Label htmlFor={student.id} className="flex-1 cursor-pointer flex items-center gap-3">
                                <img
                                  src={student.avatar}
                                  alt={student.name}
                                  className="w-8 h-8 rounded-full object-cover"
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
                            {selectedStudents.length} student(s) selected
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleCreateActivity}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Activity
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Activity Type Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {activityTypes.map(({ value, label, icon: Icon, color }) => (
            <Card key={value}>
              <CardContent className="pt-6">
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-3`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-2xl font-semibold mb-1">
                  {mockActivities.filter(a => a.type === value).length}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle>Created Activities</CardTitle>
            <CardDescription>
              Manage and track all learning activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.map((activity) => {
                const activityType = activityTypes.find(t => t.value === activity.type);
                const Icon = activityType?.icon || Book;
                
                return (
                  <Card 
                    key={activity.id} 
                    className="border-2 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className={`w-16 h-16 rounded-lg ${activityType?.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-lg">{activity.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {activity.description}
                              </p>
                            </div>
                            <Badge variant="outline" className={activityType?.color}>
                              {activityType?.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {activity.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(activity.date).toLocaleDateString()}
                            </span>
                            <Badge variant="secondary">
                              {activity.assignedTo}
                            </Badge>
                            {activity.completed && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Activity Details Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent className="max-w-2xl">
          {selectedActivity && (() => {
            const activityType = activityTypes.find(t => t.value === selectedActivity.type);
            const Icon = activityType?.icon || Book;
            
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-16 h-16 rounded-lg ${activityType?.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-2xl">{selectedActivity.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={activityType?.color}>
                          {activityType?.label}
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
                  <div className="grid grid-cols-3 gap-4">
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
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">Date</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {new Date(selectedActivity.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">Assigned</span>
                        </div>
                        <p className="text-sm font-semibold line-clamp-2">{selectedActivity.assignedTo}</p>
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

                  {/* Objectives Section */}
                  <div>
                    <h3 className="font-semibold mb-2">Learning Objectives</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Develop {selectedActivity.type} skills through hands-on practice</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Build confidence and competence in target area</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Foster engagement and enjoyment in learning</span>
                      </li>
                    </ul>
                  </div>

                  {/* Materials Needed */}
                  <div>
                    <h3 className="font-semibold mb-2">Materials Needed</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Worksheets</Badge>
                      <Badge variant="outline">Pencils</Badge>
                      <Badge variant="outline">Manipulatives</Badge>
                      <Badge variant="outline">Visual Aids</Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedActivity(null)}>
                      Close
                    </Button>
                    <Button className="flex-1" onClick={() => {
                      toast.success('Activity updated successfully!');
                      setSelectedActivity(null);
                    }}>
                      Mark as Complete
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