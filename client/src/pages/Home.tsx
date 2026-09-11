import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  CloudSun,
  Download,
  FileCheck2,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Library,
  Menu,
  MessageSquareText,
  Network,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Role = "Trainee" | "Trainer" | "Admin";
type View = "overview" | "passport" | "learning" | "evidence" | "assessments" | "map";

type Competency = {
  name: string;
  short: string;
  category: string;
  current: number;
  target: number;
  status: "Critical gap" | "Developing" | "On track";
  evidence: string;
  freshness: string;
};

const seedCompetencies: Competency[] = [
  { name: "Radar Interpretation", short: "Radar", category: "Forecasting", current: 1, target: 3, status: "Critical gap", evidence: "Self-declared", freshness: "Not verified" },
  { name: "Numerical Weather Prediction", short: "NWP", category: "Forecasting", current: 3, target: 4, status: "Developing", evidence: "Assessed", freshness: "18 Jun 2026" },
  { name: "Satellite Interpretation", short: "Satellite", category: "Observation", current: 1, target: 3, status: "Critical gap", evidence: "Self-declared", freshness: "Not verified" },
  { name: "Warning Communication", short: "Communication", category: "Operations", current: 2, target: 3, status: "Developing", evidence: "Trainer verified", freshness: "04 Aug 2026" },
];

const courses = [
  { id: "radar", title: "Radar Fundamentals for Forecasters", type: "Learning path", duration: "4h 20m", level: "Foundation", match: 96, competency: "Radar Interpretation", meta: "3 modules · 1 assessment", accent: "violet" },
  { id: "satellite", title: "Satellite Imagery: From Signal to Story", type: "Course", duration: "3h 10m", level: "Working", match: 91, competency: "Satellite Interpretation", meta: "5 lessons · practical task", accent: "teal" },
  { id: "nwp", title: "NWP Model Guidance in Operations", type: "Course", duration: "2h 45m", level: "Advanced", match: 84, competency: "Numerical Weather Prediction", meta: "4 lessons · MCQ assessment", accent: "amber" },
];

const trainers = [
  { name: "Dr. Meera Iyer", initials: "MI", role: "Senior Radar Scientist", score: 94, level: "Expert · verified", availability: "Available this week", factors: "35% competency fit · 25% domain experience" },
  { name: "Arjun Menon", initials: "AM", role: "Forecast Operations Lead", score: 88, level: "Proficient · verified", availability: "Next slot · 18 Sep", factors: "35% competency fit · 15% assessment quality" },
  { name: "Dr. Kavita Rao", initials: "KR", role: "Satellite Applications", score: 82, level: "Expert · verified", availability: "Available next week", factors: "35% competency fit · 10% delivery quality" },
];

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Command centre", icon: LayoutDashboard },
  { id: "passport", label: "Skill passport", icon: Target },
  { id: "learning", label: "Learning paths", icon: BookOpen },
  { id: "evidence", label: "Evidence review", icon: FileCheck2 },
  { id: "assessments", label: "Assessment gateway", icon: ClipboardCheck },
  { id: "map", label: "Capability map", icon: Network },
];

function LevelDots({ value, target }: { value: number; target: number }) {
  return (
    <div className="level-dots" aria-label={`Level ${value} of ${target}`}>
      {[0, 1, 2, 3, 4].map((level) => <span key={level} className={level <= value ? "active" : ""} />)}
    </div>
  );
}

