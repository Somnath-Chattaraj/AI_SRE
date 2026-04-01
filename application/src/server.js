import express from "express";
import { causeMemoryLeak, spikeCPU } from "./utils.js";
import { simulateDatabaseHang } from "./database.js";

const app = express();
const port = process.env.PORT || 6969;

// A normal, healthy endpoint
app.get("/health", (req, res) => {
  res.status(200).send({ status: "OK", uptime: process.uptime() });
});

// BUG 1: The Memory Leak (OOM Crash Simulator)
app.get("/bug/leak", causeMemoryLeak);

// BUG 2: The CPU Spike (Event Loop Blocker)
app.get("/bug/cpu", spikeCPU);

// BUG 3: The Network Latency (Database Hang Simulator)
app.get("/bug/latency", simulateDatabaseHang);

app.listen(port, () => {
  console.log(`Buggy microservice listening on port ${port}`);
});
