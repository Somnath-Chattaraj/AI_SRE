Integrate the following

Analyze the system health, detect anomalies, classify severity, identify possible root causes, and suggest corrective actions.

📊 Metrics Input
HTTP Status Code: {{probe_http_status_code}}
Success Flag: {{probe_success}} (1 = success, 0 = failure)
Response Time (seconds): {{probe_duration_seconds}}
SSL Enabled: {{probe_http_ssl}}
Response Size (bytes): {{probe_http_content_length}}
🧠 Expected Behavior
Detect anomalies based on:
Non-200/expected HTTP status codes
probe_success = 0
High latency (relative spike or threshold breach)
Sudden drop/spike in response size
SSL issues
Classify severity:
LOW → minor degradation
MEDIUM → partial failure
HIGH → major outage or repeated failures
Identify possible root cause:
Examples:
Service crash
Deployment issue
Network failure
SSL misconfiguration
Backend dependency failure
Suggest actions:
Choose from:
restart_service
rollback_deployment
scale_up_service
ignore (if transient)
escalate_to_human
Be conservative:
Avoid unnecessary restarts
Prefer verification before destructive actions
📤 Output Format (STRICT JSON)

{
"anomaly": true/false,
"severity": "LOW | MEDIUM | HIGH",
"reason": "short explanation",
"root_cause": "probable cause",
"recommended_action": "restart_service | rollback_deployment | scale_up_service | ignore | escalate_to_human",
"confidence": 0-1
}

⚠️ Rules
If status code >= 500 → HIGH severity
If probe_success = 0 → anomaly = true
If latency spikes significantly → HIGH
If everything normal → anomaly = false
Do NOT hallucinate missing data
Keep reasoning concise
also cross-check everything against the anomaly detection ai.