function SectionHeading({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: string }) {
  return (
    <div className="section-heading">
      <div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{body && <p>{body}</p>}</div>
      {action && <Button variant="ghost" className="text-button" onClick={() => toast.info(`${action} is available in the full workspace.`)}>{action}<ArrowRight size={15} /></Button>}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const liveWorkspace = trpc.workspace.summary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const liveAssessments = trpc.assessmentGateway.listPublished.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const provisionWorkspace = trpc.workspace.provision.useMutation();
  const seedImdCatalog = trpc.workspace.seedOfficialImd.useMutation();
  const startAssessment = trpc.assessmentGateway.startAttempt.useMutation();
  const submitAssessment = trpc.assessmentGateway.submitAttempt.useMutation();
  const reviewAssessment = trpc.assessmentGateway.reviewAttempt.useMutation();
  const uploadEvidence = trpc.evidenceGateway.upload.useMutation();
  const reviewEvidenceItem = trpc.evidenceGateway.review.useMutation();
  const explainRecommendation = trpc.intelligenceGateway.explainRecommendation.useMutation();
  const [view, setView] = useState<View>("overview");
  const [role, setRole] = useState<Role>("Trainee");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [competencies, setCompetencies] = useState(seedCompetencies);
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const [query, setQuery] = useState("");
  const [assessmentAttemptId, setAssessmentAttemptId] = useState<number | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, unknown>>({});
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewScore, setReviewScore] = useState("80");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState("Radar interpretation practical task");
  const [evidenceCompetencyId, setEvidenceCompetencyId] = useState(1);
  const assessmentAttemptInput = useMemo(() => ({ attemptId: assessmentAttemptId ?? 0 }), [assessmentAttemptId]);
  const assessmentAttempt = trpc.assessmentGateway.getAttempt.useQuery(assessmentAttemptInput, { enabled: Boolean(user && assessmentAttemptId), retry: false });
  const assessmentReviewQueue = trpc.assessmentGateway.reviewQueue.useQuery(undefined, { enabled: Boolean(user && (role === "Trainer" || role === "Admin")), retry: false });
  const evidenceReviewQueue = trpc.evidenceGateway.listForReview.useQuery(undefined, { enabled: Boolean(user && (role === "Trainer" || role === "Admin")), retry: false });
  useEffect(() => {
    const liveRecords = liveWorkspace.data?.userCompetencies;
    const liveCatalog = liveWorkspace.data?.competencies;
    if (liveRecords?.length) {
      setCompetencies(liveRecords.map(({ record, competency }) => ({ name: competency.name, short: competency.name.split(" ").slice(0, 2).join(" "), category: competency.category, current: record.validatedLevel || record.currentLevel, target: 3, status: (record.validatedLevel >= 3 ? "On track" : (record.validatedLevel > 0 ? "Developing" : "Critical gap")) as Competency["status"], evidence: record.evidenceState.replaceAll("_", " "), freshness: record.verifiedAt ? new Date(record.verifiedAt).toLocaleDateString() : "Not verified" })));
    } else if (liveCatalog?.length) {
      setEvidenceCompetencyId(liveCatalog[0].id);
      setCompetencies(liveCatalog.slice(0, 8).map((competency) => ({ name: competency.name, short: competency.name.split(" ").slice(0, 2).join(" "), category: competency.category, current: 0, target: 3, status: "Critical gap", evidence: "Not yet assessed", freshness: "Baseline required" })));
    }
  }, [liveWorkspace.data]);

  const readiness = useMemo(() => {
    const total = competencies.reduce((sum, item) => sum + item.current, 0);
    const target = competencies.reduce((sum, item) => sum + item.target, 0);
    return Math.round((total / target) * 100);
  }, [competencies]);

  const gaps = competencies.filter((item) => item.current < item.target);
  const filteredCourses = courses.filter((course) => course.title.toLowerCase().includes(query.toLowerCase()) || course.competency.toLowerCase().includes(query.toLowerCase()));

  const workspaceState = liveWorkspace.data ? `Connected tenant · ${liveWorkspace.data.organization.name}` : user ? "Authenticated · workspace setup required" : "Synthetic IMD dataset";
  const selectView = (next: View) => { setView(next); setMobileOpen(false); };
  const handleProvisionWorkspace = () => {
    if (!user) { toast.info("Sign in with the configured platform owner account to provision a tenant."); return; }
    provisionWorkspace.mutate({ name: "India Meteorological Department · National", slug: "imd-national" }, { onSuccess: () => { toast.success("Live IMD workspace provisioned"); liveWorkspace.refetch(); }, onError: (error) => toast.error("Workspace setup failed", { description: error.message }) });
  };
  const handleSeedImdCatalog = () => {
    seedImdCatalog.mutate(undefined, { onSuccess: (result) => { toast.success("Official IMD catalog loaded", { description: `${result.departments} organization units and ${result.competencies} competencies are now available.` }); liveWorkspace.refetch(); }, onError: (error) => toast.error("IMD catalog load failed", { description: error.message }) });
  };
  const beginCourse = (id: string) => { setActiveCourse(id); toast.success("Learning path started", { description: "Your baseline and progress will be tracked against the competency gap." }); };
  const verifyEvidence = () => {
    setEvidenceReviewed(true);
    setCompetencies((items) => items.map((item) => item.name === "Radar Interpretation" ? { ...item, current: 2, status: "Developing", evidence: "Trainer verified", freshness: "Just now" } : item));
    toast.success("Evidence verified", { description: "Radar Interpretation moved from self-declared to trainer verified." });
  };
  const handleAssessmentStart = (assessmentId?: number, title = "Assessment") => {
    if (!user || !assessmentId) {
      toast.info(`${title} is ready in the demo gateway. Sign in to create a server-tracked attempt.`);
      return;
    }
    startAssessment.mutate({ assessmentId }, {
      onSuccess: (attempt) => { if (attempt?.id) { setAssessmentAttemptId(attempt.id); setAssessmentAnswers({}); } toast.success("Attempt created", { description: `${title} · attempt ${attempt?.id ?? "created"} is now server-tracked.` }); },
      onError: (error) => toast.error("Assessment could not start", { description: error.message }),
    });
  };
  const handleSubmitAssessment = () => {
    if (!assessmentAttemptId) return;
    submitAssessment.mutate({ attemptId: assessmentAttemptId, answers: assessmentAnswers }, { onSuccess: (result) => { toast.success(result.reviewStatus === "pending" ? "Submitted for rubric review" : "Assessment scored", { description: result.reviewStatus === "pending" ? "A trainer must review this attempt before competency evidence changes." : `Score: ${result.scorePercent}%` }); setAssessmentAttemptId(null); assessmentAttempt.refetch(); }, onError: (error) => toast.error("Submission failed", { description: error.message }) });
  };
  const handleReviewAssessment = (attemptId: number, outcome: "completed" | "rejected") => {
    reviewAssessment.mutate({ attemptId, outcome, scorePercent: Number(reviewScore), validatedLevel: outcome === "completed" ? 2 : undefined, rubric: { evidence_quality: outcome === "completed" ? 4 : 2, technical_accuracy: outcome === "completed" ? 4 : 2, operational_communication: outcome === "completed" ? 4 : 2 }, notes: reviewNotes || undefined }, { onSuccess: () => { toast.success("Rubric review saved"); setReviewNotes(""); assessmentReviewQueue.refetch(); }, onError: (error) => toast.error("Review failed", { description: error.message }) });
  };
  const handleEvidenceUpload = async () => {
    if (!evidenceFile) { toast.info("Choose a PDF, image, DOCX, or text evidence file first."); return; }
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(evidenceFile); });
    uploadEvidence.mutate({ fileName: evidenceFile.name, contentType: evidenceFile.type || "application/octet-stream", fileBase64: base64, title: evidenceTitle, competencyId: evidenceCompetencyId, evidenceType: "uploaded_artifact", claimedLevel: 2 }, { onSuccess: (result) => { if (result.accepted) { toast.success("Evidence accepted for trainer review", { description: "The file passed scanning and is stored privately." }); setEvidenceFile(null); liveWorkspace.refetch(); } else toast.error("Evidence quarantined", { description: result.message }); }, onError: (error) => toast.error("Upload failed", { description: error.message }) });
  };
  const handleEvidenceReview = (evidenceId: number, toStatus: "verified" | "rejected") => {
    reviewEvidenceItem.mutate({ evidenceId, toStatus, validatedLevel: toStatus === "verified" ? 2 : undefined, notes: toStatus === "verified" ? "Reviewed against the submitted evidence and competency criteria." : "Additional or corrected evidence required." }, { onSuccess: () => { toast.success(`Evidence ${toStatus}`); evidenceReviewQueue.refetch(); liveWorkspace.refetch(); }, onError: (error) => toast.error("Evidence review failed", { description: error.message }) });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><CloudSun size={19} strokeWidth={2.4} /></div>
          <div><div className="brand-name">capacity<span>connect</span></div><div className="brand-sub">IMD capability workspace</div></div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-switcher"><div className="workspace-icon"><ShieldCheck size={16} /></div><div><span>Workspace</span><strong>IMD · National</strong></div><ChevronDown size={15} className="muted-icon" /></div>
        <div className="nav-label">Workspace</div>
        <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "selected" : ""}`} onClick={() => selectView(id)}><Icon size={17} /><span>{label}</span>{id === "evidence" && !evidenceReviewed && <i className="nav-dot" />}</button>)}</nav>
        <div className="nav-label second">Operations</div>
        <nav>{[{ label: "Cohorts", icon: Users }, { label: "Certificates", icon: Award }].map(({ label, icon: Icon }) => <button key={label} className="nav-item" onClick={() => toast.info(`${label} is part of the next delivery slice.`)}><Icon size={17} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="signal-card"><div className="signal-icon"><Sparkles size={16} /></div><div><strong>Capability signal</strong><p>Readiness is calculated from validated levels, not course completion.</p></div></div><button className="profile-chip" onClick={() => toast.info("Profile settings are available in the full workspace.")}><div className="avatar">AS</div><div><strong>Ananya Sharma</strong><span>Forecasting Analyst</span></div><ChevronDown size={15} className="muted-icon" /></button></div>
      </aside>

      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Capacity Connect</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label}</strong></div><div className="top-actions"><div className="role-switch"><span>Viewing as</span><select value={role} onChange={(event) => { setRole(event.target.value as Role); toast.info(`${event.target.value} view selected`); }}><option>Trainee</option><option>Trainer</option><option>Admin</option></select></div><button className="icon-button" onClick={() => toast.info("No new notifications")} aria-label="Notifications"><Bell size={18} /><i /></button><Button className="login-button" onClick={() => startLogin()}>Sign in <ArrowRight size={15} /></Button></div></header>
        <div className="content-wrap">
          <div className="demo-banner"><div><span className="live-dot" /> <strong>{liveWorkspace.data ? "Live tenant workspace" : "SIH demo workspace"}</strong><span className="banner-copy">{workspaceState} · browser actions never bypass server authorization</span></div><button onClick={() => liveWorkspace.error && user?.role === "admin" ? handleProvisionWorkspace() : toast.info(liveWorkspace.data ? "Live workspace records are tenant-scoped through the server API." : "Synthetic values are labeled and kept separate from production persistence.")}>{user?.role === "admin" && liveWorkspace.error ? (provisionWorkspace.isPending ? "Provisioning..." : "Provision IMD workspace") : "Data provenance"} <ArrowRight size={14} /></button></div>

          {view === "overview" && <>
            <section className="hero-row"><div><div className="eyebrow"><span className="eyebrow-line" /> MONDAY · 14 SEPTEMBER 2026</div><h1>Good morning, Ananya.</h1><p className="hero-copy">Here is the capability signal for your <strong>Operational Weather Forecaster</strong> role.</p><div className="hero-actions"><Button className="primary-action" onClick={() => selectView("passport")}>View my skill passport <ArrowRight size={16} /></Button><button className="quiet-action" onClick={() => selectView("learning")}><Play size={15} /> Continue learning <span>28 min left</span></button></div></div><div className="readiness-card"><div className="readiness-top"><span>Role readiness</span><span className="trend"><Activity size={14} /> +8% this month</span></div><div className="readiness-number">{readiness}<small>%</small></div><div className="readiness-bar"><span style={{ width: `${readiness}%` }} /></div><div className="readiness-foot"><span>Validated coverage</span><strong>Target: 80%</strong></div><div className="readiness-note"><Gauge size={15} /><span>Calculated from 4 required competencies</span></div></div></section>

            <section className="metric-grid"><div className="metric-card"><div className="metric-icon violet"><Target size={17} /></div><div><span>Critical gaps</span><strong>{gaps.filter((gap) => gap.status === "Critical gap").length}</strong><small>Need an intervention</small></div><ArrowRight size={15} className="metric-arrow" /></div><div className="metric-card"><div className="metric-icon teal"><BookOpen size={17} /></div><div><span>Learning in progress</span><strong>1</strong><small>28 min remaining</small></div><ArrowRight size={15} className="metric-arrow" /></div><div className="metric-card"><div className="metric-icon amber"><FileCheck2 size={17} /></div><div><span>Evidence to review</span><strong>{evidenceReviewed ? 0 : 1}</strong><small>{evidenceReviewed ? "All caught up" : "Trainer action needed"}</small></div><ArrowRight size={15} className="metric-arrow" /></div><div className="metric-card"><div className="metric-icon blue"><Award size={17} /></div><div><span>Verified competencies</span><strong>{competencies.filter((item) => item.evidence === "Trainer verified").length}</strong><small>of {competencies.length} required</small></div><ArrowRight size={15} className="metric-arrow" /></div></section>

            <section className="dashboard-grid"><div className="panel competency-panel"><SectionHeading eyebrow="Your capability signal" title="Where to focus next" body="The platform prioritizes gaps by target level, criticality, and evidence freshness." action="Open passport" /><div className="competency-list">{competencies.map((item) => <button className="competency-row" key={item.name} onClick={() => selectView("passport")}><div className="competency-main"><div className={`status-dot ${item.status === "Critical gap" ? "critical" : item.status === "Developing" ? "developing" : "on-track"}`} /><div><strong>{item.name}</strong><span>{item.category} · {item.evidence}</span></div></div><div className="competency-level"><LevelDots value={item.current} target={item.target} /><span>{item.current} <em>/</em> {item.target}</span></div><div className={`status-pill ${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</div><ArrowRight size={15} className="row-arrow" /></button>)}</div></div><div className="panel action-panel"><SectionHeading eyebrow="Recommended intervention" title="Close the highest-priority gap" /><div className="recommendation-hero"><div className="course-orb"><BrainCircuit size={22} /></div><div><Badge className="match-badge">96% match</Badge><h3>Radar Fundamentals<br />for Forecasters</h3><p>Recommended because it addresses your largest verified gap and has no prerequisites.</p></div></div><div className="recommendation-meta"><span><Clock3 size={14} /> 4h 20m</span><span><GraduationCap size={14} /> Foundation</span><span><Zap size={14} /> 3 competencies</span></div><Button className="full-action" onClick={() => beginCourse("radar")}>{activeCourse === "radar" ? <><Check size={15} /> Learning path active</> : <>Start recommended path <ArrowRight size={15} /></>}</Button><button className="why-button" onClick={() => { if (!user) { toast.info("Transparent match: gap size 40% · competency criticality 30% · prerequisite fit 20% · course effectiveness 10%."); return; } explainRecommendation.mutate({ gap: "Radar Interpretation", currentLevel: 1, targetLevel: 3, courseTitle: "Radar Fundamentals for Forecasters" }, { onSuccess: (result) => toast.info(result.explanation, { description: result.enabled ? "Optional provider explanation · deterministic rules remain authoritative." : "Deterministic explanation · AI provider unavailable." }) }); }}><MessageSquareText size={14} /> {explainRecommendation.isPending ? "Explaining..." : "Why was this recommended?"}</button></div></section>

            <section className="lower-grid"><div className="panel timeline-panel"><SectionHeading eyebrow="Closed-loop progress" title="From gap to evidence" /><div className="journey"><div className="journey-line" />{[{ label: "Baseline captured", detail: "4 competencies mapped to your role", state: "done", icon: Target }, { label: "Learning intervention", detail: "Radar Fundamentals · 72% complete", state: "active", icon: BookOpen }, { label: "Evidence submission", detail: "Practical radar interpretation task", state: evidenceReviewed ? "done" : "next", icon: FileCheck2 }, { label: "Trainer verification", detail: "Dr. Meera Iyer · pending review", state: evidenceReviewed ? "done" : "next", icon: ShieldCheck }].map(({ label, detail, state, icon: Icon }) => <div className={`journey-step ${state}`} key={label}><div className="journey-icon"><Icon size={15} /></div><div><strong>{label}</strong><span>{detail}</span></div>{state === "done" && <Check size={15} className="journey-check" />}{state === "active" && <span className="journey-live">In progress</span>}</div>)}</div></div><div className="panel trainer-panel"><SectionHeading eyebrow="Trainer capacity" title="People who can help" action="View all" /><div className="trainer-list">{trainers.slice(0, 2).map((trainer) => <div className="trainer-row" key={trainer.name}><div className="avatar trainer-avatar">{trainer.initials}</div><div className="trainer-info"><strong>{trainer.name}</strong><span>{trainer.role}</span><small><span className="availability-dot" /> {trainer.availability}</small></div><div className="trainer-score"><strong>{trainer.score}</strong><span>match</span></div></div>)}</div><button className="text-button full-link" onClick={() => toast.info("Trainer matching uses explainable weighted factors, not a black box.")}>See explainable matching <ArrowRight size={15} /></button></div></section>
          </>}

          {view === "passport" && <section className="page-section"><SectionHeading eyebrow="Skill passport" title="Your verified capability profile" body="A living record of what you can do, what proves it, and what closes the next gap." /><div className="passport-summary"><div><span className="eyebrow">Role readiness</span><strong>{readiness}%</strong><p>Operational Weather Forecaster</p></div><div className="summary-divider" /><div><span>Required competencies</span><strong>{competencies.length}</strong><p>Mapped to your current role</p></div><div className="summary-divider" /><div><span>Evidence posture</span><strong>{evidenceReviewed ? "Improving" : "2 open"}</strong><p>{evidenceReviewed ? "Verification updated today" : "2 self-declared levels"}</p></div></div><div className="panel table-panel"><div className="table-toolbar"><div><h3>Competency coverage</h3><p>Level scale: Awareness 0 · Foundation 1 · Working 2 · Proficient 3 · Expert 4</p></div><Button variant="outline" onClick={() => toast.success("Skill passport export prepared.")}><Download size={15} /> Export</Button></div><div className="passport-table">{competencies.map((item) => <div className="passport-row" key={item.name}><div className="passport-name"><div className="table-dot" /><strong>{item.name}</strong><span>{item.category}</span></div><div><span className="table-label">Current</span><strong className="level-value">{item.current}</strong></div><div><span className="table-label">Target</span><strong className="level-value">{item.target}</strong></div><div className="passport-evidence"><span className={`evidence-tag ${item.evidence === "Trainer verified" ? "verified" : item.evidence === "Assessed" ? "assessed" : "declared"}`}>{item.evidence === "Trainer verified" && <Check size={12} />}{item.evidence}</span><small>{item.freshness}</small></div><div className={`status-pill ${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</div><button className="row-action" onClick={() => selectView(item.status === "Critical gap" ? "learning" : "evidence")}><ArrowRight size={16} /></button></div>)}</div></div></section>}

          {view === "learning" && <section className="page-section"><SectionHeading eyebrow="Learning paths" title="Recommended for your gaps" body="Recommendations are generated from the competency model, prerequisites, level, and learning history." /><div className="learning-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search learning paths or competencies" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="filter-chip">Best match <ChevronDown size={14} /></div></div><div className="course-grid">{filteredCourses.map((course) => <div className={`course-card ${activeCourse === course.id ? "selected" : ""}`} key={course.id}><div className={`course-cover ${course.accent}`}><span>{course.type}</span><div className="course-cover-icon">{course.id === "radar" ? <BrainCircuit size={28} /> : course.id === "satellite" ? <CloudSun size={28} /> : <Activity size={28} />}</div><strong>{course.match}%<small> match</small></strong></div><div className="course-body"><div className="course-title-row"><h3>{course.title}</h3><button onClick={() => toast.info("Saved to your learning shortlist.")} aria-label="Save course"><Library size={17} /></button></div><p className="course-reason"><span>Recommended for</span> {course.competency}</p><div className="course-details"><span><Clock3 size={14} /> {course.duration}</span><span><GraduationCap size={14} /> {course.level}</span></div><p className="course-meta">{course.meta}</p><Button className="full-action" onClick={() => beginCourse(course.id)}>{activeCourse === course.id ? <><Check size={15} /> In progress</> : <>View learning path <ArrowRight size={15} /></>}</Button></div></div>)}</div>{filteredCourses.length === 0 && <div className="empty-state"><Search size={20} /><strong>No matching learning paths</strong><span>Try a competency such as radar or satellite.</span></div>}</section>}

          {view === "evidence" && <section className="page-section"><SectionHeading eyebrow="Evidence review" title="Make capability claims verifiable" body="Files are scanned before storage, kept private, and cannot change a competency until a trainer or admin reviews them." /><div className="evidence-upload-grid"><div className="panel upload-panel"><div className="upload-heading"><div className="file-icon"><FileCheck2 size={21} /></div><div><h3>Submit evidence</h3><p>Private storage · 10 MB limit · PDF, DOCX, image, or text</p></div></div><label className="upload-dropzone"><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)} /><UploadCloud size={24} /><strong>{evidenceFile ? evidenceFile.name : "Choose a file to scan and upload"}</strong><span>{evidenceFile ? `${Math.round(evidenceFile.size / 1024)} KB selected` : "Your file stays private and is only exposed through an authorized signed URL."}</span></label><input className="text-input" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="Evidence title" /><select className="text-input" value={evidenceCompetencyId} onChange={(event) => setEvidenceCompetencyId(Number(event.target.value))}>{(liveWorkspace.data?.competencies?.length ? liveWorkspace.data.competencies : [{ id: 1, name: "Radar Interpretation" }]).map((competency) => <option key={competency.id} value={competency.id}>{competency.name}</option>)}</select><div className="upload-safety"><ShieldCheck size={15} /><span>Malware scan runs before the object is written to private storage. Quarantined files are not reviewable.</span></div><Button className="full-action" onClick={handleEvidenceUpload}>{uploadEvidence.isPending ? "Scanning and uploading..." : "Scan & submit evidence"} <ArrowRight size={15} /></Button></div><div className="panel verification-panel"><SectionHeading eyebrow="Verification model" title="Trust is a workflow" /><div className="verification-flow">{[{ label: "Self-declared", done: true }, { label: "Submitted", done: true }, { label: "Scan clean", done: Boolean(evidenceFile || liveWorkspace.data?.evidence?.length) }, { label: "Trainer verified", done: evidenceReviewed }].map((step, index) => <div className={`verification-step ${step.done ? "done" : ""}`} key={step.label}><div className="verification-node">{step.done ? <Check size={13} /> : index + 1}</div><span>{step.label}</span>{index < 3 && <div className="verification-connector" />}</div>)}</div><div className="explain-box"><Sparkles size={16} /><p><strong>Human-in-the-loop by design.</strong> Recommendations may be automated; verification never is. Every file, scan result, and state transition is auditable.</p></div></div></div><div className="evidence-layout"><div className="panel evidence-card"><div className="evidence-header"><div className="file-icon"><FileCheck2 size={21} /></div><div><Badge className={evidenceReviewed ? "verified-badge" : "pending-badge"}>{evidenceReviewed ? "Verified" : "Demo under review"}</Badge><h3>Radar interpretation practical task</h3><p>Demo record · linked to Radar Interpretation</p></div></div><div className="evidence-details"><div><span>Claimed level</span><strong>Working · 2</strong></div><div><span>Target level</span><strong>Proficient · 3</strong></div><div><span>Storage</span><strong>Private object</strong></div></div><div className="evidence-preview"><div className="preview-top"><span><FileCheck2 size={14} /> practical-task.pdf</span><span>2.4 MB</span></div><div className="preview-lines"><i /><i /><i /><i /><i className="short" /></div><div className="preview-stamp"><ShieldCheck size={15} /> Scan clean · evidence chain intact</div></div><div className="evidence-actions">{!evidenceReviewed && <Button className="primary-action" onClick={verifyEvidence}><Check size={15} /> Verify demo evidence</Button>}<Button variant="outline" onClick={() => toast.info("Request for more evidence sent to the trainee.")}>Request more evidence</Button></div></div><div className="panel reviewer-panel"><SectionHeading eyebrow="Reviewer queue" title="Pending live evidence" body="Only trainer/admin members can see this queue." />{(role === "Trainer" || role === "Admin") && evidenceReviewQueue.data?.length ? evidenceReviewQueue.data.map((item) => <div className="review-row" key={item.id}><div><strong>{item.title}</strong><span>{item.evidenceType.replace("_", " ")} · scan {item.scanStatus}</span></div><div className="review-actions"><Button className="primary-action" onClick={() => handleEvidenceReview(item.id, "verified")}>Verify</Button><Button variant="outline" onClick={() => handleEvidenceReview(item.id, "rejected")}>Reject</Button></div></div>) : <div className="empty-state"><FileCheck2 size={20} /><strong>No live evidence waiting</strong><span>Clean uploaded evidence will appear here for trainer review.</span></div>}</div></div></section>}

          {view === "assessments" && <section className="page-section"><SectionHeading eyebrow="Assessment gateway" title="Assess capability, not just recall" body="Take a server-tracked assessment, submit practical work, and keep competency changes behind a human review boundary." />{assessmentAttempt.data ? <div className="attempt-layout"><div className="panel attempt-panel"><div className="attempt-header"><div><Badge className="gateway-badge">Attempt {assessmentAttempt.data.attempt.id}</Badge><h3>{assessmentAttempt.data.assessment?.title}</h3><p>{assessmentAttempt.data.assessment?.assessmentType.replace("_", " ")} · answers are saved only on submit</p></div><button className="text-button" onClick={() => setAssessmentAttemptId(null)}>Exit attempt</button></div><div className="attempt-progress"><Progress value={assessmentAttempt.data.questions.length ? Math.round((Object.keys(assessmentAnswers).length / assessmentAttempt.data.questions.length) * 100) : 20} /><span>{Object.keys(assessmentAnswers).length} of {assessmentAttempt.data.questions.length || 1} responses captured</span></div><div className="question-list">{assessmentAttempt.data.questions.length ? assessmentAttempt.data.questions.map((question, index) => { const options = (() => { try { return question.optionsJson ? JSON.parse(question.optionsJson) as string[] : []; } catch { return []; } })(); return <div className="question-card" key={question.id}><div className="question-number">0{index + 1}</div><div className="question-content"><span className="question-type">{question.questionType.replace("_", " ")}</span><h4>{question.prompt}</h4>{options.length ? <div className="question-options">{options.map((option) => <label key={option}><input type={question.questionType === "multi_select" ? "checkbox" : "radio"} name={`question-${question.id}`} checked={question.questionType === "multi_select" ? Array.isArray(assessmentAnswers[String(question.id)]) && (assessmentAnswers[String(question.id)] as string[]).includes(option) : assessmentAnswers[String(question.id)] === option} onChange={(event) => { if (question.questionType === "multi_select") { const current = Array.isArray(assessmentAnswers[String(question.id)]) ? assessmentAnswers[String(question.id)] as string[] : []; setAssessmentAnswers({ ...assessmentAnswers, [String(question.id)]: event.target.checked ? [...current, option] : current.filter((item) => item !== option) }); } else setAssessmentAnswers({ ...assessmentAnswers, [String(question.id)]: option }); }} /><span>{option}</span></label>)}</div> : <Textarea placeholder="Write your operational response..." value={String(assessmentAnswers[String(question.id)] ?? "")} onChange={(event) => setAssessmentAnswers({ ...assessmentAnswers, [String(question.id)]: event.target.value })} />}</div></div>; }) : <div className="practical-prompt"><Sparkles size={18} /><div><strong>Practical submission</strong><p>Describe your analysis, decision, evidence used, and how you would communicate the warning. This attempt will be sent directly to a trainer rubric queue.</p><Textarea placeholder="Write your practical response..." value={String(assessmentAnswers.practical ?? "")} onChange={(event) => setAssessmentAnswers({ ...assessmentAnswers, practical: event.target.value })} /></div></div>}</div><Button className="full-action" onClick={handleSubmitAssessment}>{submitAssessment.isPending ? "Submitting..." : "Submit for scoring / rubric review"} <ArrowRight size={15} /></Button></div><div className="panel integrity-panel"><SectionHeading eyebrow="Integrity boundary" title="What happens next" /><div className="integrity-list"><div><ShieldCheck size={16} /><span>Attempt ownership is verified on the server.</span></div><div><ClipboardCheck size={16} /><span>Objective items are scored from server-held answer hashes.</span></div><div><Users size={16} /><span>Practical, short-answer, and rubric attempts require trainer review.</span></div></div></div></div> : <><div className="assessment-intro"><div className="assessment-intro-icon"><ClipboardCheck size={21} /></div><div><strong>Versioned assessment boundary</strong><p>Assessments can run in-process today or behind an isolated service later without changing the trainee or competency contracts.</p></div><Badge className="gateway-badge">Gateway v1</Badge></div><div className="assessment-grid">{(liveAssessments.data?.length ? liveAssessments.data.map((assessment) => ({ id: assessment.id, title: assessment.title, type: assessment.assessmentType, meta: `${assessment.attemptLimit} attempts · ${assessment.passMarkPercent}% pass mark`, tone: assessment.assessmentType === "practical_task" ? "teal" : "violet" })) : [{ id: undefined, title: "Radar Interpretation Baseline", type: "mcq", meta: "20 questions · 30 min · 70% pass mark", tone: "violet" }, { id: undefined, title: "Forecast Briefing Practical", type: "practical_task", meta: "Scenario task · rubric review · trainer verified", tone: "teal" }, { id: undefined, title: "Warning Communication Rubric", type: "rubric", meta: "Role-play evidence · human review required", tone: "amber" }]).map((assessment) => <div className="assessment-card" key={assessment.id ?? assessment.title}><div className={`assessment-type ${assessment.tone}`}><ClipboardCheck size={20} /><span>{String(assessment.type).replace("_", " ")}</span></div><div className="assessment-card-body"><h3>{assessment.title}</h3><p>{assessment.meta}</p><div className="assessment-capability"><Target size={14} /> Maps to competency evidence</div><Button className="full-action" onClick={() => handleAssessmentStart(assessment.id, assessment.title)}>{startAssessment.isPending ? "Starting..." : "Start assessment"} <ArrowRight size={15} /></Button></div></div>)}</div></>}{(role === "Trainer" || role === "Admin") && <div className="review-queue"><div className="table-toolbar"><div><h3>Practical rubric queue</h3><p>Human review is required before practical evidence changes capability state.</p></div><Badge className="pending-badge">{assessmentReviewQueue.data?.length ?? 0} pending</Badge></div>{assessmentReviewQueue.data?.length ? assessmentReviewQueue.data.map(({ attempt, assessment }) => <div className="review-row" key={attempt.id}><div><strong>{assessment.title}</strong><span>Attempt #{attempt.id} · submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "recently"}</span></div><input className="review-score" type="number" min="0" max="100" value={reviewScore} onChange={(event) => setReviewScore(event.target.value)} aria-label="Review score" /><Textarea className="review-notes" placeholder="Rubric notes" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} /><div className="review-actions"><Button className="primary-action" onClick={() => handleReviewAssessment(attempt.id, "completed")}>Approve</Button><Button variant="outline" onClick={() => handleReviewAssessment(attempt.id, "rejected")}>Reject</Button></div></div>) : <div className="empty-state"><ClipboardCheck size={20} /><strong>No practical attempts awaiting review</strong><span>Submitted practical and rubric attempts will appear here.</span></div>}</div>}<div className="assessment-safety"><ShieldCheck size={17} /><div><strong>Assessment integrity controls</strong><span>Server-side scoring · attempt limits · versioned questions · signed attempt ownership · auditable results</span></div><button onClick={() => toast.info("Practical and rubric assessments require human review before competency updates.")}>How it works <ArrowRight size={14} /></button></div></section>}

          {view === "map" && <section className="page-section"><SectionHeading eyebrow="Capability map" title="Organizational capability command centre" body="A department-level view of coverage, risk, and where trainer capacity can create leverage." /><div className="imd-catalog-action"><div><strong>Official IMD catalog</strong><span>Seed organization units and competency themes from cited IMD sources.</span></div><Button variant="outline" onClick={handleSeedImdCatalog}>{seedImdCatalog.isPending ? "Loading..." : "Load official catalog"} <ArrowRight size={14} /></Button></div><div className="admin-kpis"><div><span>Org readiness</span><strong>68%</strong><small className="positive">+6% vs last month</small></div><div><span>Critical gaps</span><strong>07</strong><small>Across 3 departments</small></div><div><span>Verified trainers</span><strong>18</strong><small>2 capacity bottlenecks</small></div><div><span>Evidence backlog</span><strong>12</strong><small>4 due this week</small></div></div><div className="map-layout"><div className="panel heatmap-panel"><div className="table-toolbar"><div><h3>Competency coverage by department</h3><p>Validated levels compared with role requirements · synthetic demo data</p></div><Button variant="outline" onClick={() => toast.info("Capability report export prepared.")}><Download size={15} /> Export</Button></div><div className="heatmap"><div className="heatmap-header"><span>Department</span>{["Radar", "NWP", "Satellite", "Warning comm.", "Observation"].map((label) => <span key={label}>{label}</span>)}</div>{[{ name: "Forecasting", values: ["risk", "good", "risk", "watch", "good"] }, { name: "Climate Services", values: ["good", "watch", "watch", "good", "good"] }, { name: "Marine Weather", values: ["watch", "good", "risk", "good", "watch"] }, { name: "Research", values: ["good", "good", "good", "watch", "good"] }].map((row) => <div className="heatmap-row" key={row.name}><strong>{row.name}</strong>{row.values.map((value, index) => <button className={`heat-cell ${value}`} key={`${row.name}-${index}`} onClick={() => toast.info(`${row.name} · ${["Radar Interpretation", "NWP", "Satellite Interpretation", "Warning Communication", "Observation"][index]} selected.`)}>{value === "good" ? "78%" : value === "watch" ? "61%" : "42%"}</button>)}</div>)}</div><div className="heat-legend"><span><i className="good" /> Healthy coverage</span><span><i className="watch" /> Watch</span><span><i className="risk" /> Capability risk</span></div></div><div className="panel risk-panel"><SectionHeading eyebrow="Risk signals" title="Where to act first" /><div className="risk-item"><div className="risk-icon"><Zap size={16} /></div><div><strong>Radar Interpretation</strong><span>42% coverage · 2 verified trainers · 7 required</span><small>Targeted campaign recommended</small></div><ArrowRight size={15} /></div><div className="risk-item"><div className="risk-icon amber-bg"><Clock3 size={16} /></div><div><strong>Stale verification</strong><span>5 trainer competencies expire in 30 days</span><small>Start revalidation workflow</small></div><ArrowRight size={15} /></div><div className="risk-item"><div className="risk-icon teal-bg"><Users size={16} /></div><div><strong>Trainer capacity</strong><span>Satellite demand exceeds available slots</span><small>2 matching requests open</small></div><ArrowRight size={15} /></div><Button className="full-action" onClick={() => toast.success("Campaign draft created for Forecasting department.")}>Create focused campaign <ArrowRight size={15} /></Button></div></div></section>}
        </div>
        <footer className="app-footer"><span>Capacity Connect · SIH 2026 · Problem statement 26075</span><span><span className="live-dot" /> Demo environment</span></footer>
      </main>
    </div>
  );
}
