// # server entry
import express from "express";
import { env } from "./config";
import { verifyGitLabWebhook } from "./gitlab/verify";
import { handlePipelineEvent } from "./handlers/pipelineEvent";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/webhooks/gitlab", async (req, res) => {
  try {
    if (!verifyGitLabWebhook(req)) {
      return res
        .status(401)
        .json({ ok: false, error: "invalid_webhook_token" });
    }

    const kind = req.body?.object_kind;
    if (kind !== "pipeline") {
      return res
        .status(200)
        .json({ ok: true, ignored: true, reason: "not_pipeline_event" });
    }

    // just await.
    const result = await handlePipelineEvent(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err);
    return res.status(500).json({
      ok: false,
      error: "server_error",
      detail: String(err?.message || err),
    });
  }
});

app.listen(env.PORT, () => {
  console.log(`EcoCI Steward listening on http://localhost:${env.PORT}`);
});
