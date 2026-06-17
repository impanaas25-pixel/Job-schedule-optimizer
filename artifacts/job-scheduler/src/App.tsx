import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Optimizer from "@/pages/optimizer";
import AuthPortal from "@/pages/AuthPortal";
import WebsiteFeedback from "@/components/WebsiteFeedback";
import SplashScreen from "@/components/SplashScreen";

const queryClient = new QueryClient();

// ── localStorage keys ─────────────────────────────────────
const LS_TOKEN = "sy_auth_token";
const LS_USER  = "sy_auth_user";

// ── Session state shape ───────────────────────────────────
interface AuthUser {
  id: number;
  email: string;
}

function Router({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  return (
    <Switch>
      <Route path="/" component={() => <Optimizer token={token} onLogout={onLogout} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [token,    setToken   ] = useState<string | null>(null);
  const [,         setUser    ] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ── Step 1: Splash screen control ──────────────────────
  // Show splash for exactly 2.5 s, then reveal the auth gate.
  // Only shown on first mount — if a session is already stored
  // in localStorage we skip the splash and go straight through.
  const [showSplash, setShowSplash] = useState(true);

  // ── Rehydrate session from localStorage on mount ────────
  useEffect(() => {
    const savedToken = localStorage.getItem(LS_TOKEN);
    const savedUser  = localStorage.getItem(LS_USER);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_USER);
      }
    }
    setHydrated(true);
  }, []);

  // ── 2.5 s timer to dismiss splash ───────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleAuthenticated = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem(LS_TOKEN, newToken);
    localStorage.setItem(LS_USER, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  // ── Step 3: Sequential mounting flow ───────────────────
  //
  //  showSplash = true  → <SplashScreen />  (slide-up exit via AnimatePresence)
  //  showSplash = false && !token → <AuthPortal />
  //  showSplash = false && token  → <Router />  (full dashboard)
  //
  // We keep the splash in the tree until hydration is complete so
  // the auth state is known before the auth gate mounts.
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* ── Splash overlay (AnimatePresence drives exit animation) ── */}
        <AnimatePresence>
          {showSplash && <SplashScreen key="splash" />}
        </AnimatePresence>

        {/* ── Auth gate + main app (mount after hydration) ── */}
        {!showSplash && hydrated && (
          <>
            {!token ? (
              <AuthPortal onAuthenticated={handleAuthenticated} />
            ) : (
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router token={token} onLogout={handleLogout} />
              </WouterRouter>
            )}
          </>
        )}

        <Toaster />
        {token && <WebsiteFeedback token={token} />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;