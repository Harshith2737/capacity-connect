import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import RolePortal, { LoginPage } from "./pages/RoutePortal";

function Router() {
  return <Switch>
    <Route path="/" component={Landing} />
    <Route path="/login" component={LoginPage} />
    <Route path="/trainee" component={() => <RolePortal role="trainee" />} />
    <Route path="/trainee/competencies" component={() => <RolePortal role="trainee" view="passport" />} />
    <Route path="/trainee/courses" component={() => <RolePortal role="trainee" view="learning" />} />
    <Route path="/trainee/courses/:id" component={() => <RolePortal role="trainee" view="learning" />} />
    <Route path="/trainee/assessments" component={() => <RolePortal role="trainee" view="assessments" />} />
    <Route path="/trainee/assessments/:id" component={() => <RolePortal role="trainee" view="assessments" />} />
    <Route path="/trainee/assessments/:id/result" component={() => <RolePortal role="trainee" view="assessments" />} />
    <Route path="/trainee/evidence" component={() => <RolePortal role="trainee" view="evidence" />} />
    <Route path="/trainee/certificates" component={() => <RolePortal role="trainee" view="passport" />} />
    <Route path="/trainer" component={() => <RolePortal role="trainer" />} />
    <Route path="/trainer/learners" component={() => <RolePortal role="trainer" view="passport" />} />
    <Route path="/trainer/courses" component={() => <RolePortal role="trainer" view="learning" />} />
    <Route path="/trainer/assessments" component={() => <RolePortal role="trainer" view="assessments" />} />
    <Route path="/trainer/evidence" component={() => <RolePortal role="trainer" view="evidence" />} />
    <Route path="/trainer/expertise" component={() => <RolePortal role="trainer" view="map" />} />
    <Route path="/admin" component={() => <RolePortal role="admin" view="map" />} />
    <Route path="/admin/users" component={() => <RolePortal role="admin" view="map" />} />
    <Route path="/admin/competencies" component={() => <RolePortal role="admin" view="passport" />} />
    <Route path="/admin/courses" component={() => <RolePortal role="admin" view="learning" />} />
    <Route path="/admin/trainer-verification" component={() => <RolePortal role="admin" view="evidence" />} />
    <Route path="/admin/analytics" component={() => <RolePortal role="admin" view="map" />} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
