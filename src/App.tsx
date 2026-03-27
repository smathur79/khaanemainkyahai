import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index.tsx";
import RecipeLibraryPage from "./pages/RecipeLibraryPage.tsx";
import WeeklyPlannerPage from "./pages/WeeklyPlannerPage.tsx";
import AIGeneratorPage from "./pages/AIGeneratorPage.tsx";
import ShortlistPage from "./pages/ShortlistPage.tsx";
import CookNowPage from "./pages/CookNowPage.tsx";
import PrepPage from "./pages/PrepPage.tsx";
import HouseholdPage from "./pages/HouseholdPage.tsx";
import MealRequestsPage from "./pages/MealRequestsPage.tsx";
import WeeklyTemplatesPage from "./pages/WeeklyTemplatesPage.tsx";
import RitualsPage from "./pages/RitualsPage.tsx";
import CalendarPlannerPage from "./pages/CalendarPlannerPage.tsx";
import FamilyCalendarPage from "./pages/FamilyCalendarPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/recipes" element={<RecipeLibraryPage />} />
              <Route path="/planner" element={<WeeklyPlannerPage />} />
              <Route path="/generate" element={<AIGeneratorPage />} />
              <Route path="/shortlist" element={<ShortlistPage />} />
              <Route path="/cook-now" element={<CookNowPage />} />
              <Route path="/prep" element={<PrepPage />} />
              <Route path="/calendar-planner" element={<CalendarPlannerPage />} />
              <Route path="/calendar" element={<FamilyCalendarPage />} />
              <Route path="/household" element={<HouseholdPage />} />
              <Route path="/requests" element={<MealRequestsPage />} />
              <Route path="/templates" element={<WeeklyTemplatesPage />} />
              <Route path="/rituals" element={<RitualsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
