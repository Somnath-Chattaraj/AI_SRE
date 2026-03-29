import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from dotenv import load_dotenv

load_dotenv()

os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY", "")

print("🔍 Initializing Autonomous SRE Agent...")

# 1. Connect to the Vector Database
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001") 
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 2}) 

# 2. Initialize the Gemini LLM
llm = ChatGoogleGenerativeAI(model="gemini-2.5-Pro", temperature=0.1) 

# 3. Locate the Reports Directory
REPORTS_DIR = "../Anomaly_Detection/reports"

if not os.path.exists(REPORTS_DIR):
    print(f"Error: Could not find directory {REPORTS_DIR}.")
    exit()

# Find all JSON files that haven't been processed yet
incident_files = [f for f in os.listdir(REPORTS_DIR) if f.endswith('.json') and not f.endswith('.processed.json')]

if not incident_files:
    print("✅ No new incident reports found. System is fully patched.")
    exit()

print(f"🚨 Found {len(incident_files)} new incident(s). Starting batch processing...")

# 4. Loop Through Every Report
for filename in incident_files:
    filepath = os.path.join(REPORTS_DIR, filename)
    
    try:
        with open(filepath, "r") as f:
            incident = json.load(f)
            incident_id = incident.get('incident_id', filename.split('.')[0])
            print(f"\n--- Processing {incident_id} ---")
            
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        continue

    # Construct the Prompt
    prompt = f"""
    You are an expert Site Reliability Engineer.
    An automated monitor has detected an anomaly in our Node.js microservices. 

    Here is the incident report:
    {json.dumps(incident, indent=2)}

    Task:
    1. Identify the deliberate bug (e.g., synchronous CPU block, memory leak, or artificial latency) in the provided source code context.
    2. Rewrite the specific failing function to be healthy, asynchronous, and optimized.
    3. Output ONLY the raw patched JavaScript code. Do not include markdown formatting like ```javascript or any conversational explanations.
    """

    print(f"🧠 Searching codebase and generating patch for {incident_id}...")

    # Execute the Retrieval Chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
    )

    response = qa_chain.invoke(prompt)
    patched_code = response["result"].strip()

    # Clean up markdown if the LLM accidentally includes it
    if patched_code.startswith("```"):
        patched_code = "\n".join(patched_code.split("\n")[1:-1])

    # 5. Save the Unique Patch
    output_file = f"patched_code_{incident_id}.js"
    with open(output_file, "w") as f:
        f.write(patched_code)

    print(f"✅ Patch generated successfully and saved as '{output_file}'!")

    # 6. Mark the Report as Processed
    processed_filepath = filepath.replace(".json", ".processed.json")
    os.rename(filepath, processed_filepath)
    print(f"🔒 Marked report {filename} as processed.")

print("\n🎉 Batch processing complete. All incidents addressed!")