import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index.tsx";
import RecipeLibraryPage from "./pages/RecipeLibraryPage.tsx";
import WeeklyPlannerPage from "./pages/WeeklyPlannerPage.tsx";
import AIGeneratorPage from "./pages/AIGeneratorPage.tsx";
import ShortlistPage from "./pages/ShortlistPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
