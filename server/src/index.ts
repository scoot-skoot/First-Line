import express from "express";
import cors from "cors";
import { config } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    keys: {
      gemini: Boolean(config.geminiApiKey),
      elevenlabs: Boolean(config.elevenLabsApiKey),
      backboard: Boolean(config.backboardApiKey),
      database: Boolean(config.databaseUrl),
    },
  });
});

app.listen(config.port, () => {
  console.log(`SteadyLine server on http://localhost:${config.port}`);
});
