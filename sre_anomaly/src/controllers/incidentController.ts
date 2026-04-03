import type { Request, Response } from "express";
import { IncidentService } from "../services/incidentService";

export class IncidentController {
  static async listIncidents(req: Request, res: Response) {
    try {
      const serviceId = req.query.service_id as string;

      if (!serviceId) {
        res.status(400).json({ error: "service_id query parameter is required" });
        return;
      }

      const user = res.locals.user;
      const incidents = await IncidentService.getIncidentsByServiceId(serviceId, user.id);
      
      res.status(200).json({ incidents });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  }
}
