import { useAuth } from '../../context/AuthContext';

/** Map server onboarding step → screen name. */
export function stepScreen(state) {
  switch (state?.nextStep) {
    case 'profile':
      return 'Name';
    case 'category':
      return 'Category';
    case 'details':
      return state.category?.hasDriverProfile ? 'DriverDetails' : 'BusinessDetails';
    case 'documents':
      return 'Documents';
    case 'review':
      return 'Review';
    case 'payment':
      return 'Payment';
    default:
      return null;
  }
}

export const STEP_LABELS = [
  { key: 'profile', label: 'Your name' },
  { key: 'category', label: 'Partner type' },
  { key: 'details', label: 'Your details' },
  { key: 'documents', label: 'Documents' },
  { key: 'review', label: 'Review & submit' },
  { key: 'payment', label: 'Registration fee' },
];

/** Returns steps for the progress bar (payment only when the category has a fee). */
export const progressSteps = (state) => STEP_LABELS.filter((s) => s.key !== 'payment' || state?.steps?.some((x) => x.key === 'payment') || !state?.started);

/** After saving a step: store the new state and jump to the next screen. */
export function useAdvance(navigation) {
  const { setOnboardingState } = useAuth();
  return (state) => {
    setOnboardingState(state);
    if (state?.completed) return; // root navigator swaps to the main app
    const next = stepScreen(state);
    if (next) navigation.reset({ index: 0, routes: [{ name: next }] });
  };
}
