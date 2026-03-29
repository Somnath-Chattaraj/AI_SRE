let leakedMemory = [];

export const causeMemoryLeak = (req, res) => {
    console.error("ERROR: Memory leak triggered");
    // Push 10MB of junk data into a global array that is never cleared
    const junkData = Buffer.alloc(10 * 1024 * 1024, 'a');
    leakedMemory.push(junkData);
    res.status(500).send('Memory increased. Server will crash soon.');
};

export const spikeCPU = (req, res) => {
    console.error("FATAL: CPU spike detected, thread locked");
    const start = Date.now();
    // Synchronously block the Node.js event loop for 5 seconds
    while (Date.now() - start < 5000) { }
    res.status(503).send('CPU maxed out. Service temporarily degraded.');
};
