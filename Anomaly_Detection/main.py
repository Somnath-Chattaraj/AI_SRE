import requests
import json
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
import time

# 1. Configuration
PROMETHEUS_URL = 'http://localhost:9090/api/v1/query_range'

# Look in your Prometheus UI and put the exact metric name here!
# It is likely something like: http_server_duration_milliseconds_count
METRIC_NAME = 'http_server_duration_milliseconds_count' 

print(f"Connecting to Prometheus to fetch: {METRIC_NAME}...")

# 2. Time Window: Fetch the last 1 hour of data, minute by minute
end_time = time.time()
start_time = end_time - 3600 # 1 hour ago
step = '60s' # 1 data point per minute

# 3. The Query
response = requests.get(PROMETHEUS_URL, params={
    'query': METRIC_NAME,
    'start': start_time,
    'end': end_time,
    'step': step
})

data = response.json()

if data['status'] != 'success' or not data['data']['result']:
    print("Failed to fetch data or no data found. Did you trigger some traffic?")
    exit()

# 4. Format the Data for Machine Learning (Pandas DataFrame)
raw_results = data['data']['result'][0]['values']
df = pd.DataFrame(raw_results, columns=['timestamp', 'metric_value'])

# Clean up the formatting
df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
df['metric_value'] = pd.to_numeric(df['metric_value'])

print("\n--- Live Data Successfully Pulled ---")
print(df) # Print the last 10 minutes of data


df['requests_per_min'] = df['metric_value'].diff().fillna(0)

print("\n--- Training AI Model (Isolation Forest) ---")
# Initialize the model
# contamination=0.1 tells the AI we expect roughly 10% of our data to be anomalous
model = IsolationForest(contamination=0.1, random_state=42)

# Fit the model and predict on our rate of change
df['anomaly_score'] = model.fit_predict(df[['requests_per_min']])

# IsolationForest outputs -1 for anomalies and 1 for normal data. Let's make it readable.
df['is_anomaly'] = df['anomaly_score'] == -1

print("\n--- Detection Results ---")
# Filter and show only the anomalies
anomalies = df[df['is_anomaly']]

if anomalies.empty:
    print("✅ System looks healthy. No anomalies detected in this time window.")
    print(df[['timestamp', 'requests_per_min', 'is_anomaly']].tail(5))
else:
    print(f"🚨 ANOMALIES DETECTED! Found {len(anomalies)} suspicious data points.")
    
    # Grab the very last anomaly detected to create a fresh report
    latest_event = anomalies.iloc[-1]
    
    incident_report = {
        "incident_id": f"INC-{int(time.time())}",
        "timestamp": str(latest_event['timestamp']),
        "failing_service": "buggy-payment-service",
        "metric_analyzed": METRIC_NAME,
        "spike_value": float(latest_event['requests_per_min']),
        "status": "CRITICAL",
        "suggested_action": "Analyze source code for blocking operations or leaks."
    }

    # Save the file
    with open("incident_report.json", "w") as f:
        json.dump(incident_report, f, indent=4)
    
    print("📝 Incident Report successfully saved to 'incident_report.json'")
    print(anomalies[['timestamp', 'requests_per_min', 'is_anomaly']].tail(5))