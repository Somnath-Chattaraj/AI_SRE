import type { Request, Response } from "express";
import { ServiceService } from "../services/serviceService";
import { updatePrometheusTargets } from "../utils/prometheus";

export class ServiceController {
  static async addService(req: Request, res: Response) {
    try {
      
      const {
        name,
        url_server,
        endpoint,
        url_codebase = "",
      } = req.body as {
        name?: string;
        url_server?: string;
        endpoint?: string;
        url_codebase?: string;
      };

      const serverUrl = url_server || endpoint;

      if (!name || !serverUrl) {
        res.status(400).json({ error: "Service name and server URL (url_server or endpoint) are required" });
        return;
      }

      const user = res.locals.user as { id: string };
      const service = await ServiceService.createService(user.id, name, serverUrl, url_codebase);
      
      
      await updatePrometheusTargets();

      res.status(201).json({ message: "Service added", service });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to add service", details: e.message });
    }
  }

  static async listServices(req: Request, res: Response) {
    try {
      const user = res.locals.user;
      const services = await ServiceService.getServicesByUser(user.id);
      res.status(200).json({ services });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to list services" });
    }
  }

  static async deleteService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = res.locals.user;
      const deleted = await ServiceService.deleteService(id as string, user.id);
      
      if (!deleted) {
         res.status(404).json({ error: "Service not found or unauthorized to delete" });
         return;
      }

      
      await updatePrometheusTargets();

      res.status(200).json({ message: "Service deleted successfully" });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete service" });
    }
  }
}
