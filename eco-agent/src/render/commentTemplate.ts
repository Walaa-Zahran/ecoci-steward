//  # markdown Comment formatting
import type { EcoReport } from "../analysis/pipelineAnalyzer";

export function renderMrComment(r: EcoReport) {
  const slowest = r.slowestJobs
    .map(
      (j, idx) => `${idx + 1}. [\`${j.name}\`](${j.url}) — **${j.duration}**`,
    )
    .join("\n");

  const hotspots = r.hotspots.map((h) => `- ${h}`).join("\n");
  const suggestions = r.suggestions.map((s) => `- [ ] ${s}`).join("\n");

  return [
    `🌱 **EcoCI Steward Report** — Pipeline #${r.pipelineId}`,
    ``,
    `- 🔗 Pipeline: ${r.pipelineUrl}`,
    `- 🌿 Ref: \`${r.ref}\``,
    `- ✅ Status: **${r.status}**`,
    `- ⏱ Total duration: **${r.totalDuration}**`,
    ``,
    `### 🐢 Slowest jobs`,
    slowest || "_No job duration data available._",
    ``,
    `### 🔥 Waste hotspots`,
    hotspots,
    ``,
    `### ✅ Suggested optimizations`,
    suggestions,
    ``,
    `### 💡 Estimated savings`,
    `If you apply the quick wins above, expect **${r.estimatedSavings}** less pipeline time on similar runs.`,
    ``,
    `> Tip: This is rule-based (fast + transparent). Next iteration: store metrics history and show trend charts.`,
  ].join("\n");
}
