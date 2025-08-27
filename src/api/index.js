import express from "express";

import emojis from "./emojis.js";
import composioWebhook from "./composio/webhook.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/emojis", emojis);
router.use("/composio/webhook", composioWebhook);

export default router;
