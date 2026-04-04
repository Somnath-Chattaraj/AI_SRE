import { VectorStore, type CodeChunk } from "./storage.js";

export interface RetrievalResult {
  chunks: CodeChunk[];
  query: string;
}

export interface IncidentReport {
  incident_id: string;
  type: string;
  severity: string;
  description?: string;
  suggested_action?: string;
  root_cause?: string;
  http_status_code?: number;
  serviceName?: string;
}

export class Retriever {
  private store: VectorStore;

  constructor(store: VectorStore) {
    this.store = store;
  }

  /**
   * Multi-query retrieval: runs several focused queries in parallel and
   * deduplicates results by chunk ID. More angles → better recall.
   */
  async retrieve(
    incident: IncidentReport,
    nPerQuery: number = 5,
  ): Promise<RetrievalResult> {
    // Build distinct queries from different aspects of the incident
    // Type-specific seed queries — surface code patterns that match the symptom
    const typeQueries: Record<string, string[]> = {
      latency:    ["setTimeout delay sleep blocking wait"],
      http_error: ["fetch url status 500 error throw catch res.status"],
      downtime:   ["fetch url throw uncaught crash res.json error"],
      memory_leak: ["push array map growing unbounded accumulate"],
      cpu_spike:  ["while loop synchronous blocking cpu"],
    };

    const queries = [
      incident.description,
      incident.root_cause,
      incident.suggested_action,
      ...(typeQueries[incident.type] ?? [`${incident.type} error`]),
    ].filter((q): q is string => Boolean(q?.trim()));

    // Run all queries in parallel
    const queryResults = await Promise.all(
      queries.map((q) => this.store.query(q, nPerQuery)),
    );

    // Deduplicate by chunk ID, preserving first-occurrence order
    // (earlier queries are higher signal — description first)
    const seen = new Set<string>();
    const deduped: CodeChunk[] = [];
    for (const chunks of queryResults) {
      for (const chunk of chunks) {
        if (!seen.has(chunk.id)) {
          seen.add(chunk.id);
          deduped.push(chunk);
        }
      }
    }

    return {
      chunks: deduped,
      query: queries[0] ?? incident.type,
    };
  }
}
