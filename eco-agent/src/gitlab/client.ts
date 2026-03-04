// # GitLab REST client wrapper
import { env } from "../config";

type HttpMethod = "GET" | "POST" | "PUT";

async function gitlabFetch<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${env.GITLAB_BASE_URL}/api/v4${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "PRIVATE-TOKEN": env.GITLAB_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `GitLab API error ${res.status} ${res.statusText}: ${text}`,
    );
  }
  return (await res.json()) as T;
}

export type Pipeline = {
  id: number;
  sha: string;
  status: string;
  web_url: string;
  ref: string;
  created_at: string;
  updated_at: string;
  duration?: number | null; // seconds
};

export type Job = {
  id: number;
  name: string;
  status: string;
  stage: string;
  web_url: string;
  duration?: number | null; // seconds
  started_at?: string | null;
  finished_at?: string | null;
  runner?: { id: number; description?: string | null } | null;
  allow_failure?: boolean;
};

export type MergeRequestRef = {
  iid: number;
  id: number;
  title: string;
  web_url: string;
  source_branch: string;
  target_branch: string;
  state: string;
};

export async function getPipeline(projectId: number, pipelineId: number) {
  return gitlabFetch<Pipeline>(
    "GET",
    `/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}`,
  );
}

export async function listPipelineJobs(projectId: number, pipelineId: number) {
  return gitlabFetch<Job[]>(
    "GET",
    `/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/jobs?per_page=100`,
  );
}

export async function listMergeRequestsForCommit(
  projectId: number,
  sha: string,
) {
  return gitlabFetch<MergeRequestRef[]>(
    "GET",
    `/projects/${encodeURIComponent(projectId)}/repository/commits/${encodeURIComponent(sha)}/merge_requests`,
  );
}

export async function postMergeRequestNote(
  projectId: number,
  mrIid: number,
  body: string,
) {
  return gitlabFetch(
    "POST",
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`,
    { body },
  );
}
