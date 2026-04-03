import express from "express";
import { router } from "./routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use(router);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running with Express on port ${PORT}...`);
});
