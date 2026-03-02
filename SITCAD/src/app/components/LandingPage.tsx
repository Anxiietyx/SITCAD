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

  const goTo = useCallback((i) => {
    setCurrent(Math.max(0, Math.min(TOTAL_SLIDES - 1, i)));
  }, []);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
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
    let timeout = null;
    const handler = (e) => {
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

  const [isPaused, setIsPaused] = useState(false); // This state is not used in the provided code
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // This state is not used in the provided code
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
             rounded-full
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

                <h2 className="text-4xl lg:text-4xl font-bold mb-3 font-serif