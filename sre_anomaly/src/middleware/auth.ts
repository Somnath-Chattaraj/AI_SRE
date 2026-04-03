import type { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string;
  
  if (!apiKey) {
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  try {
    const user = await UserService.getUserByApiKey(apiKey);
    if (!user) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    res.locals.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to authenticate" });
  }
}
