import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './config/wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import { AnimatePresence } from 'framer-motion';

import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import RecipesPage from "./pages/RecipesPage";
import CreateRecipePage from "./pages/CreateRecipePage";
import DashboardPage from "./pages/DashboardPage";
import MyRecipesPage from "./pages/MyRecipesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="create" element={<CreateRecipePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="my-recipes" element={<MyRecipesPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
