import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../store/authStore';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(
        err.message === 'SESSION_NOT_ESTABLISHED'
          ? 'Login succeeded, but the browser did not keep the session cookie. Restart the backend in development mode and try again.'
          : 'Invalid username or password.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full flex items-center justify-center px-4">
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 p-8 rounded-3xl glass-panel"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Forsara Consultancy</h1>
            <p className="text-sm text-gray-500">Lead Extractor Portal</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            className="glass-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <div className="relative">
            <input
              className="glass-input w-full pr-12"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 text-center">
            {error}
          </motion.p>
        )}

        <button type="submit" disabled={submitting} className="glass-button-primary w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 pt-1">
          <ShieldCheck size={12} />
          Internal access only. Monitored system.
        </div>
      </motion.form>
    </div>
  );
}
