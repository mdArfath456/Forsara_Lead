import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { LoadingState } from '../components/StatusStates';

export function RequireAuth({ children }) {
  const { status } = useAuth();

  if (status === 'checking') return <LoadingState label="Checking session…" />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return children;
}
