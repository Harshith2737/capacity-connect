import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  Network,
  ShieldCheck,
  Target,
  UserRound,
  Users,
} from "lucide-react";

export type PortalRole = "trainee" | "trainer" | "admin";

const roleMeta: Record<PortalRole, { label: string; eyebrow: string; description: string }> = {
  trainee: {
    label: "Trainee",
    eyebrow: "Learner workspace",
    description: "Track your competencies, close priority gaps, complete learning and submit evidence.",
  },
  trainer: {
    label: "Trainer",
    eyebrow: "Trainer workspace",
    description: "Manage learning, assessments, evidence review and verified expertise.",
  },
  admin: {
    label: "Admin",
    eyebrow: "Organization command centre",
    description: "Monitor people, competencies, learning operations and organizational capacity.",
  },
};

const portalLinks: Record<PortalRole, { label: string; href: string; icon: typeof LayoutDashboard }[]> = {
  trainee: [
    { label: "Dashboard", href: "/trainee", icon: LayoutDashboard },
    { label: "Competencies", href: "/trainee/competencies", icon: Target },
    { label: "Learning", href: "/trainee/courses", icon: BookOpen },
    { label: "Assessments", href: "/trainee/assessments", icon: ClipboardCheck },
    { label: "Evidence", href: "/trainee/evidence", icon: FileCheck2 },
    { label: "Certificates", href: "/trainee/certificates", icon: Award },
  ],
  trainer: [
    { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
    { label: "Learners", href: "/trainer/learners", icon: Users },
    { label: "Courses", href: "/trainer/courses", icon: BookOpen },
    { label: "Assessments", href: "/trainer/assessments", icon: ClipboardCheck },
    { label: "Evidence review", href: "/trainer/evidence", icon: FileCheck2 },
    { label: "Expertise", href: "/trainer/expertise", icon: ShieldCheck },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Competencies", href: "/admin/competencies", icon: Target },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Trainer verification", href: "/admin/trainer-verification", icon: ShieldCheck },
    { label: "Analytics", href: "/admin/analytics", icon: Network },
  ],
};

function levelLabel(level: number) {
  return ["Awareness", "Foundation", "Working", "Proficient", "Expert"][Math.min(Math.max(level, 0), 4)];
}

