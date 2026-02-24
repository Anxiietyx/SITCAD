import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  GraduationCap, Sparkles, Brain, TrendingUp, MessageSquare, Calendar, Users,
  Award, FileText, Monitor, Heart, CheckCircle2, Star, BookOpen, Lightbulb,
  Palette, Music, Puzzle, Zap, ArrowRight, ArrowLeft, Play, Shield, Bell, Smartphone, Home,
  ChevronLeft, ChevronRight
} from 'lucide-react';

/* Floating icon decoration */
function FloatingIcon({ icon: Icon, className }: { icon: React.ElementType; className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <Icon className="w-full h-full" />
    </div>
  );
}

const TOTAL_SLIDES = 6;

const slideLabels = ['Home', 'Preview', 'Features', 'Benefits', 'Reviews', 'Join'];

export function LandingPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((i: number) => {
    setCurrent(Math.max(0, Math.min(TOTAL_SLIDES - 1, i)));
  }, []);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  // Swipe / wheel support
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (timeout) return;
      timeout = setTimeout(() => { timeout = null; }, 600);
      if (e.deltaY > 30 || e.deltaX > 30) next();
      else if (e.deltaY < -30 || e.deltaX < -30) prev();
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, [next, prev]);

  const features = [
    { icon: Users, title: 'User Management', description: 'Secure role-based access for teachers and parents', color: 'bg-[#F46197]/15 text-[#F46197]', border: 'border-[#F46197]/30' },
    { icon: TrendingUp, title: 'Progress Tracking', description: 'Visual progress monitoring and student profiles', color: 'bg-[#55D6BE]/15 text-[#55D6BE]', border: 'border-[#55D6BE]/30' },
    { icon: Brain, title: 'AI Analysis', description: 'Identify learning patterns and intervention insights', color: 'bg-[#EFCA08]/15 text-[#EFCA08]', border: 'border-[#EFCA08]/30' },
    { icon: Calendar, title: 'Activities', description: 'Create and assign personalized learning activities', color: 'bg-[#F46197]/15 text-[#F46197]', border: 'border-[#F46197]/30' },
    { icon: Sparkles, title: 'Lesson Planning', description: 'AI-generated comprehensive lesson plans', color: 'bg-[#55D6BE]/15 text-[#55D6BE]', border: 'border-[#55D6BE]/30' },
    { icon: FileText, title: 'Reports', description: 'Automated report generation for parents', color: 'bg-[#EFCA08]/15 text-[#EFCA08]', border: 'border-[#EFCA08]/30' },
    { icon: MessageSquare, title: 'Communication', description: 'Seamless messaging between teachers and parents', color: 'bg-[#ACFCD9]/20 text-[#55D6BE]', border: 'border-[#ACFCD9]/30' },
    { icon: Monitor, title: 'Classroom Mode', description: 'Whole-class teaching tools for live instruction', color: 'bg-[#F46197]/15 text-[#F46197]', border: 'border-[#F46197]/30' },
  ];

  const testimonials = [
    { name: 'Sarah Johnson', role: 'Kindergarten Teacher', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop', text: 'This system has transformed how I track student progress. The AI insights help me identify learning gaps early!', rating: 5 },
    { name: 'Michael Chen', role: 'Parent', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', text: "I love being able to see my child's daily progress and communicate easily with the teacher. It's amazing!", rating: 5 },
    { name: 'Emily Rodriguez', role: 'School Administrator', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop', text: 'The automated reporting saves our teachers hours each week. The AI recommendations are incredibly accurate.', rating: 5 },
  ];

  const stats = [
    { value: '5,000+', label: 'Active Students', icon: Users },
    { value: '500+', label: 'Teachers', icon: Award },
    { value: '95%', label: 'Satisfaction', icon: Heart },
    { value: '80%', label: 'Time Saved', icon: Zap },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-white">
      {/* Fixed top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b-2 border-[#ACFCD9]">
        <div className="max-w-[100vw] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#F46197] to-[#EFCA08] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg font-serif">KinderLearn AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-[#F46197] hover:bg-[#F46197]/10 font-semibold" onClick={() => navigate('/login')}>
              Log In
            </Button>
            <Button size="sm" className="bg-[#F46197] hover:bg-[#e0507f] text-white rounded-full px-5" onClick={() => navigate('/register')}>
              Get Started
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Slide track */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ width: `${TOTAL_SLIDES * 100}vw`, transform: `translateX(-${current * 100}vw)` }}
      >

        {/* ===== SLIDE 1 — Hero ===== */}
        <section
          className="w-screen h-screen flex-shrink-0 flex items-center justify-center relative px-8 pt-14"
          style={{ background: 'linear-gradient(160deg, #ACFCD9 0%, #ffffff 35%, #FFF5F9 65%, #FFFDE7 100%)' }}
        >
          <FloatingIcon icon={BookOpen} className="w-10 h-10 text-[#F46197]/20 top-20 left-[8%] animate-float" />
          <FloatingIcon icon={Lightbulb} className="w-8 h-8 text-[#EFCA08]/25 top-24 right-[12%] animate-float-slow" />
          <FloatingIcon icon={Palette} className="w-12 h-12 text-[#55D6BE]/15 bottom-20 left-[5%] animate-float" />
          <FloatingIcon icon={Music} className="w-9 h-9 text-[#F46197]/15 bottom-28 right-[8%] animate-float-slow" />
          <FloatingIcon icon={Puzzle} className="w-8 h-8 text-[#EFCA08]/20 top-1/2 left-[3%] animate-wiggle" />
          <FloatingIcon icon={Star} className="w-7 h-7 text-[#55D6BE]/20 top-32 right-[30%] animate-float" />

          {/* Mascot — waving */}
          <img src="/mascot/waving_hand_1.png" alt="Mascot waving" className="absolute bottom-8 right-[6%] w-48 lg:w-64 drop-shadow-xl animate-float-slow pointer-events-none select-none" />

          <div className="text-center max-w-3xl mx-auto space-y-7 animate-fade-in-up">
            <Badge className="bg-[#EFCA08]/20 text-[#B89A00] border-[#EFCA08]/40 text-sm px-4 py-1.5 rounded-full">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI-Powered Learning Management
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] font-serif tracking-tight">
              Where{' '}
              <span className="text-[#F46197] relative">
                Learning
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none"><path d="M2 8c40-6 80-6 196-2" stroke="#F46197" strokeWidth="3" strokeLinecap="round" opacity="0.4"/></svg>
              </span>{' '}
              Meets{' '}
              <span className="text-[#55D6BE]">Fun</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Empower teachers with intelligent insights and connect parents to their child's learning journey. Personalized support for every young learner.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-1">
              <Button size="lg" className="bg-[#F46197] hover:bg-[#e0507f] text-white rounded-full px-10 text-lg h-14 transition-transform hover:scale-105 shadow-lg shadow-[#F46197]/25" onClick={() => navigate('/register')}>
                Start Free Trial
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-[#55D6BE] text-[#55D6BE] hover:bg-[#55D6BE]/10 rounded-full px-10 text-lg h-14 transition-transform hover:scale-105" onClick={() => navigate('/login')}>
                <Play className="mr-2 h-5 w-5 fill-[#55D6BE]" />
                Watch Demo
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#55D6BE]" /><span className="text-sm">No credit card</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#55D6BE]" /><span className="text-sm">14-day free trial</span></div>
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-[#55D6BE]" /><span className="text-sm">Bank-level security</span></div>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 2 — Preview + Stats ===== */}
        <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center relative px-8 pt-14 bg-white">
          {/* Mascot — clipboard */}
          <img src="/mascot/clipboard_1.png" alt="Mascot with clipboard" className="absolute bottom-10 left-[4%] w-36 lg:w-44 drop-shadow-lg animate-float pointer-events-none select-none" />
          <div className="max-w-5xl w-full mx-auto space-y-10">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="text-center space-y-1">
                    <div className="w-11 h-11 mx-auto rounded-xl bg-[#ACFCD9]/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#55D6BE]" />
                    </div>
                    <p className="text-2xl font-bold font-serif">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                );
              })}
            </div>
            {/* Dashboard preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#F46197]/15 via-[#EFCA08]/10 to-[#55D6BE]/15 rounded-3xl blur-2xl"></div>
              <Card className="relative border-2 border-[#ACFCD9]/60 shadow-2xl rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-[#F46197] via-[#EFCA08] to-[#55D6BE]"></div>
                <CardContent className="p-6 lg:p-8">
                  <div className="grid grid-cols-3 gap-6">
                    {/* AI Insights */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#F46197] to-[#EFCA08] rounded-xl flex items-center justify-center">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="font-bold font-serif text-sm">AI Insights</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-[#55D6BE]/10 rounded-lg border border-[#55D6BE]/20">
                          <div className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-[#55D6BE]" /><span className="text-xs font-medium">Literacy</span></div>
                          <Badge className="bg-[#55D6BE] text-white rounded-full text-[10px] px-2 py-0">85%</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-[#EFCA08]/10 rounded-lg border border-[#EFCA08]/20">
                          <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-[#EFCA08]" /><span className="text-xs font-medium">Social</span></div>
                          <Badge className="bg-[#EFCA08] text-white rounded-full text-[10px] px-2 py-0">92%</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-[#F46197]/10 rounded-lg border border-[#F46197]/20">
                          <div className="flex items-center gap-2"><Puzzle className="h-3.5 w-3.5 text-[#F46197]" /><span className="text-xs font-medium">Cognitive</span></div>
                          <Badge className="bg-[#F46197] text-white rounded-full text-[10px] px-2 py-0">78%</Badge>
                        </div>
                      </div>
                    </div>
                    {/* Today's Plan */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#55D6BE] to-[#ACFCD9] rounded-xl flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="font-bold font-serif text-sm">Today's Plan</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-[#ACFCD9]/15 rounded-lg border border-[#ACFCD9]/25">
                          <div className="w-2 h-2 rounded-full bg-[#55D6BE]"></div><span className="text-xs">Story Time — 9:00 AM</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-[#EFCA08]/10 rounded-lg border border-[#EFCA08]/20">
                          <div className="w-2 h-2 rounded-full bg-[#EFCA08]"></div><span className="text-xs">Art & Craft — 10:30 AM</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-[#F46197]/10 rounded-lg border border-[#F46197]/20">
                          <div className="w-2 h-2 rounded-full bg-[#F46197]"></div><span className="text-xs">Phonics Game — 1:00 PM</span>
                        </div>
                      </div>
                    </div>
                    {/* AI Picks */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#EFCA08] to-[#F46197] rounded-xl flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="font-bold font-serif text-sm">AI Picks</h3>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-[#ACFCD9]/20 to-[#EFCA08]/10 rounded-lg border border-[#ACFCD9]/30 space-y-2.5">
                        <div className="flex items-start gap-2"><Lightbulb className="h-3.5 w-3.5 text-[#EFCA08] mt-0.5 shrink-0" /><p className="text-xs">Try advanced phonics for Emma</p></div>
                        <div className="flex items-start gap-2"><Lightbulb className="h-3.5 w-3.5 text-[#55D6BE] mt-0.5 shrink-0" /><p className="text-xs">Group activity for social skills</p></div>
                        <div className="flex items-start gap-2"><Lightbulb className="h-3.5 w-3.5 text-[#F46197] mt-0.5 shrink-0" /><p className="text-xs">Schedule parent check-in for Liam</p></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 3 — Features ===== */}
        <section
          className="w-screen h-screen flex-shrink-0 flex items-center justify-center relative px-8 pt-14"
          style={{ background: 'linear-gradient(180deg, #fff 0%, #FFFDE7 50%, #fff 100%)' }}
        >
          <FloatingIcon icon={Sparkles} className="w-8 h-8 text-[#EFCA08]/15 top-20 right-12 animate-float-slow" />
          <FloatingIcon icon={Star} className="w-7 h-7 text-[#55D6BE]/15 bottom-14 left-12 animate-float" />
          {/* Mascot — magnifying glass */}
          <img src="/mascot/magnifying_1.png" alt="Mascot with magnifying glass" className="absolute bottom-8 right-[3%] w-36 lg:w-44 drop-shadow-lg animate-float-slow pointer-events-none select-none" />
          <div className="max-w-6xl w-full mx-auto">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-[#55D6BE]/15 text-[#55D6BE] border-[#55D6BE]/30 rounded-full px-4 py-1">
                <Puzzle className="mr-1.5 h-3 w-3" />
                Comprehensive Features
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 font-serif">Everything You Need in One Place</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                8 powerful modules to support teachers, engage parents, and nurture every child
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className={`border-2 ${feature.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl group`}>
                    <CardHeader className="p-5">
                      <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-base font-serif">{feature.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== SLIDE 4 — Benefits ===== */}
        <section
          className="w-screen h-screen flex-shrink-0 flex items-center justify-center relative px-8 pt-14"
          style={{ background: 'linear-gradient(135deg, rgba(172,252,217,0.15) 0%, #FFF5F9 50%, rgba(255,253,231,0.3) 100%)' }}
        >
          <FloatingIcon icon={Award} className="w-10 h-10 text-[#EFCA08]/12 top-20 left-12 animate-float" />
          <FloatingIcon icon={Heart} className="w-8 h-8 text-[#F46197]/12 bottom-14 right-12 animate-float-slow" />
          {/* Mascot — thumbs up */}
          <img src="/mascot/thumbs_up_1.png" alt="Mascot thumbs up" className="absolute top-20 right-[4%] w-32 lg:w-40 drop-shadow-lg animate-float pointer-events-none select-none" />
          <div className="max-w-6xl w-full mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Teachers */}
              <Card className="border-2 border-[#55D6BE]/30 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-[#55D6BE] to-[#ACFCD9] text-white py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl font-serif">For Teachers</CardTitle>
                      <CardDescription className="text-white/90 text-sm">Save time, increase impact</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                  {[
                    { icon: Sparkles, title: 'AI-Powered Lesson Planning', desc: 'Generate comprehensive plans in minutes' },
                    { icon: FileText, title: 'Automated Progress Reports', desc: 'Reduce reporting time by 80%' },
                    { icon: Bell, title: 'Early Intervention Alerts', desc: 'Identify students needing support instantly' },
                    { icon: Monitor, title: 'Classroom Teaching Mode', desc: 'Manage whole-class activities seamlessly' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#55D6BE]/5 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-[#55D6BE]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="h-3.5 w-3.5 text-[#55D6BE]" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {/* Parents */}
              <Card className="border-2 border-[#F46197]/30 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-[#F46197] to-[#EFCA08] text-white py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl font-serif">For Parents</CardTitle>
                      <CardDescription className="text-white/90 text-sm">Stay connected, stay informed</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                  {[
                    { icon: Smartphone, title: 'Real-Time Progress Updates', desc: "See your child's daily achievements" },
                    { icon: MessageSquare, title: 'Direct Teacher Communication', desc: 'Message teachers anytime, anywhere' },
                    { icon: Brain, title: 'Developmental Insights', desc: "Understand your child's learning journey" },
                    { icon: Home, title: 'Activity Suggestions', desc: 'Get personalized at-home learning tips' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F46197]/5 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-[#F46197]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="h-3.5 w-3.5 text-[#F46197]" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 5 — Testimonials ===== */}
        <section
          className="w-screen h-screen flex-shrink-0 flex items-center justify-center relative px-8 pt-14"
          style={{ background: 'linear-gradient(180deg, #fff 0%, #FFF5F9 100%)' }}
        >
          <FloatingIcon icon={MessageSquare} className="w-7 h-7 text-[#F46197]/12 top-20 left-[20%] animate-float" />
          <FloatingIcon icon={Heart} className="w-6 h-6 text-[#55D6BE]/12 bottom-14 right-[20%] animate-float-slow" />
          {/* Mascot — cheering */}
          <img src="/mascot/cheer_1.png" alt="Mascot cheering" className="absolute bottom-10 left-[4%] w-32 lg:w-40 drop-shadow-lg animate-float-slow pointer-events-none select-none" />
          <div className="max-w-5xl w-full mx-auto">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-[#F46197]/15 text-[#F46197] border-[#F46197]/30 rounded-full px-4 py-1">
                <Heart className="mr-1.5 h-3 w-3" />
                Testimonials
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 font-serif">Loved by Educators & Parents</h2>
              <p className="text-lg text-muted-foreground">See what our community has to say</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <Card key={i} className="border-2 border-[#EFCA08]/30 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                  <CardContent className="pt-6">
                    <div className="flex mb-3">
                      {[...Array(t.rating)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-[#EFCA08] text-[#EFCA08]" />
                      ))}
                    </div>
                    <p className="text-sm mb-5 italic leading-relaxed text-muted-foreground">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#ACFCD9] transition-transform duration-300 group-hover:scale-110" />
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SLIDE 6 — CTA + Footer ===== */}
        <section className="w-screen h-screen flex-shrink-0 flex flex-col pt-14">
          {/* CTA — takes most of the space */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden px-8"
            style={{ background: 'linear-gradient(135deg, #F46197 0%, #EFCA08 50%, #55D6BE 100%)' }}
          >
            <FloatingIcon icon={GraduationCap} className="w-14 h-14 text-white/10 top-8 left-8 animate-float" />
            <FloatingIcon icon={Star} className="w-10 h-10 text-white/10 top-12 right-16 animate-float-slow" />
            <FloatingIcon icon={BookOpen} className="w-12 h-12 text-white/[0.08] bottom-8 left-16 animate-wiggle" />
            <FloatingIcon icon={Sparkles} className="w-10 h-10 text-white/10 bottom-12 right-8 animate-float" />
            {/* Mascot — holding book */}
            <img src="/mascot/holding_book_1.png" alt="Mascot holding book" className="absolute bottom-4 left-[5%] w-36 lg:w-48 drop-shadow-2xl animate-float pointer-events-none select-none opacity-90" />

            <div className="max-w-3xl mx-auto text-center space-y-5 relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-white font-serif">Ready to Transform Your Classroom?</h2>
              <p className="text-lg text-white/90 max-w-xl mx-auto">
                Join thousands of educators using AI to provide personalized learning experiences
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-3">
                <Button size="lg" className="bg-white text-[#F46197] hover:bg-white/90 rounded-full px-10 text-lg h-14 font-bold transition-transform hover:scale-105 shadow-lg" onClick={() => navigate('/register')}>
                  Start Free Trial
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="bg-white/15 border-2 border-white text-white hover:bg-white/25 rounded-full px-10 text-lg h-14 font-bold transition-transform hover:scale-105" onClick={() => navigate('/login')}>
                  Schedule a Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-white/80 pt-2 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> No credit card</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> 14-day trial</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Cancel anytime</span>
              </p>
            </div>
          </div>
          {/* Compact footer */}
          <footer className="bg-white border-t-2 border-[#ACFCD9] px-8 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-gradient-to-br from-[#F46197] to-[#EFCA08] rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm font-serif">KinderLearn AI</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <a href="#" className="hover:text-[#F46197] transition-colors">Features</a>
                <a href="#" className="hover:text-[#F46197] transition-colors">Pricing</a>
                <a href="#" className="hover:text-[#55D6BE] transition-colors">About</a>
                <a href="#" className="hover:text-[#55D6BE] transition-colors">Contact</a>
                <a href="#" className="hover:text-[#EFCA08] transition-colors">Privacy</a>
                <a href="#" className="hover:text-[#EFCA08] transition-colors">Terms</a>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                &copy; 2026 KinderLearn AI &middot; Made with <Heart className="h-3 w-3 text-[#F46197] fill-[#F46197]" /> for little learners
              </p>
            </div>
          </footer>
        </section>
      </div>

      {/* ===== Fixed navigation controls ===== */}

      {/* Left arrow */}
      {current > 0 && (
        <button
          onClick={prev}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/90 border-2 border-[#E3E3E3] shadow-lg flex items-center justify-center hover:bg-[#ACFCD9]/20 hover:border-[#55D6BE] transition-all duration-200 hover:scale-110 group"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-muted-foreground group-hover:text-[#55D6BE] transition-colors" />
        </button>
      )}

      {/* Right arrow */}
      {current < TOTAL_SLIDES - 1 && (
        <button
          onClick={next}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/90 border-2 border-[#E3E3E3] shadow-lg flex items-center justify-center hover:bg-[#F46197]/10 hover:border-[#F46197] transition-all duration-200 hover:scale-110 group"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-[#F46197] transition-colors" />
        </button>
      )}

      {/* Dot indicators — shift up on last slide so they don't overlap footer */}
      <div className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-[#E3E3E3] shadow-md transition-all duration-500 ${current === TOTAL_SLIDES - 1 ? 'bottom-16' : 'bottom-5'}`}>
        {slideLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="group relative flex items-center"
            aria-label={`Go to ${label}`}
          >
            <div className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-8 h-3 bg-gradient-to-r from-[#F46197] to-[#55D6BE]'
                : 'w-3 h-3 bg-[#E3E3E3] hover:bg-[#ACFCD9]'
            }`} />
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-foreground text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Slide counter */}
      <div className={`fixed right-6 z-50 text-xs text-muted-foreground font-medium bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#E3E3E3] shadow-sm transition-all duration-500 ${current === TOTAL_SLIDES - 1 ? 'bottom-16' : 'bottom-5'}`}>
        {current + 1} / {TOTAL_SLIDES}
      </div>
    </div>
  );
}
