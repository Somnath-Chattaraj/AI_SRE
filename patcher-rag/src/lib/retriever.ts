import { VectorStore, type CodeChunk } from "./storage.js";

export interface RetrievalResult {
  chunks: CodeChunk[];
  query: string;
}

export interface IncidentReport {
  incident_id: string;
  metric_analyzed: string;
  spike_value?: number;
  failing_service?: string;
  suggested_action?: string;
  status: string;
}

export class Retriever {
  private store: VectorStore;

  constructor(store: VectorStore) {
    this.store = store;
  }

  private extractKeywords(incident: IncidentReport): string {
    const parts = [
      incident.metric_analyzed,
      incident.failing_service ?? "",
      incident.suggested_action ?? "",
    ];
    return parts.filter(Boolean).join(" ");
  }

  async retrieve(
    incident: IncidentReport,
    nResults: number = 5,
  ): Promise<RetrievalResult> {
    const query = this.extractKeywords(incident);
    const chunks = await this.store.query(query, nResults);
    return { chunks, query };
  }
}
