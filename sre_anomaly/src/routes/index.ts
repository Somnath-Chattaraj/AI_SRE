import { Router } from "express";
import { ServiceController } from "../controllers/serviceController";
import { IncidentController } from "../controllers/incidentController";
import { MetricsController } from "../controllers/metricsController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// --- All routes require a valid better-auth session ---
router.use(authMiddleware);

router.post("/services", ServiceController.addService);
router.get("/services", ServiceController.listServices);
router.delete("/services/:id", ServiceController.deleteService);

router.get("/services/:id/metrics", MetricsController.getServiceMetrics);

router.get("/incidents", IncidentController.listIncidents);

export { router };
