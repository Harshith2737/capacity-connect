import type { ReactNode } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import Home from "./Home";
import { ArrowRight, Loader2, ShieldAlert } from "lucide-react";

type PortalRole = "trainee" | "trainer" | "admin";
type HomeView = "overview" | "passport" | "learning" | "evidence" | "assessments" | "map";

function AccessState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <main className="route-state"><div className="route-state-icon"><ShieldAlert size={22} /></div><div><div className="eyebrow">CAPACITY CONNECT</div><h1>{title}</h1><p>{body}</p>{action}</div></main>;
}

export function LoginPage() {
  const { user, loading } = useAuth();
  if (loading) return <AccessState title="Loading secure workspace" body="Checking your authenticated session." action={<Loader2 className="animate-spin" />} />;
  if (user) return <AccessState title="You are already signed in" body="Choose a workspace route from the command centre." action={<Button onClick={() => window.location.assign("/trainee")}>Open trainee workspace <ArrowRight size={15} /></Button>} />;
  return <AccessState title="Sign in to Capacity Connect" body="Use your configured organization account to access tenant-scoped competency intelligence." action={<Button onClick={() => startLogin()}>Sign in securely <ArrowRight size={15} /></Button>} />;
}

export default function RolePortal({ role, view = "overview" }: { role: PortalRole; view?: HomeView }) {
  const { user, loading } = useAuth();
  const workspace = trpc.workspace.summary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  if (loading || (user && workspace.isLoading)) return <AccessState title="Loading your workspace" body="Resolving identity, organization membership, and role permissions." action={<Loader2 className="animate-spin" />} />;
  if (!user) return <AccessState title="Sign in required" body="This workspace route is protected by server-authoritative authentication." action={<Button onClick={() => startLogin()}>Sign in <ArrowRight size={15} /></Button>} />;
  if (!workspace.data) return <AccessState title="Workspace setup required" body="Your account is authenticated but does not yet have an active organization membership. The platform owner must provision or invite you before protected role pages can load." action={user.role === "admin" ? <Button onClick={() => window.location.assign("/")}>Open provisioning centre <ArrowRight size={15} /></Button> : undefined} />;
  const membershipRole = workspace.data.membership.role as PortalRole;
  const allowed = role === "trainee" || membershipRole === "admin" || membershipRole === role;
  if (!allowed) return <AccessState title="Access denied" body={`This page requires the ${role} organization role. Your trusted membership is ${membershipRole}. URL access cannot bypass server authorization.`} action={<Button onClick={() => window.location.assign("/")}>Return to command centre <ArrowRight size={15} /></Button>} />;
  return <Home initialView={view} initialRole={role === "admin" ? "Admin" : role === "trainer" ? "Trainer" : "Trainee"} />;
}
