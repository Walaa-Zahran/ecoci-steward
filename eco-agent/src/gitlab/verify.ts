// # webhook signature validation
import type { Request } from "express";
import { env } from "../config";

export function verifyGitLabWebhook(req: Request) {
  // GitLab "Secret token" header:
  const token = req.header("X-Gitlab-Token");
  return token && token === env.GITLAB_WEBHOOK_TOKEN;
}
