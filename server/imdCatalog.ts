import { and, eq } from "drizzle-orm";
import { assessmentQuestions, assessments, competencies, courseCompetencies, courseModules, courses, departments, roleCompetencyRequirements, roles } from "../drizzle/schema";
import { getDb, hashAnswer, recordAudit } from "./db";

const ORG_SOURCE = "Official IMD organisational structure";
const ORG_URL = "https://mausam.imd.gov.in/imd_latest/contents/organisational-structure.php";
const TRAINING_SOURCE = "Official IMD training SOP and Forecaster Training Course";
const TRAINING_URL = "https://mausam.imd.gov.in/imd_latest/contents/pdf/training_sop.pdf";

const departmentNames = [
  "Regional Meteorological Centre · Mumbai",
  "Regional Meteorological Centre · Chennai",
  "Regional Meteorological Centre · New Delhi",
  "Regional Meteorological Centre · Kolkata",
  "Regional Meteorological Centre · Nagpur",
  "Regional Meteorological Centre · Guwahati",
  "Satellite Meteorology",
  "Hydrometeorology",
  "Agricultural Meteorology",
  "Instrumentation",
  "Meteorological Telecommunication",
  "Training",
  "Seismology",
];

const competencySeed = [
  ["Dynamic Meteorology & Numerical Weather Prediction", "Forecasting", "Interpret model guidance and apply dynamic meteorology and NWP in operational forecasting."],
  ["Synoptic Meteorology & Aviation Meteorology", "Forecasting", "Prepare weather analyses and forecasts for synoptic and aviation operations."],
  ["Satellite Meteorology", "Observation", "Interpret satellite products and transform observations into forecast-relevant information."],
  ["Radar Meteorology", "Observation", "Interpret radar products, identify severe-weather signatures, and support warning decisions."],
  ["Physical Meteorology", "Science", "Apply atmospheric physics and measurement concepts to operational analysis."],
  ["Climate Science & Hydrometeorology", "Climate", "Create, quality-check, interpret, and communicate climate and hydrometeorological information."],
  ["Weather Warning & Advisory Dissemination", "Operations", "Prepare and disseminate weather analyses, forecasts, warnings, and sector-specific advisories."],
  ["Meteorological Observations & Quality Control", "Observation", "Take, report, plot, process, and quality-check meteorological observations."],
  ["Meteorological Instruments & Calibration", "Systems", "Operate, maintain, design, and calibrate meteorological instruments."],
  ["Communication & Information Systems", "Systems", "Operate and maintain meteorological communication and information systems."],
  ["Sectoral Weather Services", "Applications", "Adapt weather products for agriculture, aviation, shipping, fishing, hydrology, power, health, and emergency services."],
  ["Research & Scientific Analysis", "Research", "Plan and conduct independent or collaborative scientific analysis and research."],
] as const;

