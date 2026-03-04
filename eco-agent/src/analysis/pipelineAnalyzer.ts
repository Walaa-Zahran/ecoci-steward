// # compute metrics + recommendations
import type { Job, Pipeline } from "../gitlab/client";

function fmtDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

export type EcoReport = {
  pipelineId: number;
  pipelineUrl: string;
  ref: string;
  status: string;
  totalDuration: string;
  slowestJobs: Array<{ name: string; duration: string; url: string }>;
  hotspots: string[];
  suggestions: string[];
  estimatedSavings: string;
};

export function analyzePipeline(pipeline: Pipeline, jobs: Job[]): EcoReport {
  const completedJobs = jobs
    .filter((j) => j.duration != null && typeof j.duration === "number")
    .map((j) => ({ ...j, duration: j.duration ?? 0 }));

  const slowest = [...completedJobs]
    .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
    .slice(0, 5);

  // Simple heuristics
  const hotspots: string[] = [];
  const suggestions: string[] = [];

  const totalSeconds =
    pipeline.duration ??
    completedJobs.reduce((sum, j) => sum + (j.duration ?? 0), 0);

  // Hotspot: long E2E/integration job
  const e2e = completedJobs.find(
    (j) => /e2e|integration/i.test(j.name) && (j.duration ?? 0) > 180,
  );
  if (e2e) {
    hotspots.push(
      `\`${e2e.name}\` is long (**${fmtDuration(e2e.duration)}**) and often doesn’t need to run on every change.`,
    );
    suggestions.push(
      `Add \`rules:changes\` so \`${e2e.name}\` runs only when relevant paths change (e.g., \`src/**\`, \`tests/**\`).`,
    );
  }

  // Hotspot: build job long
  const build = completedJobs.find(
    (j) => /build/i.test(j.name) && (j.duration ?? 0) > 120,
  );
  if (build) {
    hotspots.push(
      `\`${build.name}\` spends time rebuilding dependencies/artifacts (**${fmtDuration(build.duration)}**).`,
    );
    suggestions.push(
      `Add caching (npm/pnpm/yarn, pip, maven/gradle) and enable Docker layer cache if applicable.`,
    );
  }

  // Hotspot: repeated installs indicated by multiple “install” jobs
  const installJobs = completedJobs.filter((j) =>
    /install|deps|dependencies/i.test(j.name),
  );
  if (installJobs.length >= 2) {
    hotspots.push(
      `Multiple dependency-related jobs detected (${installJobs.length}). This often indicates missing cache reuse.`,
    );
    suggestions.push(
      `Consolidate dependency install steps or share cache keys between jobs.`,
    );
  }

  // Generic suggestions
  suggestions.push(
    `Use \`rules:changes\` to skip non-essential jobs on docs/config-only changes.`,
  );
  suggestions.push(
    `Reduce artifact retention for non-release pipelines (set \`expire_in\`) and avoid uploading large artifacts unless needed.`,
  );

  // Savings estimate
  const topSeconds = slowest.reduce((sum, j) => sum + (j.duration ?? 0), 0);
  const estLow = Math.min(
    20,
    Math.round((topSeconds / Math.max(totalSeconds, 1)) * 15),
  );
  const estHigh = Math.min(
    55,
    Math.round((topSeconds / Math.max(totalSeconds, 1)) * 35),
  );
  const estimatedSavings = `~${Math.max(10, estLow)}–${Math.max(25, estHigh)}%`;

  return {
    pipelineId: pipeline.id,
    pipelineUrl: pipeline.web_url,
    ref: pipeline.ref,
    status: pipeline.status,
    totalDuration: fmtDuration(totalSeconds),
    slowestJobs: slowest.map((j) => ({
      name: j.name,
      duration: fmtDuration(j.duration),
      url: j.web_url,
    })),
    hotspots: hotspots.length
      ? hotspots
      : [
          "No obvious hotspots detected from durations alone (still worth adding cache + rules:changes).",
        ],
    suggestions,
    estimatedSavings,
  };
}
