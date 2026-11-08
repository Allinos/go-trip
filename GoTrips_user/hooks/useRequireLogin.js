import { useRouter } from 'expo-router';
import useAuthStore from '../store/authStore';
import { confirm } from '../utils/confirm';

/** Returns a guard: run `action` if logged in, otherwise ask to log in (and come back). */
export default function useRequireLogin() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return (action, reason = 'to continue') => {
    if (isAuthenticated) return action();
    confirm('Log in required', `Please log in with your mobile number ${reason}.`, { okText: 'Log in', cancelText: 'Not now' }).then((ok) => ok && router.push('/(auth)/login'));
  };
}
