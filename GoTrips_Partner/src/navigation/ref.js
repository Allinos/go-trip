import { createNavigationContainerRef } from '@react-navigation/native';

export const navRef = createNavigationContainerRef();
export function navigate(name, params) {
  if (navRef.isReady()) navRef.navigate(name, params);
}
