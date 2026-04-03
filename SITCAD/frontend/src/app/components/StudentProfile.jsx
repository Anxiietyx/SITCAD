import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Calendar, MapPin, TrendingUp, Award, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function StudentProfile() {
  const { studentId } = useParams(); // Removed type annotation
  const { user } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user?.id) return;
      try {
        setIsLoading(true);
        const idToken = await auth.currentUser.getIdToken();
        
        // Determine which endpoint to use based on user role
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
          setError('Student not found');
        } else {
          setStudent(found);
        }
      } catch (err) {
        console.error('Error fetching student:', err);
        setError(err.message || 'Failed to load student');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [user?.id, studentId]);

  if (!user || !studentId) return null;

  if (isLoading) {
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
    navigate(user.role === 'teacher' ? '/teacher' : '/parent');
  };

  const getCategoryColor = (category) => { // Removed type annotation
    const colors = {
      literacy: 'bg-blue-100 text-blue-700',
      numeracy: 'bg-green-100 text-green-700',
      social: 'bg-purple-100 text-purple-700',
      motor: 'bg-orange-100 text-orange-700',
      creative: 'bg-pink-100 text-pink-700',
      cognitive: 'bg-cyan-100 text-cyan-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700'; // Removed type assertion
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 border-b shadow-sm sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[#bafde0] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{student.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">Student profile and learning activities</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleBack} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Student Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-purple-200"
              >
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-semibold mb-2">{student.name}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Age {student.age}
                      </span>
                      {student.classroom && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {student.classroom}
                        </span>
                      )}
                      <span>Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {student.needs_intervention && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Needs Support
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
            {/* <TabsTrigger value="activities" onClick={() => navigate(`/${user.role}/student/${studentId}/activities`)}>Learning Activities</TabsTrigger> */}
            <TabsTrigger value="progress" className="cursor-pointer" onClick={() => navigate(`/${user.role}/student/${studentId}/progress`)}>Progress Report</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
                <CardDescription>
                  Basic details and enrollment information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg font-semibold">{student.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Age</p>
                    <p className="text-lg font-semibold">{student.age} years old</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Classroom</p>
                    <p className="text-lg font-semibold">{student.classroom || 'Not assigned yet'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Enrollment Date</p>
                    <p className="text-lg font-semibold">{new Date(student.enrollment_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>
                  Extended learning profile (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Detailed learning progress, developmental milestones, and activity history will be available here once integrated with the learning tracking system.
                </p>
              </CardContent>
            </Card> */}

            <Card>
              <CardHeader>
                <CardTitle>Support Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">
                      {student.needs_intervention ? 'Requires Intervention' : 'No Intervention Required'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {student.needs_intervention 
                        ? `${user.role === 'parent' ? 'Your child has' : 'This student has'} been flagged as needing additional support.`
                        : `${user.role === 'parent' ? 'Your child is' : 'This student is'} progressing well without additional interventions.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}