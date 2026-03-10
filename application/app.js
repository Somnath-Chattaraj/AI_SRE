import express from 'express';
const app = express();
const port = 3000;

// A normal, healthy endpoint
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'OK', uptime: process.uptime() });
});

// BUG 1: The Memory Leak (OOM Crash Simulator)
let leakedMemory = [];
app.get('/bug/leak', (req, res) => {
    console.error("ERROR: Memory leak triggered");
    // Push 10MB of junk data into a global array that is never cleared
    const junkData = Buffer.alloc(10 * 1024 * 1024, 'a');
    leakedMemory.push(junkData);
    res.status(500).send('Memory increased. Server will crash soon.');
});

// BUG 2: The CPU Spike (Event Loop Blocker)
app.get('/bug/cpu', (req, res) => {
    console.error("FATAL: CPU spike detected, thread locked");
    const start = Date.now();
    // Synchronously block the Node.js event loop for 5 seconds
    while (Date.now() - start < 5000) { }
    res.status(503).send('CPU maxed out. Service temporarily degraded.');
});

// BUG 3: The Network Latency (Database Hang Simulator)
app.get('/bug/latency', (req, res) => {
    console.warn("WARN: Upstream database connection timeout");
    // Wait 4 seconds before responding
    setTimeout(() => {
        res.status(504).send('Gateway Timeout. Database is locked.');
    }, 4000);
});

app.listen(port, () => {
    console.log(`Buggy microservice listening on port ${port}`);
});