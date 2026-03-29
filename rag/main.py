import os
from langchain_community.document_loaders.generic import GenericLoader
from langchain_community.document_loaders.parsers import LanguageParser
from langchain_text_splitters import Language
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

# 1. Set your Gemini API Key 
os.environ["GOOGLE_API_KEY"] = ""

print("📂 Loading source code from /src directory...")

# 2. Load all JavaScript files from the src folder
loader = GenericLoader.from_filesystem(
    "../application/src/",
    glob="**/*",
    suffixes=[".js"],
    parser=LanguageParser(language=Language.JS, parser_threshold=500)
)
documents = loader.load()
print(f"Found {len(documents)} code chunks.")

# 3. Initialize the Gemini Embedding Model
# This translates your code into a mathematical vector using Google's models
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

print("🧠 Generating embeddings and building Vector Database...")

# 4. Create and save the Chroma Vector Database locally
vectorstore = Chroma.from_documents(
    documents=documents,
    embedding=embeddings,
    persist_directory="chroma_db"
)

print("✅ Enterprise Vector Database successfully built using Gemini in './chroma_db'!")