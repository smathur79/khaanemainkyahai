import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import OnboardingPage from './OnboardingPage';
import DashboardPage from './DashboardPage';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { loading: authLoading, householdId } = useAuth();
  const { dataLoading, isOnboarded } = useAppContext();

  if (authLoading || (householdId && dataLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your kitchen...</p>
        </div>
      </div>
    );
  }

  return isOnboarded ? <DashboardPage /> : <OnboardingPage />;
};

export default Index;
