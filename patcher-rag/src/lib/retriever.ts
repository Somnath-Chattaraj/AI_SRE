import { VectorStore, type CodeChunk } from "./storage.js";

export interface RetrievalResult {
  chunks: CodeChunk[];
  query: string;
}

// Matches the Prisma Incident model (with service name resolved)
export interface IncidentReport {
  incident_id: string;
  type: string;         // "downtime" | "latency" | "unknown"
  severity: string;     // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description?: string;
  suggested_action?: string;
  serviceName?: string;
}

export class Retriever {
  private store: VectorStore;

  constructor(store: VectorStore) {
    this.store = store;
  }

  private buildQuery(incident: IncidentReport): string {
    const parts = [
      incident.type,
      incident.severity,
      incident.serviceName ?? "",
      incident.description ?? "",
      incident.suggested_action ?? "",
    ];
    return parts.filter(Boolean).join(" ");
  }

  async retrieve(
    incident: IncidentReport,
    nResults: number = 5,
  ): Promise<RetrievalResult> {
    const query = this.buildQuery(incident);
    const chunks = await this.store.query(query, nResults);
    return { chunks, query };
  }
}
