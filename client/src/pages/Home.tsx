import { useMemo, useState } from "react";
import { startLogin } from "@/const";
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
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Role = "Trainee" | "Trainer" | "Admin";
type View = "overview" | "passport" | "learning" | "evidence" | "map";

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
  const [view, setView] = useState<View>("overview");
  const [role, setRole] = useState<Role>("Trainee");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [competencies, setCompetencies] = useState(seedCompetencies);
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const [query, setQuery] = useState("");

  const readiness = useMemo(() => {
    const total = competencies.reduce((sum, item) => sum + item.current, 0);
    const target = competencies.reduce((sum, item) => sum + item.target, 0);
    return Math.round((total / target) * 100);
  }, [competencies]);

  const gaps = competencies.filter((item) => item.current < item.target);
  const filteredCourses = courses.filter((course) => course.title.toLowerCase().includes(query.toLowerCase()) || course.competency.toLowerCase().includes(query.toLowerCase()));

  const selectView = (next: View) => { setView(next); setMobileOpen(false); };
  const beginCourse = (id: string) => { setActiveCourse(id); toast.success("Learning path started", { description: "Your baseline and progress will be tracked against the competency gap." }); };
  const verifyEvidence = () => {
    setEvidenceReviewed(true);
    setCompetencies((items) => items.map((item) => item.name === "Radar Interpretation" ? { ...item, current: 2, status: "Developing", evidence: "Trainer verified", freshness: "Just now" } : item));
    toast.success("Evidence verified", { description: "Radar Interpretation moved from self-declared to trainer verified." });
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
        <nav>{[{ label: "Cohorts", icon: Users }, { label: "Assessments", icon: ClipboardCheck }, { label: "Certificates", icon: Award }].map(({ label, icon: Icon }) => <button key={label} className="nav-item" onClick={() => toast.info(`${label} is part of the next delivery slice.`)}><Icon size={17} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="signal-card"><div className="signal-icon"><Sparkles size={16} /></div><div><strong>Capability signal</strong><p>Readiness is calculated from validated levels, not course completion.</p></div></div><button className="profile-chip" onClick={() => toast.info("Profile settings are available in the full workspace.")}><div className="avatar">AS</div><div><strong>Ananya Sharma</strong><span>Forecasting Analyst</span></div><ChevronDown size={15} className="muted-icon" /></button></div>
      </aside>

      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Capacity Connect</span><span>/</span><strong>{navItems.find((item) => item.id === view)?.label}</strong></div><div className="top-actions"><div className="role-switch"><span>Viewing as</span><select value={role} onChange={(event) => { setRole(event.target.value as Role); toast.info(`${event.target.value} view selected`); }}><option>Trainee</option><option>Trainer</option><option>Admin</option></select></div><button className="icon-button" onClick={() => toast.info("No new notifications")} aria-label="Notifications"><Bell size={18} /><i /></button><Button className="login-button" onClick={() => startLogin()}>Sign in <ArrowRight size={15} /></Button></div></header>
        <div className="content-wrap">
          <div className="demo-banner"><div><span className="live-dot" /> <strong>SIH demo workspace</strong><span className="banner-copy">Synthetic IMD dataset · actions update this scenario for demonstration</span></div><button onClick={() => toast.info("Data provenance: synthetic seed records designed for SIH demonstration.")}>Data provenance <ArrowRight size={14} /></button></div>

          {view === "overview" && <>
            <section className="hero-row"><div><div className="eyebrow"><span className="eyebrow-line" /> MONDAY · 14 SEPTEMBER 2026</div><h1>Good morning, Ananya.</h1><p className="hero-copy">Here is the capability signal for your <strong>Operational Weather Forecaster</strong> role.</p><div className="hero-actions"><Button className="primary-action" onClick={() => selectView("passport")}>View my skill passport <ArrowRight size={16} /></Button><button className="quiet-action" onClick={() => selectView("learning")}><Play size={15} /> Continue learning <span>28 min left</span></button></div></div><div className="readiness-card"><div className="readiness-top"><span>Role readiness</span><span className="trend"><Activity size={14} /> +8% this month</span></div><div className="readiness-number">{readiness}<small>%</small></div><div className="readiness-bar"><span style={{ width: `${readiness}%` }} /></div><div className="readiness-foot"><span>Validated coverage</span><strong>Target: 80%</strong></div><div className="readiness-note"><Gauge size={15} /><span>Calculated from 4 required competencies</span></div></div></section>

            <section className="metric-grid"><div className="metric-card"><div className="metric-icon violet"><Target size={17} /></div><div><span>Critical gaps</span><strong>{gaps.filter((gap) => gap.status === "Critical gap").length}</strong><small>Need an intervention</small></div><ArrowRight size={15} className="metric-arrow" /></div><div className="metric-card"><div className="metric-icon teal"><BookOpen size={17} /></div><div><span>Learning in progress</span><strong>1</strong><small>28 min remaining</small></div><ArrowRight size={15} className="metric-arrow" /></div><div className="metric-card"><div className="metric-icon amber"><FileCheck2 size={17} /></div><div><span>Evidence to review</span><strong>{evidenceReviewed ? 0 : 1}</strong><small>{evidenceReviewed ? "All caught up" : "Trainer action needed"}</small></div><ArrowRight size={15} className="metric-arrow" /></div><div className="metric-card"><div className="metric-icon blue"><Award size={17} /></div><div><span>Verified competencies</span><strong>{competencies.filter((item) => item.evidence === "Trainer verified").length}</strong><small>of {competencies.length} required</small></div><ArrowRight size={15} className="metric-arrow" /></div></section>

            <section className="dashboard-grid"><div className="panel competency-panel"><SectionHeading eyebrow="Your capability signal" title="Where to focus next" body="The platform prioritizes gaps by target level, criticality, and evidence freshness." action="Open passport" /><div className="competency-list">{competencies.map((item) => <button className="competency-row" key={item.name} onClick={() => selectView("passport")}><div className="competency-main"><div className={`status-dot ${item.status === "Critical gap" ? "critical" : item.status === "Developing" ? "developing" : "on-track"}`} /><div><strong>{item.name}</strong><span>{item.category} · {item.evidence}</span></div></div><div className="competency-level"><LevelDots value={item.current} target={item.target} /><span>{item.current} <em>/</em> {item.target}</span></div><div className={`status-pill ${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</div><ArrowRight size={15} className="row-arrow" /></button>)}</div></div><div className="panel action-panel"><SectionHeading eyebrow="Recommended intervention" title="Close the highest-priority gap" /><div className="recommendation-hero"><div className="course-orb"><BrainCircuit size={22} /></div><div><Badge className="match-badge">96% match</Badge><h3>Radar Fundamentals<br />for Forecasters</h3><p>Recommended because it addresses your largest verified gap and has no prerequisites.</p></div></div><div className="recommendation-meta"><span><Clock3 size={14} /> 4h 20m</span><span><GraduationCap size={14} /> Foundation</span><span><Zap size={14} /> 3 competencies</span></div><Button className="full-action" onClick={() => beginCourse("radar")}>{activeCourse === "radar" ? <><Check size={15} /> Learning path active</> : <>Start recommended path <ArrowRight size={15} /></>}</Button><button className="why-button" onClick={() => toast.info("Transparent match: gap size 40% · competency criticality 30% · prerequisite fit 20% · course effectiveness 10%.")}><MessageSquareText size={14} /> Why was this recommended?</button></div></section>

            <section className="lower-grid"><div className="panel timeline-panel"><SectionHeading eyebrow="Closed-loop progress" title="From gap to evidence" /><div className="journey"><div className="journey-line" />{[{ label: "Baseline captured", detail: "4 competencies mapped to your role", state: "done", icon: Target }, { label: "Learning intervention", detail: "Radar Fundamentals · 72% complete", state: "active", icon: BookOpen }, { label: "Evidence submission", detail: "Practical radar interpretation task", state: evidenceReviewed ? "done" : "next", icon: FileCheck2 }, { label: "Trainer verification", detail: "Dr. Meera Iyer · pending review", state: evidenceReviewed ? "done" : "next", icon: ShieldCheck }].map(({ label, detail, state, icon: Icon }) => <div className={`journey-step ${state}`} key={label}><div className="journey-icon"><Icon size={15} /></div><div><strong>{label}</strong><span>{detail}</span></div>{state === "done" && <Check size={15} className="journey-check" />}{state === "active" && <span className="journey-live">In progress</span>}</div>)}</div></div><div className="panel trainer-panel"><SectionHeading eyebrow="Trainer capacity" title="People who can help" action="View all" /><div className="trainer-list">{trainers.slice(0, 2).map((trainer) => <div className="trainer-row" key={trainer.name}><div className="avatar trainer-avatar">{trainer.initials}</div><div className="trainer-info"><strong>{trainer.name}</strong><span>{trainer.role}</span><small><span className="availability-dot" /> {trainer.availability}</small></div><div className="trainer-score"><strong>{trainer.score}</strong><span>match</span></div></div>)}</div><button className="text-button full-link" onClick={() => toast.info("Trainer matching uses explainable weighted factors, not a black box.")}>See explainable matching <ArrowRight size={15} /></button></div></section>
          </>}

          {view === "passport" && <section className="page-section"><SectionHeading eyebrow="Skill passport" title="Your verified capability profile" body="A living record of what you can do, what proves it, and what closes the next gap." /><div className="passport-summary"><div><span className="eyebrow">Role readiness</span><strong>{readiness}%</strong><p>Operational Weather Forecaster</p></div><div className="summary-divider" /><div><span>Required competencies</span><strong>{competencies.length}</strong><p>Mapped to your current role</p></div><div className="summary-divider" /><div><span>Evidence posture</span><strong>{evidenceReviewed ? "Improving" : "2 open"}</strong><p>{evidenceReviewed ? "Verification updated today" : "2 self-declared levels"}</p></div></div><div className="panel table-panel"><div className="table-toolbar"><div><h3>Competency coverage</h3><p>Level scale: Awareness 0 · Foundation 1 · Working 2 · Proficient 3 · Expert 4</p></div><Button variant="outline" onClick={() => toast.success("Skill passport export prepared.")}><Download size={15} /> Export</Button></div><div className="passport-table">{competencies.map((item) => <div className="passport-row" key={item.name}><div className="passport-name"><div className="table-dot" /><strong>{item.name}</strong><span>{item.category}</span></div><div><span className="table-label">Current</span><strong className="level-value">{item.current}</strong></div><div><span className="table-label">Target</span><strong className="level-value">{item.target}</strong></div><div className="passport-evidence"><span className={`evidence-tag ${item.evidence === "Trainer verified" ? "verified" : item.evidence === "Assessed" ? "assessed" : "declared"}`}>{item.evidence === "Trainer verified" && <Check size={12} />}{item.evidence}</span><small>{item.freshness}</small></div><div className={`status-pill ${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</div><button className="row-action" onClick={() => selectView(item.status === "Critical gap" ? "learning" : "evidence")}><ArrowRight size={16} /></button></div>)}</div></div></section>}

          {view === "learning" && <section className="page-section"><SectionHeading eyebrow="Learning paths" title="Recommended for your gaps" body="Recommendations are generated from the competency model, prerequisites, level, and learning history." /><div className="learning-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search learning paths or competencies" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="filter-chip">Best match <ChevronDown size={14} /></div></div><div className="course-grid">{filteredCourses.map((course) => <div className={`course-card ${activeCourse === course.id ? "selected" : ""}`} key={course.id}><div className={`course-cover ${course.accent}`}><span>{course.type}</span><div className="course-cover-icon">{course.id === "radar" ? <BrainCircuit size={28} /> : course.id === "satellite" ? <CloudSun size={28} /> : <Activity size={28} />}</div><strong>{course.match}%<small> match</small></strong></div><div className="course-body"><div className="course-title-row"><h3>{course.title}</h3><button onClick={() => toast.info("Saved to your learning shortlist.")} aria-label="Save course"><Library size={17} /></button></div><p className="course-reason"><span>Recommended for</span> {course.competency}</p><div className="course-details"><span><Clock3 size={14} /> {course.duration}</span><span><GraduationCap size={14} /> {course.level}</span></div><p className="course-meta">{course.meta}</p><Button className="full-action" onClick={() => beginCourse(course.id)}>{activeCourse === course.id ? <><Check size={15} /> In progress</> : <>View learning path <ArrowRight size={15} /></>}</Button></div></div>)}</div>{filteredCourses.length === 0 && <div className="empty-state"><Search size={20} /><strong>No matching learning paths</strong><span>Try a competency such as radar or satellite.</span></div>}</section>}

          {view === "evidence" && <section className="page-section"><SectionHeading eyebrow="Evidence review" title="Make capability claims verifiable" body="Every level is tied to evidence and a human review state. Self-declared is not verified." /><div className="evidence-layout"><div className="panel evidence-card"><div className="evidence-header"><div className="file-icon"><FileCheck2 size={21} /></div><div><Badge className={evidenceReviewed ? "verified-badge" : "pending-badge"}>{evidenceReviewed ? "Verified" : "Under review"}</Badge><h3>Radar interpretation practical task</h3><p>Submitted 12 Sep 2026 · linked to Radar Interpretation</p></div></div><div className="evidence-details"><div><span>Claimed level</span><strong>Working · 2</strong></div><div><span>Target level</span><strong>Proficient · 3</strong></div><div><span>Submitted by</span><strong>Ananya Sharma</strong></div></div><div className="evidence-preview"><div className="preview-top"><span><FileCheck2 size={14} /> practical-task.pdf</span><span>2.4 MB</span></div><div className="preview-lines"><i /><i /><i /><i /><i className="short" /></div><div className="preview-stamp"><ShieldCheck size={15} /> Evidence chain intact</div></div><div className="evidence-note"><MessageSquareText size={16} /><div><strong>Review note</strong><p>{evidenceReviewed ? "Demonstrated correct identification of hook echoes, attenuation, and cell tracking. Level updated to Working." : "Trainer review is required before this evidence can update your validated competency level."}</p></div></div><div className="evidence-actions">{!evidenceReviewed && <Button className="primary-action" onClick={verifyEvidence}><Check size={15} /> Verify evidence</Button>}<Button variant="outline" onClick={() => toast.info("Request for more evidence sent to Ananya Sharma.")}>Request more evidence</Button></div></div><div className="panel verification-panel"><SectionHeading eyebrow="Verification model" title="Trust is a workflow" /><div className="verification-flow">{[{ label: "Self-declared", done: true }, { label: "Submitted", done: true }, { label: "Under review", done: !evidenceReviewed }, { label: "Trainer verified", done: evidenceReviewed }].map((step, index) => <div className={`verification-step ${step.done ? "done" : ""}`} key={step.label}><div className="verification-node">{step.done ? <Check size={13} /> : index + 1}</div><span>{step.label}</span>{index < 3 && <div className="verification-connector" />}</div>)}</div><div className="explain-box"><Sparkles size={16} /><p><strong>Human-in-the-loop by design.</strong> Recommendations may be automated; verification never is. Every state transition is auditable.</p></div></div></div></section>}

          {view === "map" && <section className="page-section"><SectionHeading eyebrow="Capability map" title="Organizational capability command centre" body="A department-level view of coverage, risk, and where trainer capacity can create leverage." /><div className="admin-kpis"><div><span>Org readiness</span><strong>68%</strong><small className="positive">+6% vs last month</small></div><div><span>Critical gaps</span><strong>07</strong><small>Across 3 departments</small></div><div><span>Verified trainers</span><strong>18</strong><small>2 capacity bottlenecks</small></div><div><span>Evidence backlog</span><strong>12</strong><small>4 due this week</small></div></div><div className="map-layout"><div className="panel heatmap-panel"><div className="table-toolbar"><div><h3>Competency coverage by department</h3><p>Validated levels compared with role requirements · synthetic demo data</p></div><Button variant="outline" onClick={() => toast.info("Capability report export prepared.")}><Download size={15} /> Export</Button></div><div className="heatmap"><div className="heatmap-header"><span>Department</span>{["Radar", "NWP", "Satellite", "Warning comm.", "Observation"].map((label) => <span key={label}>{label}</span>)}</div>{[{ name: "Forecasting", values: ["risk", "good", "risk", "watch", "good"] }, { name: "Climate Services", values: ["good", "watch", "watch", "good", "good"] }, { name: "Marine Weather", values: ["watch", "good", "risk", "good", "watch"] }, { name: "Research", values: ["good", "good", "good", "watch", "good"] }].map((row) => <div className="heatmap-row" key={row.name}><strong>{row.name}</strong>{row.values.map((value, index) => <button className={`heat-cell ${value}`} key={`${row.name}-${index}`} onClick={() => toast.info(`${row.name} · ${["Radar Interpretation", "NWP", "Satellite Interpretation", "Warning Communication", "Observation"][index]} selected.`)}>{value === "good" ? "78%" : value === "watch" ? "61%" : "42%"}</button>)}</div>)}</div><div className="heat-legend"><span><i className="good" /> Healthy coverage</span><span><i className="watch" /> Watch</span><span><i className="risk" /> Capability risk</span></div></div><div className="panel risk-panel"><SectionHeading eyebrow="Risk signals" title="Where to act first" /><div className="risk-item"><div className="risk-icon"><Zap size={16} /></div><div><strong>Radar Interpretation</strong><span>42% coverage · 2 verified trainers · 7 required</span><small>Targeted campaign recommended</small></div><ArrowRight size={15} /></div><div className="risk-item"><div className="risk-icon amber-bg"><Clock3 size={16} /></div><div><strong>Stale verification</strong><span>5 trainer competencies expire in 30 days</span><small>Start revalidation workflow</small></div><ArrowRight size={15} /></div><div className="risk-item"><div className="risk-icon teal-bg"><Users size={16} /></div><div><strong>Trainer capacity</strong><span>Satellite demand exceeds available slots</span><small>2 matching requests open</small></div><ArrowRight size={15} /></div><Button className="full-action" onClick={() => toast.success("Campaign draft created for Forecasting department.")}>Create focused campaign <ArrowRight size={15} /></Button></div></div></section>}
        </div>
        <footer className="app-footer"><span>Capacity Connect · SIH 2026 · Problem statement 26075</span><span><span className="live-dot" /> Demo environment</span></footer>
      </main>
    </div>
  );
}
