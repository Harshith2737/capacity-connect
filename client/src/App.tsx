import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Portal, { PortalRole } from "./pages/Portal";

function PortalRoute({ role }: { role: PortalRole }) {
  return <Portal role={role} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/trainee" component={() => <PortalRoute role="trainee" />} />
      <Route path="/trainee/:rest*" component={() => <PortalRoute role="trainee" />} />

      <Route path="/trainer" component={() => <PortalRoute role="trainer" />} />
      <Route path="/trainer/:rest*" component={() => <PortalRoute role="trainer" />} />

      <Route path="/admin" component={() => <PortalRoute role="admin" />} />
      <Route path="/admin/:rest*" component={() => <PortalRoute role="admin" />} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
