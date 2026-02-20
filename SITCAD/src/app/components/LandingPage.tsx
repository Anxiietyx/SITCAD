import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { GraduationCap, Sparkles, Brain, TrendingUp, MessageSquare, Calendar, Users, Award, FileText, Monitor, Heart, CheckCircle2, Star } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Secure authentication with role-based access for teachers and parents',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking',
      description: 'Comprehensive student profiles with visual progress monitoring',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Brain,
      title: 'AI Development Analysis',
      description: 'Identify learning patterns and provide early intervention insights',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Calendar,
      title: 'Activity Management',
      description: 'Create and assign personalized learning activities',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: Sparkles,
      title: 'AI Lesson Planning',
      description: 'Generate comprehensive lesson plans with AI assistance',
      color: 'bg-pink-100 text-pink-600',
    },
    {
      icon: FileText,
      title: 'Progress Reports',
      description: 'Automated report generation for easy parent communication',
      color: 'bg-cyan-100 text-cyan-600',
    },
    {
      icon: MessageSquare,
      title: 'Communication Hub',
      description: 'Seamless messaging between teachers and parents',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: Monitor,
      title: 'Classroom Mode',
      description: 'Whole-class teaching tools for live instruction',
      color: 'bg-red-100 text-red-600',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Kindergarten Teacher',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      text: 'This system has transformed how I track student progress. The AI insights help me identify learning gaps early!',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Parent',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      text: "I love being able to see my child's daily progress and communicate easily with the teacher. It's amazing!",
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'School Administrator',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
      text: 'The automated reporting saves our teachers hours each week. The AI recommendations are incredibly accurate.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold text-xl">KinderLearn AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Log In
            </Button>
            <Button onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <Sparkles className="mr-1 h-3 w-3" />
                AI-Powered Learning Management
              </Badge>
              <h1 className="text-5xl font-bold leading-tight">
                Transform Kindergarten Learning with AI
              </h1>
              <p className="text-xl text-muted-foreground">
                Empower teachers with intelligent insights and connect parents to their child's learning journey. 
                Personalized support for every young learner.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate('/register')}>
                  Start Free Trial
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                  View Demo
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm">14-day free trial</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-3xl opacity-20"></div>
              <Card className="relative border-2 shadow-2xl">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">AI-Powered Insights</h3>
                      <p className="text-sm text-muted-foreground">Real-time developmental analysis</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">Literacy Skills</span>
                      <Badge className="bg-green-600">85%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">Social Development</span>
                      <Badge className="bg-blue-600">92%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium">Cognitive Growth</span>
                      <Badge className="bg-purple-600">78%</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">
                      AI recommends advanced phonics activities
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Comprehensive Features</Badge>
            <h2 className="text-4xl font-bold mb-4">Everything You Need in One Place</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              8 powerful modules designed to support teachers, engage parents, and nurture every child's potential
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Teachers */}
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-white text-2xl">For Teachers</CardTitle>
                    <CardDescription className="text-white/90">
                      Save time, increase impact
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">AI-Powered Lesson Planning</p>
                    <p className="text-sm text-muted-foreground">Generate comprehensive plans in minutes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Automated Progress Reports</p>
                    <p className="text-sm text-muted-foreground">Reduce reporting time by 80%</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Early Intervention Alerts</p>
                    <p className="text-sm text-muted-foreground">Identify students needing support instantly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Classroom Teaching Mode</p>
                    <p className="text-sm text-muted-foreground">Manage whole-class activities seamlessly</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* For Parents */}
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <div className="flex items-center gap-3">
                  <Heart className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-white text-2xl">For Parents</CardTitle>
                    <CardDescription className="text-white/90">
                      Stay connected, stay informed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Real-Time Progress Updates</p>
                    <p className="text-sm text-muted-foreground">See your child's daily achievements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Direct Teacher Communication</p>
                    <p className="text-sm text-muted-foreground">Message teachers anytime, anywhere</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Developmental Insights</p>
                    <p className="text-sm text-muted-foreground">Understand your child's learning journey</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Activity Suggestions</p>
                    <p className="text-sm text-muted-foreground">Get personalized at-home learning tips</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl font-bold mb-4">Loved by Educators & Parents</h2>
            <p className="text-xl text-muted-foreground">
              See what our community has to say
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to Transform Your Classroom?</h2>
          <p className="text-xl text-white/90">
            Join thousands of educators using AI to provide personalized learning experiences
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
              Start Free Trial
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20" onClick={() => navigate('/login')}>
              Schedule a Demo
            </Button>
          </div>
          <p className="text-sm text-white/80 pt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold">KinderLearn AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-Powered kindergarten learning management for better outcomes
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Demo</a></li>
                <li><a href="#" className="hover:text-foreground">Updates</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 KinderLearn AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
