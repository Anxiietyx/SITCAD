import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register: manualRegister } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await manualRegister(email, password, fullName, 'admin', adminSecret);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin Registration</h1>
          <p className="text-muted-foreground mt-2 text-sm">Create a new administrator account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="admin@example.com"
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
            <Label htmlFor="adminSecret">Admin Secret Key</Label>
            <Input
              id="adminSecret"
              type="password"
              placeholder="Enter the admin secret key"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="h-12 px-4 bg-muted/30 border-muted focus:bg-background transition-colors"
              required
            />
            <p className="text-xs text-muted-foreground">This key is provided by the system administrator.</p>
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
                Creating admin account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back to login
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
