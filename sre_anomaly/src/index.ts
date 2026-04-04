import express from "express";
import { router } from "./routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;


app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.all("/api/auth/*path", toNodeHandler(auth));

app.use(express.json());
app.use(router);

app.listen(PORT, () => {
  console.log(`Server is running with Express on port ${PORT}...`);
});
