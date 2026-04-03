import express from "express";
import { causeMemoryLeak, spikeCPU } from "./utils.js";
import { simulateDatabaseHang } from "./database.js";

const app = express();
const port = process.env.PORT || 3000;

// health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// bug routes
app.get("/bug/leak", causeMemoryLeak);
app.get("/bug/cpu", spikeCPU);
app.get("/bug/latency", simulateDatabaseHang);

app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`);
});