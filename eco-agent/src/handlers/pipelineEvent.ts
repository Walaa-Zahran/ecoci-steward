// # main trigger handler
import { env } from "../config";
import {
  getPipeline,
  listPipelineJobs,
  listMergeRequestsForCommit,
  postMergeRequestNote,
} from "../gitlab/client";
import { analyzePipeline } from "../analysis/pipelineAnalyzer";
import { renderMrComment } from "../render/commentTemplate";

type GitLabPipelineWebhook = {
  object_kind: "pipeline";
  project: { id: number; web_url: string; path_with_namespace: string };
  object_attributes: { id: number; status: string; ref: string; sha: string };
};

export async function handlePipelineEvent(payload: GitLabPipelineWebhook) {
  const projectId = payload.project.id;
  const pipelineId = payload.object_attributes.id;

  if (
    env.ALLOWED_PROJECT_ID &&
    String(projectId) !== String(env.ALLOWED_PROJECT_ID)
  ) {
    return { ok: true, skipped: true, reason: "project_not_allowed" };
  }

  //  only act on success
  if (payload.object_attributes.status !== "success") {
    return { ok: true, skipped: true, reason: "status_not_success" };
  }

  const pipeline = await getPipeline(projectId, pipelineId);
  const jobs = await listPipelineJobs(projectId, pipelineId);

  const report = analyzePipeline(pipeline, jobs);
  const comment = renderMrComment(report);

  // Find MR(s) related to commit SHA
  const mrs = await listMergeRequestsForCommit(projectId, pipeline.sha);

  if (!mrs.length) {
    // MVP fallback: do nothing
    return { ok: true, posted: false, reason: "no_mr_found", pipelineId };
  }

  // Choose the first MR (usually correct for MR pipeline)
  const mr = mrs[0];
  await postMergeRequestNote(projectId, mr.iid, comment);

  return {
    ok: true,
    posted: true,
    mr: { iid: mr.iid, url: mr.web_url },
    pipelineId,
  };
}
