import { useAuth } from '@clerk/expo';
import { Redirect, Slot } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <>
      <AnimatedSplashOverlay />
      <Slot />
    </>
  );
}
