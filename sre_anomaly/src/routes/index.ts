import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { ServiceController } from "../controllers/serviceController";
import { IncidentController } from "../controllers/incidentController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Public Routes
router.post("/auth/register", AuthController.register);

// --- Authenticated Routes ---
router.use(authMiddleware);

router.post("/services", ServiceController.addService);
router.get("/services", ServiceController.listServices);
router.delete("/services/:id", ServiceController.deleteService);

router.get("/incidents", IncidentController.listIncidents);

export { router };
