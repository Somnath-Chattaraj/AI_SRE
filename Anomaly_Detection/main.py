import requests
import pandas as pd
from datetime import datetime
from sklearn.ensemble import IsolationForest
import time
import json
import os

# 1. Docker-Friendly Configuration
# When running in Docker, it must connect to the container name 'prometheus', not localhost
PROMETHEUS_URL = os.getenv('PROMETHEUS_URL', 'http://prometheus:9090/api/v1/query_range')
METRIC_NAME = 'http_server_duration_milliseconds_count' 

# Directory to save reports (we will mount this to your host machine in Docker)
REPORTS_DIR = '/app/reports'
os.makedirs(REPORTS_DIR, exist_ok=True)

print(f"👁️ Starting Continuous Anomaly Detection on {METRIC_NAME}...")

# Keep track of the last reported anomaly so we don't spam duplicate JSON files
last_reported_time = None

def check_anomalies():
    global last_reported_time
    
    end_time = time.time()
    start_time = end_time - 3600 # Fetch last 1 hour
    step = '60s'

    try:
        response = requests.get(PROMETHEUS_URL, params={
            'query': METRIC_NAME, 'start': start_time, 'end': end_time, 'step': step
        })
        data = response.json()

        if data['status'] != 'success' or not data['data']['result']:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Waiting for traffic data...")
            return

        raw_results = data['data']['result'][0]['values']
        df = pd.DataFrame(raw_results, columns=['timestamp', 'metric_value'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
        df['metric_value'] = pd.to_numeric(df['metric_value'])

        # Calculate rate of change
        df['requests_per_min'] = df['metric_value'].diff().fillna(0)

        # Train AI Model
        model = IsolationForest(contamination=0.1, random_state=42)
        df['anomaly_score'] = model.fit_predict(df[['requests_per_min']])
        df['is_anomaly'] = df['anomaly_score'] == -1

        anomalies = df[df['is_anomaly']]

        if anomalies.empty:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ System healthy. Rate: {df['requests_per_min'].iloc[-1]} req/min")
        else:
            latest_event = anomalies.iloc[-1]
            latest_event_time = latest_event['timestamp']

            # Only generate a report if this is a NEW anomaly we haven't seen yet
            if last_reported_time != latest_event_time:
                timestamp_str = latest_event_time.strftime("%Y%m%d_%H%M%S")
                report_filename = f"incident_{timestamp_str}.json"
                report_path = os.path.join(REPORTS_DIR, report_filename)

                print(f"🚨 NEW ANOMALY DETECTED! Saving {report_filename}...")
                
                incident_report = {
                    "incident_id": f"INC-{timestamp_str}",
                    "timestamp": str(latest_event_time),
                    "failing_service": "buggy-payment-service",
                    "metric_analyzed": METRIC_NAME,
                    "spike_value": float(latest_event['requests_per_min']),
                    "status": "CRITICAL",
                    "suggested_action": "Analyze source code for blocking operations or leaks."
                }

                with open(report_path, "w") as f:
                    json.dump(incident_report, f, indent=4)
                
                last_reported_time = latest_event_time # Update memory so we don't spam
            else:
                 print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Anomaly ongoing, but already reported.")

    except Exception as e:
        print(f"Error connecting to Prometheus: {e}")

# 2. The Continuous Loop
if __name__ == "__main__":
    while True:
        check_anomalies()
        # Sleep for 15 seconds before checking again
        time.sleep(15)