import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('teacher'); // Removed type annotation
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignUp = () => {
    // Mock Google OAuth - in production, this would use Supabase Auth
    setError('Google Sign-in would be implemented with Supabase Auth');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptTerms) {
      setError('Please accept the terms of the agreement');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // In a real app with Supabase, this would call supabase.auth.signUp
      const success = await register(email, password, fullName, role);
      if (success) {
        navigate(role === 'teacher' ? '/teacher' : '/parent');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl bg-card rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-border"
      >
        {/* Left Section - Illustration & Branding */}
        <div className="w-full md:w-5/12 bg-[#3090A0] p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-sm font-medium opacity-90 hover:opacity-100 transition-opacity mb-12"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home Page
            </button>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Create account</h1>
              <p className="text-lg opacity-90 max-w-xs">
                Fill in the details below to get started.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-full aspect-square max-w-[280px] mb-8">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1748691661032-97e9ec7c6ff5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraW5kZXJnYXJ0ZW4lMjBpbGx1c3RyYXRpb24lMjBzY2hvb2wlMjBraWRzfGVufDF8fHx8MTc3MjYwMzM4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Kindergarten Illustration"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="text-center space-y-4 w-full">
              <p className="text-sm opacity-90">Already have an account?</p>
              <Button
                variant="outline"
                className="w-full border-white text-white bg-white/10 hover:bg-white hover:text-[#3090A0] transition-all rounded-lg py-6 font-semibold cursor-pointer"
                onClick={() => navigate('/login')}
              >
                Log in
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="w-full md:w-7/12 bg-card p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 px-4 bg-muted/30 border-muted focus:bg-background transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 px-4 bg-muted/30 border-muted focus:bg-background transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 px-4 bg-muted/30 border-muted focus:bg-background transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>I am a:</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={role === 'teacher' ? 'default' : 'outline'}
                    className={`flex-1 h-12 rounded-lg transition-all cursor-pointer ${role === 'teacher' ? 'bg-[#3090A0] hover:bg-[#2FBFA5] text-white shadow-md scale-[1.02]' : 'hover:bg-[#2FBFA5]/10'}`}
                    onClick={() => setRole('teacher')}
                  >
                    Teacher
                  </Button>
                  <Button
                    type="button"
                    variant={role === 'parent' ? 'default' : 'outline'}
                    className={`flex-1 h-12 rounded-lg transition-all cursor-pointer ${role === 'parent' ? 'bg-[#3090A0] hover:bg-[#2FBFA5] text-white shadow-md scale-[1.02]' : 'hover:bg-[#3090A0]/10'}`}
                    onClick={() => setRole('parent')}
                  >
                    Parent
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked)}
                  className="mt-1 data-[state=checked]:bg-[#3090A0] data-[state=checked]:border-[#3090A0]"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground font-normal cursor-pointer leading-tight"
                >
                  I accept the <span className="text-[#3090A0] hover:underline font-medium">terms of the agreement</span> and the <span className="text-[#3090A0] hover:underline font-medium">Privacy Policy</span>.
                </Label>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg font-bold bg-[#3090A0] hover:bg-[#2FBFA5] text-white rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign up'
                )}
              </Button>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-muted hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={handleGoogleSignUp}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
