import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  GraduationCap,
  Sparkles,
  Brain,
  TrendingUp,
  MessageSquare,
  Calendar,
  Users,
  Award,
  FileText,
  Monitor,
  Heart,
  CheckCircle2,
  Star,
  BookOpen,
  Lightbulb,
  Palette,
  Music,
  Puzzle,
  Zap,
  ArrowRight,
  ArrowLeft,
  Play,
  Shield,
  Bell,
  Smartphone,
  Home,
  ChevronLeft,
  ChevronRight,
  Pause,
} from "lucide-react";

/* Floating icon decoration */
function FloatingIcon({
  icon: Icon,
  className,
}: {
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <Icon className="w-full h-full" />
    </div>
  );
}

const TOTAL_SLIDES = 5;

const slideLabels = ["Home", "Preview", "Features", "Benefits", "Join"];

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
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Swipe / wheel support
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (timeout) return;
      timeout = setTimeout(() => {
        timeout = null;
      }, 600);
      if (e.deltaY > 30 || e.deltaX > 30) next();
      else if (e.deltaY < -30 || e.deltaX < -30) prev();
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, [next, prev]);

  const [isPaused, setIsPaused] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev === TOTAL_SLIDES - 1 ? 0 : prev + 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const features = [
    {
      icon: Users,
      title: "User Management",
      description: "Secure role-based access for teachers and parents",
      color: "bg-[#F46197]/15 text-[#F46197]",
      border: "border-[#F46197]/30",
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Visual progress monitoring and student profiles",
      color: "bg-[#55D6BE]/15 text-[#55D6BE]",
      border: "border-[#55D6BE]/30",
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Identify learning patterns and intervention insights",
      color: "bg-[#EFCA08]/15 text-[#EFCA08]",
      border: "border-[#EFCA08]/30",
    },
    {
      icon: Calendar,
      title: "Activities",
      description: "Create and assign personalized learning activities",
      color: "bg-[#F46197]/15 text-[#F46197]",
      border: "border-[#F46197]/30",
    },
    {
      icon: Sparkles,
      title: "Lesson Planning",
      description: "AI-generated comprehensive lesson plans",
      color: "bg-[#F46197]/15 text-[#F46197]",
      border: "border-[#F46197]/30",
    },
    {
      icon: FileText,
      title: "Reports",
      description: "Automated report generation for parents",
      color: "bg-[#55D6BE]/15 text-[#55D6BE]",
      border: "border-[#55D6BE]/30",
    },
    {
      icon: MessageSquare,
      title: "Communication",
      description: "Seamless messaging between teachers and parents",
      color: "bg-[#EFCA08]/15 text-[#EFCA08]",
      border: "border-[#EFCA08]/30",
    },
    {
      icon: Monitor,
      title: "Classroom Mode",
      description: "Whole-class teaching tools for live instruction",
      color: "bg-[#F46197]/15 text-[#F46197]",
      border: "border-[#F46197]/30",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Kindergarten Teacher",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      text: "This system has transformed how I track student progress. The AI insights help me identify learning gaps early!",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Parent",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      text: "I love being able to see my child's daily progress and communicate easily with the teacher. It's amazing!",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "School Administrator",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
      text: "The automated reporting saves our teachers hours each week. The AI recommendations are incredibly accurate.",
      rating: 5,
    },
  ];

  return (
    <div
      className={`h-screen w-screen overflow-hidden relative bg-white ${
        !isPlaying ? "cursor-pointer" : "cursor-default"
      }`}
    >
      {!isPlaying && (
        <div className="fixed top-20 right-6 bg-none/90 backdrop-blur-md px-4 py-2 rounded-full text-sm shadow-lg z-50 flex items-center gap-2 animate-fade-in">
          <span className="font-medium text-gray-700">Autoplay Paused</span>
        </div>
      )}

      {/* Fixed top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-[100vw] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo/logo.png"
              alt="Sabah Sprout Logo"
              className="w-14 h-14 object-contain"
            />
            <span
              className="font-bold text-xl font-serif tracking-wide
                 bg-gradient-to-r 
                 from-[#2FBFA5] 
                 to-[#1E3A8A] 
                 bg-clip-text 
                 text-transparent"
            >
              SabahSprout
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="lg"
              className="text-[#F46197] hover:bg-[#F4F4F4F4]/10 px-5 
             h-10 
             text-xl 
             font-semibold
             shadow-lg 
             hover:scale-105 
             transition-all duration-300 bg-white"
              onClick={() => navigate("/login")}
            >
              Log In
            </Button>
            <Button
              size="lg"
              className="bg-[#F46197] hover:bg-[#e0507f] 
             text-white 
             rounded-full 
             px-5 
             h-10 
             text-xl 
             font-semibold
             shadow-lg 
             hover:scale-105 
             transition-all duration-300"
              onClick={() => navigate("/register")}
            >
              Get Started
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Slide track */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{
          width: `${TOTAL_SLIDES * 100}vw`,
          transform: `translateX(-${current * 100}vw)`,
        }}
      >
        {/* ===== SLIDE 1 — Hero ===== */}
        <section
          className="w-screen h-screen flex-shrink-0 flex items-center justify-center relative px-8 pt-14"
          style={{
            background:
              "linear-gradient(160deg, #ACFCD9 0%, #ffffff 35%, #FFF5F9 65%, #FFFDE7 100%)",
          }}
        >
          <FloatingIcon
            icon={BookOpen}
            className="w-10 h-10 text-[#F46197]/20 top-20 left-[8%] animate-float"
          />
          <FloatingIcon
            icon={Lightbulb}
            className="w-8 h-8 text-[#EFCA08]/25 top-24 right-[12%] animate-float-slow"
          />
          <FloatingIcon
            icon={Palette}
            className="w-12 h-12 text-[#55D6BE]/15 bottom-20 left-[5%] animate-float"
          />
          <FloatingIcon
            icon={Music}
            className="w-9 h-9 text-[#F46197]/15 bottom-28 right-[8%] animate-float-slow"
          />
          <FloatingIcon
            icon={Puzzle}
            className="w-8 h-8 text-[#EFCA08]/20 top-1/2 left-[3%] animate-wiggle"
          />
          <FloatingIcon
            icon={Star}
            className="w-7 h-7 text-[#55D6BE]/20 top-32 right-[30%] animate-float"
          />

          {/* Mascot — waving */}
          <img
            src="/mascot/waving_hand_1.png"
            alt="Mascot waving"
            className="absolute bottom-12 right-[6%] w-48 lg:w-64 drop-shadow-xl animate-float-slow pointer-events-none select-none"
          />

          <div className="text-center max-w-3xl mx-auto space-y-7 animate-fade-in-up">
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] font-serif tracking-tight">
              Where{" "}
              <span className="text-[#F46197] relative">
                Learning
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <path
                    d="M2 8c40-6 80-6 196-2"
                    stroke="#F46197"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.4"
                  />
                </svg>
              </span>{" "}
              Meets <span className="text-[#55D6BE]">Fun</span>
            </h1>
            <p className="text-lg lg:text-2xl font-bold text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Empower teachers with intelligent insights and connect parents to
              their child's learning journey. Personalized support for every
              young learner.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-1"></div>
          </div>
        </section>

        {/* ===== SLIDE 2 — Preview + Stats ===== */}
        <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center relative px-8 pt-14 bg-white">
          {/* Mascot — clipboard */}
          <img
            src="/mascot/clipboard_1.png"
            alt="Mascot with clipboard"
            className="absolute bottom-10 left-[4%] w-36 lg:w-44 drop-shadow-lg animate-float pointer-events-none select-none"
          />
          <div className="max-w-4xl w-full mx-auto space-y-4">
            <div className="mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold mb-3 font-serif">
                Smart Classroom Dashboard
              </h2>

              <p className="text-muted-foreground text-2xl font-medium">
                Track progress, plan lessons, and receive AI-powered
                recommendations in one place.
              </p>
            </div>

            {/* Dashboard preview */}
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-br from-[#F46197]/15 via-[#EFCA08]/10 to-[#55D6BE]/15 rounded-3xl blur-2xl"></div>

              <Card className="relative border-2 border-[#ACFCD9]/50 shadow-2xl rounded-2xl overflow-hidden min-h-[340px]">
                <div className="h-2 bg-gradient-to-r from-[#F46197] via-[#EFCA08] to-[#55D6BE]"></div>

                <CardContent className="p-4 lg:p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* AI Insights */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#F46197] to-[#EFCA08] rounded-xl flex items-center justify-center">
                          <Brain className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="font-bold font-serif text-xl">
                          AI Insights
                        </h3>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-[#55D6BE]/10 rounded-lg border border-[#55D6BE]/20">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-8 w-8 text-[#55D6BE]" />
                            <span className="text-lg font-medium">
                              Literacy
                            </span>
                          </div>
                          <Badge className="bg-[#55D6BE] text-white rounded-full text-base px-4 py-0.5">
                            85%
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-[#EFCA08]/10 rounded-lg border border-[#EFCA08]/20">
                          <div className="flex items-center gap-2">
                            <Users className="h-8 w-8 text-[#EFCA08]" />
                            <span className="text-lg font-medium">Social</span>
                          </div>
                          <Badge className="bg-[#EFCA08] text-white rounded-full text-base px-4 py-0.5">
                            92%
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-[#F46197]/10 rounded-lg border border-[#F46197]/20">
                          <div className="flex items-center gap-2">
                            <Puzzle className="h-8 w-8 text-[#F46197]" />
                            <span className="text-lg font-medium">
                              Cognitive
                            </span>
                          </div>
                          <Badge className="bg-[#F46197] text-white rounded-full text-base px-4 py-0.5">
                            78%
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Today's Plan */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#55D6BE] to-[#ACFCD9] rounded-xl flex items-center justify-center">
                          <Calendar className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="font-bold font-serif text-xl">
                          Today's Plan
                        </h3>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2 bg-[#ACFCD9]/40 rounded-lg border border-[#ACFCD9]/40">
                          <div className="w-3 h-3 rounded-full bg-[#55D6BE]"></div>
                          <span className="text-lg">Story Time — 9:00 AM</span>
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-[#EFCA08]/20 rounded-lg border border-[#EFCA08]/40">
                          <div className="w-3 h-3 rounded-full bg-[#EFCA08]"></div>
                          <span className="text-lg">
                            Art & Craft — 10:30 AM
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-[#F46197]/20 rounded-lg border border-[#F46197]/40">
                          <div className="w-3 h-3 rounded-full bg-[#F46197]"></div>
                          <span className="text-lg">
                            Phonics Game — 1:00 PM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Picks */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#EFCA08] to-[#F46197] rounded-xl flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="font-bold font-serif text-xl">
                          AI Picks
                        </h3>
                      </div>

                      <div className="p-3 bg-gradient-to-br from-[#ACFCD9]/20 to-[#EFCA08]/30 rounded-lg border border-[#ACFCD9]/40 space-y-2">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-6 w-6 text-[#EFCA08] mt-0.5 shrink-0" />
                          <p className="text-base">
                            Try advanced phonics for Emma
                          </p>
                        </div>

                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-6 w-6 text-[#55D6BE] mt-0.5 shrink-0" />
                          <p className="text-base">
                            Group activity for social skills
                          </p>
                        </div>

                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-6 w-6 text-[#F46197] mt-0.5 shrink-0" />
                          <p className="text-base">
                            Schedule parent check-in for Liam
                          </p>
                        </div>
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
          style={{
            background:
              "linear-gradient(180deg, #fff 0%, #FFFDE7 50%, #fff 100%)",
          }}
        >
          <FloatingIcon
            icon={Sparkles}
            className="w-8 h-8 text-[#EFCA08]/15 top-20 right-12 animate-float-slow"
          />
          <FloatingIcon
            icon={Star}
            className="w-7 h-7 text-[#55D6BE]/15 bottom-14 left-12 animate-float"
          />

          <div className="max-w-6xl w-full mx-auto">
            <div className="text-center mb-10 relative">
              {/* Title Row */}
              <div className="relative inline-flex items-center justify-center">
                {/* Mascot floating on left */}
                <img
                  src="/mascot/magnifying_1.png"
                  alt="Mascot with magnifying glass"
                  className="absolute -left-28 lg:-left-36 w-20 lg:w-28 
                 drop-shadow-lg animate-float-slow 
                 pointer-events-none select-none"
                />

                <h2 className="text-4xl lg:text-4xl font-bold mb-3 font-serif">
                  Everything You Need in One Place
                </h2>
              </div>

              <p className="text-2xl text-muted-foreground max-w-xl mx-auto font-medium">
                8 powerful modules to support teachers, engage parents, and
                nurture every child
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className={`border-2 ${feature.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl group`}
                  >
                    <CardHeader className="p-6 space-y-3">
                      {/* Icon + Title Row */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                        >
                          <Icon className="h-7 w-7" />
                        </div>

                        <CardTitle className="text-lg font-serif">
                          {feature.title}
                        </CardTitle>
                      </div>

                      {/* Description */}
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
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
          style={{
            background:
              "linear-gradient(135deg, rgba(172,252,217,0.15) 0%, #FFF5F9 50%, rgba(255,253,231,0.3) 100%)",
          }}
        >
          <FloatingIcon
            icon={Award}
            className="w-10 h-10 text-[#EFCA08]/12 top-20 left-12 animate-float"
          />
          <FloatingIcon
            icon={Heart}
            className="w-8 h-8 text-[#F46197]/12 bottom-14 right-12 animate-float-slow"
          />

          {/* Mascot — thumbs up */}
          <img
            src="/mascot/thumbs_up_1.png"
            alt="Mascot thumbs up"
            className="absolute top-40 right-[8%] w-32 lg:w-40 drop-shadow-lg animate-float pointer-events-none select-none"
          />
          <div className="max-w-4xl w-full mx-auto">
            {/* ===== Section Header ===== */}
            <div className="text-center mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold font-serif mb-3 leading-tight">
                Teaching Smarter. Parenting Informed.
              </h2>

              <p className="mt-4 text-muted-foreground text-2xl font-medium leading-relaxed">
                Insightful data, real-time updates, meaningful impact.
              </p>
            </div>

            {/* ===== Cards Grid ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ================= TEACHERS ================= */}
              <Card className="border-2 border-[#55D6BE]/30 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-[#34cdb1] to-[#8aebc1] text-white py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl font-serif leading-tight">
                        For Teachers
                      </CardTitle>
                      <CardDescription className="text-white/90 text-lg leading-snug">
                        Save time, increase impact
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-1 space-y-2">
                  {[
                    {
                      icon: Sparkles,
                      title: "AI-Powered Lesson Planning",
                      desc: "Generate comprehensive plans in minutes",
                    },
                    {
                      icon: FileText,
                      title: "Automated Progress Reports",
                      desc: "Reduce reporting time by 80%",
                    },
                    {
                      icon: Bell,
                      title: "Early Intervention Alerts",
                      desc: "Identify students needing support instantly",
                    },
                    {
                      icon: Monitor,
                      title: "Classroom Teaching Mode",
                      desc: "Manage whole-class activities seamlessly",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#55D6BE]/5 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#55D6BE]/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-6 w-6 text-[#55D6BE]" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg leading-tight">
                          {item.title}
                        </p>
                        <p className="text-base text-muted-foreground leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* ================= PARENTS ================= */}
              <Card className="border-2 border-[#F46197]/30 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-[#F46197] to-[#EFCA08] text-white py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <Heart className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl font-serif leading-tight">
                        For Parents
                      </CardTitle>
                      <CardDescription className="text-white/90 text-lg leading-snug">
                        Stay connected, stay informed
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-1 space-y-2">
                  {[
                    {
                      icon: Smartphone,
                      title: "Real-Time Progress Updates",
                      desc: "See your child's daily achievements",
                    },
                    {
                      icon: MessageSquare,
                      title: "Direct Teacher Communication",
                      desc: "Message teachers anytime, anywhere",
                    },
                    {
                      icon: Brain,
                      title: "Developmental Insights",
                      desc: "Understand your child's learning journey",
                    },
                    {
                      icon: Home,
                      title: "Activity Suggestions",
                      desc: "Get personalized at-home learning tips",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#F46197]/5 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#F46197]/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-6 w-6 text-[#F46197]" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg leading-tight">
                          {item.title}
                        </p>
                        <p className="text-base text-muted-foreground leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 5 — CTA + Footer ===== */}
        <section className="w-screen h-screen flex-shrink-0 flex flex-col ">
          {/* CTA — takes most of the space */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden px-10"
            style={{
              background:
                "radial-gradient(circle at center, #F46197 0%, #F89CBC 70%, transparent 100%)",
            }}
          >
            <FloatingIcon
              icon={GraduationCap}
              className="w-14 h-14 text-white/10 top-8 left-8 animate-float"
            />
            <FloatingIcon
              icon={Star}
              className="w-10 h-10 text-white/10 top-12 right-16 animate-float-slow"
            />
            <FloatingIcon
              icon={BookOpen}
              className="w-12 h-12 text-white/[0.08] bottom-8 left-16 animate-wiggle"
            />
            <FloatingIcon
              icon={Sparkles}
              className="w-10 h-10 text-white/10 bottom-12 right-8 animate-float"
            />
            <div className="flex flex-col items-center justify-center text-center space-y-8 relative z-10">
              {/* Text */}
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-6xl font-bold text-white font-serif">
                  Ready to Transform Your Classroom?
                </h2>

                <p className="text-2xl text-white/90 font-medium text-center">
                  Hello Parents and Educators! Join us on Sabah Sprout
                  experience the personalized learning powered by AI.
                </p>
              </div>

              {/* Mascot Centered */}
              <img
                src="/mascot/holding_book_1.png"
                alt="Mascot holding book"
                className="w-48 lg:w-60 drop-shadow-2xl animate-float opacity-95"
              />
            </div>
          </div>
          {/* Compact footer */}
          <footer className="bg-white border-t-2 border-[#ACFCD9] px-8 py-4">
            <div className="max-w-7xl mx-auto relative flex items-center justify-end">
              {/* Centered Links */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6 text-base text-muted-foreground">
                <a href="#" className="hover:text-[#55D6BE] transition-colors">
                  About
                </a>
                <a href="#" className="hover:text-[#55D6BE] transition-colors">
                  Contact
                </a>
                <a href="#" className="hover:text-[#EFCA08] transition-colors">
                  Privacy
                </a>
                <a href="#" className="hover:text-[#EFCA08] transition-colors">
                  Terms
                </a>
              </div>

              {/* Right Copyright */}
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                &copy; 2026 Sabah Sprout · Made with
                <Heart className="h-3 w-3 text-[#F46197] fill-[#F46197]" />
                for Sabahan
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
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-[#E3E3E3] shadow-md transition-all duration-500 ${current === TOTAL_SLIDES - 1 ? "bottom-16" : "bottom-5"}`}
      >
        {slideLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="group relative flex items-center"
            aria-label={`Go to ${label}`}
          >
            <div
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-8 h-3 bg-gradient-to-r from-[#F46197] to-[#55D6BE]"
                  : "w-3 h-3 bg-[#E3E3E3] hover:bg-[#ACFCD9]"
              }`}
            />
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-foreground text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Slide counter */}
      <div className="fixed right-6 bottom-15 z-40 flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-[#E3E3E3] shadow-sm">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="hover:scale-110 transition-transform"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-[#F46197]" />
          ) : (
            <Play className="h-4 w-4 text-[#55D6BE]" />
          )}
        </button>

        <span className="text-xs text-muted-foreground font-medium">
          {current + 1} / {TOTAL_SLIDES}
        </span>
      </div>
    </div>
  );
}
