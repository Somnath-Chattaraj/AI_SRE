import { Router } from "express";
import { ServiceController } from "../controllers/serviceController";
import { IncidentController } from "../controllers/incidentController";
import { MetricsController } from "../controllers/metricsController";
import { AIActionController } from "../controllers/aiActionController";
import { AnomalyLogController } from "../controllers/anomalyLogController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/incidents", IncidentController.createIncident);

router.use(authMiddleware);

router.post("/services", ServiceController.addService);
router.get("/services", ServiceController.listServices);
router.delete("/services/:id", ServiceController.deleteService);

router.get("/services/:id/metrics", MetricsController.getServiceMetrics);
router.get("/services/:id/anomaly-logs", AnomalyLogController.listAnomalyLogs);

router.get("/incidents", IncidentController.listIncidents);

router.get("/ai-actions", AIActionController.listActions);

export { router };
