import { useAppContext } from '@/context/AppContext';
import OnboardingPage from './OnboardingPage';
import DashboardPage from './DashboardPage';

const Index = () => {
  const { isOnboarded } = useAppContext();
  return isOnboarded ? <DashboardPage /> : <OnboardingPage />;
};

export default Index;
