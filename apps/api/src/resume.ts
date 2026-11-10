// Resume reading and rating. Rule-based for now: no AI call, so it costs nothing and never leaves the Worker.
// When ai.ts exists (chapter 05), `rateResume` is where the model joins in. The result shape stays the same.
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 30_000;

// Pulls plain text out of a PDF. Returns null if it is not a readable PDF (for example a scan with no text layer).
export async function readPdfText(bytes: Uint8Array): Promise<string | null> {
  try {
    // pdf.js takes over the bytes it is given, so hand it a copy and keep ours for storage.
    const pdf = await getDocumentProxy(bytes.slice());
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = text.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
    return clean.length >= 80 ? clean : null;
  } catch {
    return null;
  }
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  return bytes.length > 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
}

export type RoleFit = { role: string; fit: number; matched: string[] };
export type Rating = {
  score: number; // 0 to 100, how ready the resume is
  roles: RoleFit[]; // how well it speaks each target role's language
  gaps: string[]; // top 3 fixes, most useful first
  strengths: string[];
  method: "rules"; // becomes "ai" later
};

// Words a hiring manager scans for, by field. Short on purpose; the AI replaces this later.
const FIELD_WORDS: [RegExp, string[]][] = [
  [/health|clinical|nurs|bio|medic/i, ["patient", "clinical", "research", "lab", "health", "care", "data", "analysis", "volunteer", "protocol"]],
  [/account|financ|audit|bank|invest|consult|business/i, ["excel", "financial", "analysis", "budget", "audit", "reporting", "forecast", "client", "model", "tax"]],
  [/data|analyt|machine|ai\b|statistic/i, ["python", "sql", "tableau", "excel", "dashboard", "model", "analysis", "statistics", "pandas", "visualization"]],
  [/software|developer|engineer|cyber|web|computer/i, ["python", "java", "javascript", "react", "api", "git", "sql", "testing", "aws", "typescript"]],
  [/civil|mechanical|electrical|chemical|architect|engineering/i, ["autocad", "design", "cad", "matlab", "project", "testing", "specification", "safety", "analysis", "solidworks"]],
  [/market|communic|brand|media|content/i, ["social", "campaign", "content", "analytics", "seo", "brand", "writing", "audience", "engagement", "strategy"]],
  [/educat|teach/i, ["curriculum", "students", "lesson", "tutoring", "classroom", "mentor", "assessment", "leadership", "workshop", "program"]],
];
const GENERIC_WORDS = ["led", "built", "analysis", "project", "team", "research", "improved", "managed", "communication", "presented"];

const ACTION_VERBS = ["led", "built", "created", "designed", "developed", "improved", "increased", "reduced", "managed", "launched", "analyzed", "organized", "delivered", "implemented", "coordinated", "wrote", "presented", "automated", "taught", "supported"];

function wordsFor(role: string): string[] {
  const hit = FIELD_WORDS.find(([pattern]) => pattern.test(role));
  return hit ? hit[1] : GENERIC_WORDS;
}

export function rateResume(text: string, roles: string[]): Rating {
  const lower = text.toLowerCase();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const wordCount = (lower.match(/[a-z0-9'+#-]+/g) ?? []).length;

  const hasEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text);
  const hasSection = (re: RegExp) => re.test(lower);
  const hasEducation = hasSection(/\beducation\b|\buniversity\b|\bcollege\b/);
  const hasExperience = hasSection(/\bexperience\b|\bwork history\b|\bemployment\b/);
  const hasProjects = hasSection(/\bprojects?\b/);
  const hasSkills = hasSection(/\bskills\b/);
  const numbers = (text.match(/\b\d[\d,.]*\s?(%|k|\+)?/g) ?? []).length;
  const verbHits = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}\\b`).test(lower)).length;

  const strengths: string[] = [];
  const problems: { weight: number; text: string }[] = [];

  if (hasEmail) strengths.push("Your email is easy to find.");
  else problems.push({ weight: 8, text: "Add your email near the top so recruiters can reach you." });

  if (hasEducation && hasExperience) strengths.push("Education and experience both have their own section.");
  if (!hasExperience) problems.push({ weight: 12, text: "Add an Experience section. Include jobs, volunteering, clubs and class projects." });
  if (!hasProjects && !hasExperience) problems.push({ weight: 6, text: "Add a Projects section to show what you can do with little work history." });
  if (!hasSkills) problems.push({ weight: 8, text: "Add a Skills section with the tools and software you actually use." });

  if (numbers >= 6) strengths.push("You use numbers to show results.");
  else problems.push({ weight: 16, text: "Add numbers to your bullets (for example: cut report time by 30%, served 200 patients)." });

  if (verbHits >= 6) strengths.push("Your bullets start with strong action words.");
  else problems.push({ weight: 12, text: "Start bullets with action words like led, built, improved or organized." });

  if (wordCount >= 250 && wordCount <= 700) strengths.push("The length is right for a one-page student resume.");
  else if (wordCount < 250) problems.push({ weight: 14, text: "Your resume is short. Add detail to your two strongest experiences." });
  else problems.push({ weight: 10, text: "Your resume is long. Trim it to one page and keep the strongest points." });

  const longLines = lines.filter((l) => l.length > 220).length;
  if (longLines > 2) problems.push({ weight: 6, text: "Some bullets are very long. Keep each to one or two lines." });

  const roleFits: RoleFit[] = roles.slice(0, 3).map((role) => {
    const words = wordsFor(role);
    const matched = words.filter((w) => lower.includes(w));
    return { role, fit: Math.round(35 + (matched.length / words.length) * 65), matched: matched.slice(0, 5) };
  });
  for (const r of roleFits) {
    if (r.fit < 60) {
      const missing = wordsFor(r.role).filter((w) => !r.matched.includes(w)).slice(0, 4);
      problems.push({ weight: 10, text: `For ${r.role}, work in what you have done with: ${missing.join(", ")}. Only add what is true.` });
    }
  }

  const lost = problems.reduce((sum, p) => sum + p.weight, 0);
  const score = Math.max(30, Math.min(96, 100 - lost));
  const gaps = problems.sort((a, b) => b.weight - a.weight).slice(0, 3).map((p) => p.text);

  return { score, roles: roleFits, gaps, strengths: strengths.slice(0, 3), method: "rules" };
}
