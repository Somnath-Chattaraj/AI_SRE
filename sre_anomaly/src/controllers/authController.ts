import type { Request, Response } from "express";
import { UserService } from "../services/userService";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const user = await UserService.createUser();
      res.status(201).json({ 
        message: "User registered successfully", 
        user: { id: user.id, apiKey: user.apiKey } 
      });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to register user" });
    }
  }
}
