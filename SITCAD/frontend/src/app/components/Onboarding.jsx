import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, GraduationCap, Users } from 'lucide-react';
import { motion } from 'motion/react';

export function Onboarding() {
  const [role, setRole] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, updateRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) return setError('Please select your role.');
    if (!acceptTerms) return setError('Please accept the terms and conditions.');

    setLoading(true);
    setError('');

    try {
      await updateRole(role);
      navigate(role === 'teacher' ? '/teacher/dashboard' : '/parent/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8 md:p-12"
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
          <p className="text-muted-foreground mt-2 text-sm">Just one more step — tell us who you are.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">I am a:</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  role === 'teacher'
                    ? 'border-[#3090A0] bg-[#3090A0]/10 text-[#3090A0]'
                    : 'border-border hover:border-[#3090A0]/50'
                }`}
              >
                <GraduationCap className="w-7 h-7" />
                <span className="font-semibold text-sm">Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  role === 'parent'
                    ? 'border-[#3090A0] bg-[#3090A0]/10 text-[#3090A0]'
                    : 'border-border hover:border-[#3090A0]/50'
                }`}
              >
                <Users className="w-7 h-7" />
                <span className="font-semibold text-sm">Parent</span>
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked)}
              className="mt-0.5 data-[state=checked]:bg-[#3090A0] data-[state=checked]:border-[#3090A0] flex-shrink-0"
            />
            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground font-normal cursor-pointer leading-snug"
            >
              I accept the{" "}
              <a href="#" className="text-[#3090A0] hover:underline font-medium">terms of the agreement</a>
              {" "}and the{" "}
              <a href="#" className="text-[#3090A0] hover:underline font-medium">Privacy Policy</a>.
            </label>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold bg-[#3090A0] hover:bg-[#2FBFA5] text-white rounded-lg shadow-lg transition-all cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up your account...
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
