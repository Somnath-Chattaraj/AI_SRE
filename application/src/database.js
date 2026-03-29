export const simulateDatabaseHang = (req, res) => {
    console.warn("WARN: Upstream database connection timeout");
    // Wait 4 seconds before responding
    setTimeout(() => {
        res.status(504).send('Gateway Timeout. Database is locked.');
    }, 4000);
};
