import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA

# Ensure your API key is set in your environment variables before running
os.environ["GOOGLE_API_KEY"] = ""

print("🔍 Initializing Autonomous SRE Agent...")

# 1. Connect to the Vector Database (The AI's memory)
# Note: Using the exact same embedding model you used to build the index
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001") 
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)

# Configure retriever to fetch the top 2 most relevant files based on the error
retriever = vectorstore.as_retriever(search_kwargs={"k": 2}) 

# 2. Initialize the Gemini LLM (The AI's brain)
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.1) 

# 3. Read the Incident Report
# Looking at your folder structure, we need to go up one level to find the anomaly folder
incident_path = "../Anomaly_Detection/incident_report.json"
try:
    with open(incident_path, "r") as f:
        incident = json.load(f)
        print(f"🚨 Processing Incident: {incident.get('incident_id', 'Unknown')}")
except FileNotFoundError:
    print(f"Error: Could not find {incident_path}. Did you run the anomaly detector?")
    exit()

# 4. Construct the Prompt
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

print("🧠 Searching codebase and generating patch... (This may take a few seconds)")

# 5. Create the Retrieval Chain and Execute
# This automatically takes the prompt, searches the Vector DB, and feeds both to Gemini
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

# 6. Save the Patch
output_file = "patched_utils.js"
with open(output_file, "w") as f:
    f.write(patched_code)

print(f"✅ Patch generated successfully and saved as '{output_file}'!")