export default function Portal({ role }: { role: PortalRole }) {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const workspace = trpc.workspace.summary.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });

  if (loading || workspace.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Authenticate before accessing the {roleMeta[role].label.toLowerCase()} workspace.</p>
            <Button className="w-full" onClick={() => startLogin()}>Sign in</Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const membershipRole = workspace.data?.membership?.role;
  if (membershipRole !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Workspace access denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This account is not provisioned as a {roleMeta[role].label.toLowerCase()} in an active organization membership.
            </p>
            {membershipRole ? <Badge variant="secondary">Current role: {membershipRole}</Badge> : <Badge variant="outline">No active organization membership</Badge>}
            <div className="flex gap-2">
              <Button asChild><Link href={membershipRole ? `/${membershipRole}` : "/"}>Open available workspace</Link></Button>
              <Button variant="outline" onClick={() => logout()}>Sign out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = roleMeta[role];
  const competencies = workspace.data?.userCompetencies ?? [];
  const courses = workspace.data?.courses ?? [];
  const assessments = workspace.data?.assessments ?? [];
  const evidence = workspace.data?.evidence ?? [];
  const readiness = competencies.length
    ? Math.round(
        (competencies.reduce((sum, row) => sum + Math.min(row.record.validatedLevel, 3), 0) /
          (competencies.length * 3)) *
          100,
      )
    : 0;
  const gaps = competencies.filter(row => row.record.validatedLevel < 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl border flex items-center justify-center shrink-0"><ShieldCheck className="h-5 w-5" /></div>
            <div className="min-w-0">
              <div className="font-semibold tracking-tight truncate">capacity<span className="text-muted-foreground">connect</span></div>
              <div className="text-xs text-muted-foreground truncate">{workspace.data?.organization.name ?? "Organization workspace"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{meta.label}</Badge>
            <Button variant="ghost" size="sm" onClick={() => logout()}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border bg-card p-2">
          <div className="px-3 py-2 mb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{meta.eyebrow}</div>
          <nav className="grid gap-1">
            {portalLinks[role].map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-6 min-w-0">
          <section className="rounded-3xl border bg-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="text-sm text-muted-foreground">{meta.eyebrow}</div>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-1">Welcome back, {user.name || "User"}</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">{meta.description}</p>
              </div>
              <Button asChild><Link href={portalLinks[role][1]?.href ?? `/${role}`}>Continue <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
            </div>
          </section>

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Competencies</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{competencies.length}</div><div className="text-xs text-muted-foreground mt-1">tracked in workspace</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Readiness</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{readiness}%</div><Progress value={readiness} className="mt-2 h-2" /></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Learning</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{courses.length}</div><div className="text-xs text-muted-foreground mt-1">courses in tenant</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Evidence</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{evidence.length}</div><div className="text-xs text-muted-foreground mt-1">recent records</div></CardContent></Card>
          </section>

          {role === "trainee" ? (
            <section className="grid xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" />Priority competency gaps</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {gaps.length === 0 ? <div className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />No open gaps in the current dataset.</div> : gaps.slice(0, 5).map(row => (
                    <div key={row.record.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
                      <div><div className="font-medium">{row.competency.name}</div><div className="text-xs text-muted-foreground">Validated {levelLabel(row.record.validatedLevel)} · target level 3</div></div>
                      <Badge variant={row.record.validatedLevel === 0 ? "destructive" : "secondary"}>Gap {Math.max(0, 3 - row.record.validatedLevel)}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Assessment activity</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {assessments.slice(0, 5).map(item => <div key={item.id} className="rounded-xl border p-3"><div className="font-medium">{item.title}</div><div className="text-xs text-muted-foreground mt-1">{item.assessmentType} · pass mark {item.passMarkPercent}%</div></div>)}
                  {assessments.length === 0 && <div className="text-sm text-muted-foreground">No published assessments are currently available.</div>}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {role === "trainer" ? (
            <section className="grid xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-4 w-4" />Evidence review</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-semibold">{workspace.data?.evidence.filter(item => item.status === "submitted").length ?? 0}</div><p className="text-sm text-muted-foreground mt-1">submitted evidence visible in this tenant-wide queue</p><Button className="mt-4" asChild><Link href="/trainer/evidence">Open review queue</Link></Button></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-4 w-4" />Assessment review</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-semibold">{workspace.data?.assessments.filter(item => item.status === "published").length ?? 0}</div><p className="text-sm text-muted-foreground mt-1">published assessments in the current workspace</p><Button className="mt-4" asChild><Link href="/trainer/assessments">Manage assessments</Link></Button></CardContent>
              </Card>
            </section>
          ) : null}

          {role === "admin" ? (
            <section className="grid xl:grid-cols-3 gap-4">
              <Card><CardHeader><CardTitle>Competency coverage</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{competencies.length ? `${readiness}%` : "—"}</div><p className="text-sm text-muted-foreground mt-1">current user competency baseline</p></CardContent></Card>
              <Card><CardHeader><CardTitle>Evidence pipeline</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{evidence.length}</div><p className="text-sm text-muted-foreground mt-1">evidence records in the summary window</p></CardContent></Card>
              <Card><CardHeader><CardTitle>Learning inventory</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{courses.length}</div><p className="text-sm text-muted-foreground mt-1">courses configured for this tenant</p></CardContent></Card>
            </section>
          ) : null}

          <div className="text-xs text-muted-foreground border-t pt-4">
            Data shown here is tenant-scoped and derived from the current backend workspace summary. Demo/synthetic records must be labeled as such in the seed dataset.
          </div>
        </main>
      </div>
    </div>
  );
}
