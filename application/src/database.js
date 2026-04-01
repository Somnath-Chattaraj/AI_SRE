export const simulateDatabaseHang = (req, res) => {
    console.warn("WARN: Upstream database connection timeout");
    res.status(504).send('Gateway Timeout. Database is locked.');
};