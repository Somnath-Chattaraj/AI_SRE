let leakedMemory = [];

export const causeMemoryLeak = (req, res) => {
    console.error("ERROR: Memory leak triggered");
    res.status(500).send('Memory increased. Server will crash soon.');
};

export const spikeCPU = (req, res) => {
    console.error("FATAL: CPU spike detected, thread locked");
    res.status(503).send('CPU maxed out. Service temporarily degraded.');
};