export async function seedOfficialImdCatalog(input: { organizationId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const departmentIds: number[] = [];
  for (const name of departmentNames) {
    const existing = await db.select().from(departments).where(and(eq(departments.organizationId, input.organizationId), eq(departments.name, name))).limit(1);
    if (existing[0]) { departmentIds.push(existing[0].id); continue; }
    await db.insert(departments).values({ organizationId: input.organizationId, name, sourceLabel: ORG_SOURCE, sourceUrl: ORG_URL });
    const created = await db.select().from(departments).where(and(eq(departments.organizationId, input.organizationId), eq(departments.name, name))).limit(1);
    if (created[0]) departmentIds.push(created[0].id);
  }
  const roleName = "Meteorological Forecaster";
  const existingRole = await db.select().from(roles).where(and(eq(roles.organizationId, input.organizationId), eq(roles.name, roleName))).limit(1);
  let roleId = existingRole[0]?.id;
  if (!roleId) {
    await db.insert(roles).values({ organizationId: input.organizationId, name: roleName, description: "Operational forecaster role aligned to official IMD training and evaluation themes.", criticality: 3 });
    const created = await db.select().from(roles).where(and(eq(roles.organizationId, input.organizationId), eq(roles.name, roleName))).limit(1);
    roleId = created[0]?.id;
  }
  if (!roleId) throw new Error("Could not create IMD forecaster role");
  let competencyCount = 0;
  const competencyIds = new Map<string, number>();
  for (const [name, category, description] of competencySeed) {
    const existing = await db.select().from(competencies).where(and(eq(competencies.organizationId, input.organizationId), eq(competencies.name, name))).limit(1);
    let competencyId = existing[0]?.id;
    if (!competencyId) {
      await db.insert(competencies).values({ organizationId: input.organizationId, name, category, description, sourceLabel: TRAINING_SOURCE, sourceUrl: TRAINING_URL });
      const created = await db.select().from(competencies).where(and(eq(competencies.organizationId, input.organizationId), eq(competencies.name, name))).limit(1);
      competencyId = created[0]?.id;
    }
    if (!competencyId) continue;
    competencyIds.set(name, competencyId);
    const requirement = await db.select().from(roleCompetencyRequirements).where(and(eq(roleCompetencyRequirements.organizationId, input.organizationId), eq(roleCompetencyRequirements.roleId, roleId), eq(roleCompetencyRequirements.competencyId, competencyId))).limit(1);
    if (!requirement[0]) await db.insert(roleCompetencyRequirements).values({ organizationId: input.organizationId, roleId, competencyId, targetLevel: 3, criticality: category === "Forecasting" || category === "Operations" ? 3 : 2 });
    competencyCount += 1;
  }
  const radarCompetencyId = competencyIds.get("Radar Meteorology");
  const courseTitle = "Radar Fundamentals for Forecasters";
  const existingCourse = await db.select().from(courses).where(and(eq(courses.organizationId, input.organizationId), eq(courses.title, courseTitle))).limit(1);
  let courseId = existingCourse[0]?.id;
  if (!courseId) {
    await db.insert(courses).values({ organizationId: input.organizationId, title: courseTitle, description: "A focused learning path for interpreting radar products, identifying severe-weather signatures, and communicating operational decisions.", difficulty: "foundation", durationMinutes: 260, status: "published", version: 1, createdBy: input.actorUserId });
    courseId = (await db.select().from(courses).where(and(eq(courses.organizationId, input.organizationId), eq(courses.title, courseTitle))).limit(1))[0]?.id;
  }
  if (courseId && radarCompetencyId) {
    const link = await db.select().from(courseCompetencies).where(and(eq(courseCompetencies.organizationId, input.organizationId), eq(courseCompetencies.courseId, courseId), eq(courseCompetencies.competencyId, radarCompetencyId))).limit(1);
    if (!link[0]) await db.insert(courseCompetencies).values({ organizationId: input.organizationId, courseId, competencyId: radarCompetencyId, targetLevel: 3 });
    const moduleRows = await db.select().from(courseModules).where(and(eq(courseModules.organizationId, input.organizationId), eq(courseModules.courseId, courseId))).limit(10);
    if (moduleRows.length === 0) await db.insert(courseModules).values([
      { organizationId: input.organizationId, courseId, title: "Radar foundations and products", description: "Reflectivity, velocity, scan strategy, and product selection.", position: 1, durationMinutes: 70 },
      { organizationId: input.organizationId, courseId, title: "Severe-weather signatures", description: "Recognise structure, movement, uncertainty, and limitations.", position: 2, durationMinutes: 100 },
      { organizationId: input.organizationId, courseId, title: "Operational briefing", description: "Turn evidence into an impact-relevant warning decision.", position: 3, durationMinutes: 90 },
    ]);
  }
  const existingBaseline = await db.select().from(assessments).where(and(eq(assessments.organizationId, input.organizationId), eq(assessments.title, "Radar Interpretation Baseline"))).limit(1);
  if (!existingBaseline[0]) {
    await db.insert(assessments).values({ organizationId: input.organizationId, courseId, competencyId: radarCompetencyId, title: "Radar Interpretation Baseline", assessmentType: "mcq", timeLimitSeconds: 1800, passMarkPercent: 70, attemptLimit: 3, status: "published", version: 1, createdBy: input.actorUserId });
    const created = await db.select().from(assessments).where(and(eq(assessments.organizationId, input.organizationId), eq(assessments.title, "Radar Interpretation Baseline"))).limit(1);
    const assessmentId = created[0]?.id;
    if (assessmentId) {
      const questions = [
        ["Which product is most directly used to identify precipitation structure and movement at high temporal resolution?", ["Radar", "Climate normals", "Upper-air sounding only", "Soil map"], "Radar"],
        ["A forecaster should combine radar interpretation with model guidance and surface observations before issuing a warning.", ["True", "False"], "True"],
        ["Which action best supports warning dissemination?", ["Communicate impact-relevant information with timing and location", "Publish raw data without context", "Wait until after the event", "Remove uncertainty information"], "Communicate impact-relevant information with timing and location"],
      ] as const;
      for (let index = 0; index < questions.length; index += 1) {
        const [prompt, options, answer] = questions[index];
        await db.insert(assessmentQuestions).values({ organizationId: input.organizationId, assessmentId, competencyId: radarCompetencyId, prompt, questionType: index === 1 ? "true_false" : "mcq", optionsJson: JSON.stringify(options), answerKeyHash: hashAnswer(answer), points: 1, position: index + 1, explanation: "Use multiple observation and model sources, then communicate an impact-relevant decision." });
      }
    }
  }
  const existingPractical = await db.select().from(assessments).where(and(eq(assessments.organizationId, input.organizationId), eq(assessments.title, "Forecast Briefing Practical"))).limit(1);
  if (!existingPractical[0]) {
    await db.insert(assessments).values({ organizationId: input.organizationId, courseId, competencyId: radarCompetencyId, title: "Forecast Briefing Practical", assessmentType: "practical_task", passMarkPercent: 70, attemptLimit: 2, rubricJson: JSON.stringify({ evidence_quality: 5, technical_accuracy: 5, operational_communication: 5 }), status: "published", version: 1, createdBy: input.actorUserId });
    const created = await db.select().from(assessments).where(and(eq(assessments.organizationId, input.organizationId), eq(assessments.title, "Forecast Briefing Practical"))).limit(1);
    if (created[0]) await db.insert(assessmentQuestions).values({ organizationId: input.organizationId, assessmentId: created[0].id, competencyId: radarCompetencyId, prompt: "Prepare a short operational briefing for a severe-weather scenario. State the evidence used, uncertainty, expected impacts, warning action, and how you would communicate it to stakeholders.", questionType: "short_answer", points: 0, position: 1, explanation: "Practical work is reviewed against the trainer rubric before capability changes." });
  }
  await recordAudit({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: "imd.catalog_seeded", targetType: "organization", targetId: String(input.organizationId), after: { departments: departmentIds.length, competencies: competencyCount, sources: [ORG_URL, TRAINING_URL] } });
  return { departments: departmentIds.length, competencies: competencyCount, role: roleName, sources: [ORG_URL, TRAINING_URL] };
}
