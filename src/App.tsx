
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { sellerRoutes } from "./routes/seller.routes";
const queryClient = new QueryClient();

// Base path for the application
const BASE_PATH = import.meta.env.BASE_URL || '/';

// Create the main router with seller routes
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Index />,
    },
    ...sellerRoutes,
    {
      path: "*",
      element: <Navigate to="/" replace />,
    },
  ],
  {
    basename: BASE_PATH,
  }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
