import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const { login, googleLogin, resetPassword, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Wait for auth to resolve on initial load before deciding where to redirect.
  // Do NOT block when the user has actively initiated a login (loading=true),
  // otherwise the page goes blank mid-flow while AuthContext loading is true.
  if (authLoading && !loading) return null;

  // Redirect if already logged in
  if (user) {
    const redirects = { teacher: '/teacher/dashboard', parent: '/parent/dashboard', admin: '/admin/dashboard' };
    return <Navigate to={redirects[user.role] || '/onboarding'} replace />;
  }

  const roleRedirects = { teacher: '/teacher/dashboard', parent: '/parent/dashboard', admin: '/admin/dashboard' };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // googleLogin() handles Firebase auth + backend sync and returns dbUser
      const dbUser = await googleLogin();
      navigate(roleRedirects[dbUser.role] || '/onboarding');
    } catch (err) {
      console.error(err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSending(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err) {
      const code = err.code;
      if (code === 'auth/user-not-found') {
        setResetError('No account found with this email address.');
      } else if (code === 'auth/invalid-email') {
        setResetError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setResetError('Too many requests. Please try again later.');
      } else {
        setResetError('Failed to send reset email. Please try again.');
      }
    } finally {
      setResetSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const role = await login(email, password);
      navigate(roleRedirects[role] || '/onboarding');
    } catch (err) {
      const code = err.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Incorrect email or password. If you previously signed in with Google, please use "Continue with Google" instead.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later or reset your password.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8"
      style={{ background: 'linear-gradient(160deg, #ACFCD9 0%, #ffffff 65%, #FFF5F9 80%, #FFFDE7 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl bg-card rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-150 border border-border"
      >
        {/* Left Section - Illustration & Branding */}
        <div className="w-full md:w-5/12 bg-[#3090A0] p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-lg md:text-3xl font-medium opacity-90 hover:opacity-100 transition-opacity mb-12 cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 mr-4" />
              Home Page
            </button>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Sign in</h1>
              <p className="text-lg opacity-90 max-w-xs">
                Enter your credentials to access your dashboard.
              </p>
              <br />
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-full aspect-square mb-8">
              <ImageWithFallback
                src="/mascot/holding_book_3.png"
                alt="Kindergarten Learning"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="text-center space-y-4 w-full">
              <p className="text-lg md:text-1xl opacity-90">Don't have an account yet?</p>
              <Button
                variant="outline"
                className="w-full border-white text-white bg-white/10 hover:bg-white hover:text-[#3090A0] transition-all rounded-lg py-6 font-semibold cursor-pointer"
                onClick={() => navigate('/register')}
              >
              <div className="text-lg md:text-1xl">Create Account</div>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="w-full md:w-7/12 bg-card p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {forgotMode ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Reset Password</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                {resetSent ? (
                  <div className="space-y-6">
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Password reset email sent to {resetEmail}. Check your inbox and follow the link to reset your password.
                      </AlertDescription>
                    </Alert>
                    <Button
                      variant="outline"
                      className="w-full h-12 cursor-pointer"
                      onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(''); setResetError(''); }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="name@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="h-12 px-4 bg-muted/30 border-muted focus:bg-background transition-colors"
                        required
                      />
                    </div>

                    {resetError && (
                      <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                        <AlertDescription className="text-sm">{resetError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 text-lg font-bold bg-[#3090A0] hover:bg-[#2FBFA5] text-white rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                      disabled={resetSending}
                    >
                      {resetSending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full cursor-pointer"
                      onClick={() => { setForgotMode(false); setResetError(''); }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </form>
                )}
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-[#3090A0] hover:underline font-medium cursor-pointer"
                    onClick={() => { setForgotMode(true); setResetEmail(email); setResetSent(false); setResetError(''); }}
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 px-4 bg-muted/30 border-muted focus:bg-background transition-colors"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
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
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </Button>
            </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
