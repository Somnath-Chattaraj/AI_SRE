# AI SRE - Autonomous Incident Detection & Auto-Patching System

## Quick Summary

**Purpose**: Autonomous Site Reliability Engineering platform with AI-powered anomaly detection, root cause analysis, and automatic code patching.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Express.js 5, Bun, TypeScript |
| Patcher | Bun, Vercel AI SDK, ChromaDB, Cerebras LLM |
| Database | MongoDB (Prisma) |
| Queue | BullMQ + Redis |
| Monitoring | Prometheus, Blackbox Exporter |
| Orchestration | SuperPlane (event-driven workflows) |

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  Prometheus │
│  (Next.js)  │     │  (Express)  │     │  (Metrics)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────▼─────┐
                    │  BullMQ   │───▶ Anomaly Detection (AI)
                    │  (Redis)  │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  Patcher  │───▶ GitHub PRs
                    │   (RAG)   │
                    └───────────┘
                          ▲
                          │
                    ┌─────┴─────┐
                    │ SuperPlane│───▶ Email Notifications
                    │(Orchestr.)│───▶ GitHub Actions Events
                    └───────────┘
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `web/` | Next.js frontend dashboard |
| `sre_anomaly/` | Express API + anomaly detection worker |
| `patcher-rag/` | RAG-based auto-patching service |
| `superplane/` | SuperPlane canvas configurations |

### Main Features

1. **Service Monitoring** - Prometheus probes services every 15s
2. **Anomaly Detection** - Z-score analysis + LLM validation (70% confidence threshold)
3. **Auto-Patching** - Clone → Index → Retrieve → Generate → Apply → PR
4. **Dashboard** - Real-time metrics, AI activity feed, PR tracking
5. **SuperPlane Integration** - Event-driven orchestration for deployment failures

### Entry Points

| Service | Entry Point | Port |
|---------|-------------|------|
| Frontend | `web/app/layout.tsx` | 3001 |
| Backend API | `sre_anomaly/src/index.ts` | 3000 |
| Queue Worker | `sre_anomaly/src/worker/worker.ts` | - |
| Patcher | `patcher-rag/src/main.ts` | 4000 |
| SuperPlane | `superplane/canvases/` | 3100 |

---

## SuperPlane Integration

SuperPlane provides event-driven workflow orchestration for the AI SRE platform. It monitors GitHub Actions deployment failures and triggers the auto-patching workflow.

### SuperPlane Workflow

```
GitHub Actions ──▶ Webhook ──▶ Filter (Failed?) ──▶ Extract Info
                                                      │
                                                      ▼
                                              Trigger Patcher
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    ▼                                   ▼
                            Email: Patch Started              Email: Patch Failed
```

### Configuration

1. **Environment Variables** (`.env`):
   ```bash
   # SuperPlane
   SUPERPLANE_URL=http://localhost:3100

   # SMTP for email notifications
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USERNAME=your-username
   SMTP_PASSWORD=your-password
   SMTP_FROM=sre-alerts@example.com
   ALERT_EMAIL=team@example.com
   ```

2. **Canvas Configuration**: `superplane/canvases/deployment-failure-patcher.yaml`

### GitHub Webhook Setup

1. Go to your GitHub repository → Settings → Webhooks
2. Add webhook with URL: `http://your-superplane-host:3100/webhook/github-deployment`
3. Content type: `application/json`
4. Events: Select "Workflow runs" only
5. Save webhook

### Starting SuperPlane

```bash
# Start all services including SuperPlane
docker-compose up -d

# Access SuperPlane UI
open http://localhost:3100

# Apply canvas configuration (requires SuperPlane CLI)
superplane canvases create -f superplane/canvases/deployment-failure-patcher.yaml
```

### Canvas Components

| Node | Component | Purpose |
|------|-----------|---------|
| GitHub Deployment Webhook | Webhook | Receives GitHub Actions events |
| Check Deployment Failed | Filter | Filters for failed deployments |
| Extract Incident Info | Transform | Extracts relevant event data |
| Trigger Auto-Patcher | HTTP Request | Calls patcher-rag `/trigger` |
| Send Patch Started Email | SMTP | Notifies team of patch initiation |
| Send Patch Failed Email | SMTP | Notifies team of trigger failure |

---

## Detailed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI SRE Platform                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    OTLP    ┌────────────┐    Prometheus    ┌───────────┐  │
│  │ Node.js      │ ─────────► │   OTLP     │ ◄────────────── │Anomaly    │  │
│  │ Microservice │   Traces   │  Collector │    Metrics      │Detector   │  │
│  │ (Express)    │            │            │                 │(Python)   │  │
│  └──────────────┘            └────────────┘                 └─────┬─────┘  │
│        │                                                      │          │
│        │  /bug/leak, /bug/cpu, /bug/latency                    │          │
│        │                                                      ▼          │
│        │                                              ┌───────────────┐    │
│        │                                              │ patcher-rag   │    │
│        │                                              │   (Node.js)   │    │
│        │                                              └───────┬───────┘    │
│        │                                                      │          │
│        └──────────────────────────────────────────────────────┴──────────┘    │
│                                                     │                       │
│                                                     ▼                       │
│                                            ┌───────────────┐                │
│                                            │ Source Code  │                │
│                                            │ + Git        │                │
│                                            └───────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## High-Level Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          patcher-rag Workflow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. POLL                                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Scan ../Anomaly_Detection/reports/ every 60s                   │     │
│     │  Filter for *.json files NOT ending in .processed.json         │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  2. RETRIEVE                                                                │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  For each new incident:                                        │     │
│     │  - Extract keywords (service name, metric, error type)         │     │
│     │  - Query ChromaDB for relevant code chunks                     │     │
│     │  - Return top-k chunks as context                               │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  3. GENERATE                                                               │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Send to LLM (via OpenRouter):                                  │     │
│     │  - Incident details                                            │     │
│     │  - Retrieved code context                                      │     │
│     │  - Prompt with constraints                                     │     │
│     │  - Get back raw JavaScript code (potentially multi-file)        │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  4. PARSE                                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Parse LLM output for multiple FILE: blocks                     │     │
│     │  Extract:                                                      │     │
│     │  - file path                                                   │     │
│     │  - code content                                                │     │
│     │  - validate syntax                                             │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  5. BACKUP                                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  For each target file:                                          │     │
│     │  - Read current content                                         │     │
│     │  - Save to /tmp/backup-{timestamp}-{filename}                  │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  6. WRITE                                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Write patched code to target files                              │     │
│     │  Handle multi-file patches                                      │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  7. RESTART                                                                │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  - Stop running Node.js process                                 │     │
│     │  - Start fresh process                                          │     │
│     │  - Wait for ready                                               │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  8. COMMIT                                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  git add -A                                                     │     │
│     │  git commit -m "fix: auto-patch INC-XXX"                        │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  9. VERIFY                                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  curl http://localhost:3000/health                              │     │
│     │  Check: status === 200                                         │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐  │
│  │         SUCCESS                 │    │         FAILURE                  │  │
│  │  - Rename report to .processed │    │  - Restore from /tmp/backup/*  │  │
│  │  - Log success                 │    │  - git revert HEAD --no-edit   │  │
│  │  - Continue polling            │    │  - Restart service             │  │
│  │                                 │    │  - Log failure                 │  │
│  └─────────────────────────────────┘    │  - Continue polling           │  │
│                                          └─────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Requirements

**patcher-rag must be deployed ON THE SAME SERVER** as the target application.

### Required Access

| Requirement | Description |
|-------------|-------------|
| **File system write** | Write to source code directory |
| **Process control** | Kill/start Node.js process |
| **Git operations** | Commit, revert with git CLI |
| **Network access** | HTTP to target service health endpoint |
| **Shared storage** | Read access to reports directory |

### Deployment Options

#### Option A: Same VM (Recommended for MVP)

```
┌────────────────────────────────────────┐
│          Production Server              │
│  ┌──────────────────┐                  │
│  │ patcher-rag      │  ← Admin access  │
│  │ (Node.js)        │                  │
│  └────────┬─────────┘                  │
│           │                              │
│  ┌────────▼─────────┐                  │
│  │ application/     │  ← Same server   │
│  │ (Express)       │                  │
│  └──────────────────┘                  │
└────────────────────────────────────────┘
```

```bash
# Install
cd /opt/patcher-rag
npm install

# Run
sudo node src/main.js   # or pm2
```

#### Option B: Docker (Same host)

```bash
docker run -d \
  --name patcher-rag \
  -v $(pwd)/../application/src:/app/src \
  -v $(pwd)/../Anomaly_Detection/reports:/app/reports \
  -e OPENROUTER_API_KEY=xxx \
  -e COHERE_API_KEY=xxx \
  --network host \
  patcher-rag
```

#### Option C: Docker Compose

```yaml
# docker-compose.yml
services:
  patcher-rag:
    build: ./patcher-rag
    volumes:
      - ./application/src:/app/src
      - ./Anomaly_Detection/reports:/app/reports
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - COHERE_API_KEY=${COHERE_API_KEY}
    network_mode: host
    restart: unless-stopped
```

### Required Permissions

```bash
# User must have:
# 1. Write access to source code directory
chown -R $USER:$USER /opt/application/src

# 2. Process management
#    (either sudo or PM2)
sudo npm install -g pm2

# 3. Git config (if not global)
git config --global user.email "sre@local"
git config --global user.name "patcher-rag"
```

### Environment Variables

```bash
# .env (on server)
OPENROUTER_API_KEY=sk-or-xxx
COHERE_API_KEY=xxx

# Paths (absolute)
REPORTS_DIR=/opt/AI_SRE/Anomaly_Detection/reports
SOURCE_CODE_DIR=/opt/AI_SRE/application/src
TARGET_SERVICE_URL=http://localhost:3000
TARGET_SERVICE_NAME=buggy-payment-service

# Service management
SERVICE_COMMAND=npm run start:dev
SERVICE_DIR=/opt/AI_SRE/application
```

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Polling** | Interval-based (configurable, default 60s) |
| **Retrieval** | Semantic search via Chroma + Cohere embeddings |
| **Generation** | LLM generates code via OpenRouter |
| **Multi-file** | Parses multiple FILE: blocks from LLM output |
| **Atomicity** | All-or-nothing: either all files patch or none |
| **Rollback** | Git revert + file restore on failure |
| **Verification** | HTTP health check after restart |
| **Idempotency** | Processed reports renamed, not deleted |

## Project Structure

```
AI_SRE/
├── application/           # Target Node.js microservice
│   └── src/
│       ├── server.js
│       ├── utils.js       # Buggy functions
│       └── database.js    # Buggy functions
│
├── Anomaly_Detection/    # Python anomaly detector
│   └── reports/          # Incident JSON files
│
├── docker/               # Observability stack
│
└── patcher-rag/          # Auto-patching RAG service
    ├── src/
    │   ├── indexer.js    # Code embedding & indexing
    │   ├── patcher.js    # LLM patch generation
    │   ├── retriever.js  # Context retrieval
    │   ├── tools.js      # Callable tools (git, http)
    │   └── main.js       # Polling loop
    └── chroma_db/        # Vector storage
```

---

## patcher-rag Technical Specification

### Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| SDK | Vercel AI SDK |
| LLM Gateway | OpenRouter |
| Embeddings | Cohere |
| Vector DB | Chroma |
| Process Control | child_process, setInterval |

---

### Module: Indexer (`indexer.js`)

**Purpose**: Embed source code into Chroma vector database.

**Function Signature**:
```javascript
// chunkCode(content: string, maxTokens?: number) => Chunk[]
function chunkCode(content, maxTokens = 500)

// indexDirectory(dirPath: string) => Promise<void>
async function indexDirectory(dirPath)

// embedAndStore(chunks: Chunk[]) => Promise<void>
async function embedAndStore(chunks)
```

**Chunking Strategy**:
- Split by AST-aware parsing (or naive line-based for MVP)
- Preserve file path as metadata
- Generate unique ID: `filename-linenumber`
- Overlap: 10 lines between chunks

**Storage**:
- Collection: `source-code`
- Fields: `id`, `document`, `embedding`, `metadata { file, line }`

**CLI**:
```bash
node indexer.js --dir ../application/src
```

---

### Module: Retriever (`retriever.js`)

**Purpose**: Semantic search on indexed code.

**Function Signature**:
```javascript
// query(code: string, k?: number) => RetrievedChunk[]
async function query(code, k = 5)

// getContextForIncident(incident: Incident) => string
async function getContextForIncident(incident)
```

**Query Flow**:
1. Extract keywords from incident (metric name, service name)
2. Embed query using Cohere
3. Chroma similarity search (cosine)
4. Return top-k chunks with source code text

---

### Module: Patcher (`patcher.js`)

**Purpose**: Generate code fix using LLM.

**Function Signature**:
```javascript
// generatePatch(incident: Incident, context: string) => string
async function generatePatch(incident, context)
```

**LLM Config**:
```javascript
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

const model = openrouter.chat('anthropic/claude-3.5-sonnet');
// Fallback: 'meta-llama/llama-3.1-8b-instruct' (free)
```

**Prompt Template**:
```
You are an SRE fixing a bug in a Node.js/Express microservice.

Incident:
- Service: {failing_service}
- Metric: {metric_analyzed}
- Value: {spike_value}

Relevant code:
{context}

Task: Rewrite ONLY the buggy function to fix the issue.
Constraints:
- Keep same function signature
- Use async/await for non-blocking code
- No external dependencies beyond Node.js built-ins
- Output raw JavaScript only, no markdown
```

**Output**: Raw JavaScript code string.

---

### Module: Tools (`tools.js`)

**Purpose**: Callable system utilities for patching workflow.

```javascript
// ====================
// Git Tools
// ====================
function gitCommit(message: string): void
function gitRevert(): void
function gitStatus(): string
function gitDiff(): string

// ====================
// File Tools
// ====================
async function writePatch(filePath: string, code: string): Promise<void>
async function writeMultiplePatches(patches: Patch[]): Promise<void>
function getFileForIncident(incident: Incident): string
function resolveFileFromChunk(chunkId: string): string
function backupFile(filePath: string): void
function restoreFile(filePath: string): void

// ====================
// Service Tools
// ====================
async function healthCheck(url: string): Promise<boolean>
async function restartService(): Promise<void>
async function stopService(): Promise<void>
async function startService(): Promise<void>
function isServiceRunning(): boolean
function getServicePID(): number | null

// ====================
// Parser Tools
// ====================
function parseMultiFilePatch(llmOutput: string): Patch[]
function validatePatchSyntax(code: string): boolean
function extractFunctions(code: string): string[]
```

**Multi-File Patch Handling**:

The LLM may return patches for multiple files. The parser extracts each:

```javascript
// LLM output format:
// FILE: utils.js
// ```javascript
// export const spikeCPU = async (req, res) => { ... }
// ```
// FILE: database.js
// ```javascript
// export const simulateDatabaseHang = async (req, res) => { ... }
// ```

function parseMultiFilePatch(llmOutput) {
  const patches = [];
  const fileBlocks = llmOutput.split(/^FILE: /m);
  
  for (const block of fileBlocks) {
    if (!block.trim()) continue;
    
    const [filename, ...codeParts] = block.split('```');
    const filePath = resolvePath(filename.trim());
    const code = codeParts.join('```').replace(/^javascript\n?/, '').trim();
    
    patches.push({ filePath, code });
  }
  
  return patches;
}

async function writeMultiplePatches(patches) {
  for (const patch of patches) {
    await writePatch(patch.filePath, patch.code);
  }
}
```

**Service Management**:

```javascript
async function restartService() {
  await stopService();
  await sleep(2000);
  await startService();
  await sleep(3000); // Wait for startup
}

async function stopService() {
  const pid = getServicePID();
  if (pid) {
    process.kill(pid, 'SIGTERM');
    await sleep(1000);
    
    // Force kill if still running
    if (isServiceRunning()) {
      process.kill(pid, 'SIGKILL');
    }
  }
}

async function startService() {
  // Fork a child process
  const serviceDir = CONFIG.serviceDir || '../application';
  const child = spawn('npm', ['run', 'start:dev'], {
    cwd: serviceDir,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

function getServicePID() {
  try {
    const result = execSync(`pgrep -f "node.*server.js"`);
    return parseInt(result.toString().trim(), 10);
  } catch {
    return null;
  }
}

function isServiceRunning() {
  const pid = getServicePID();
  if (!pid) return false;
  
  try {
    process.kill(pid, 0); // Signal 0 = check if process exists
    return true;
  } catch {
    return false;
  }
}
```

**Alternative: PM2 Process Manager**

For production, use PM2:

```javascript
async function restartService() {
  execSync('pm2 restart buggy-payment-service');
}

async function startService() {
  execSync('pm2 start npm --name buggy-payment-service -- run start:dev');
}

async function stopService() {
  execSync('pm2 stop buggy-payment-service');
}
```

**Git Workflow**:
```javascript
// Pre-patch backup
git commit --allow-empty -m "backup: before auto-patch ${incident_id}"

// Post-patch
git add -A
git commit -m "fix: auto-patch ${incident_id}"

// On failure
git revert HEAD --no-edit
```

**Health Check**:
```javascript
async function healthCheck(url) {
  const res = await fetch(url);
  return res.status === 200;
}
```

---

### Module: Main Loop (`main.js`)

**Purpose**: Polling and orchestration.

**Config**:
```javascript
const CONFIG = {
  pollInterval: 60000,        // 60 seconds
  reportsDir: '../Anomaly_Detection/reports',
  sourceDir: '../application/src',
  targetUrl: 'http://localhost:3000/health',
  maxRetries: 3
};
```

**Loop**:
```javascript
while (true) {
  const newReports = fs.readdirSync(CONFIG.reportsDir)
    .filter(f => f.endsWith('.json') && !f.includes('.processed'));
  
  for (const report of newReports) {
    await processIncident(report);
  }
  
  await sleep(CONFIG.pollInterval);
}
```

**Process Incident**:
```javascript
async function processIncident(reportPath) {
  const incident = JSON.parse(fs.readFileSync(reportPath));
  
  // 1. Retrieve context
  const context = await retriever.getContextForIncident(incident);
  
  // 2. Generate patch (may span multiple files)
  const llmOutput = await patcher.generatePatch(incident, context);
  
  // 3. Parse multi-file patch
  const patches = tools.parseMultiFilePatch(llmOutput);
  
  // 4. Backup before writing
  for (const patch of patches) {
    tools.backupFile(patch.filePath);
  }
  
  // 5. Write all patches
  await tools.writeMultiplePatches(patches);
  
  // 6. Restart service (if needed for changes to take effect)
  await tools.restartService();
  
  // 7. Commit
  tools.gitCommit(`fix: auto-patch ${incident.incident_id}`);
  
  // 8. Test
  const healthy = await tools.healthCheck(CONFIG.targetUrl);
  
  if (!healthy) {
    // Restore backups
    for (const patch of patches) {
      tools.restoreFile(patch.filePath);
    }
    tools.gitRevert();
    console.log('Patch failed, reverted');
  } else {
    // Mark as processed
    fs.rename(reportPath, reportPath.replace('.json', '.processed.json'));
  }
}
```

---

## Types

```typescript
interface Incident {
  incident_id: string;
  timestamp: string;
  failing_service: string;
  metric_analyzed: string;
  spike_value: number;
  status: 'CRITICAL' | 'WARNING';
  suggested_action: string;
}

interface Chunk {
  id: string;
  text: string;
  file: string;
  line: number;
  embedding: number[];
}

interface Patch {
  filePath: string;
  code: string;
  originalCode?: string;
}

interface Config {
  pollInterval: number;      // ms
  reportsDir: string;
  sourceDir: string;
  targetUrl: string;
  maxRetries: number;
  serviceCommand: string;    // e.g., "npm run start:dev"
  serviceDir: string;
}
```

---

## API Keys

| Service | Env Variable | Free Tier |
|---------|--------------|-----------|
| OpenRouter | `OPENROUTER_API_KEY` | $1 credit |
| Cohere | `COHERE_API_KEY` | 1k reqs/month |

```bash
# .env
OPENROUTER_API_KEY=sk-or-xxx
COHERE_API_KEY=xxx
REPORTS_DIR=../Anomaly_Detection/reports
SOURCE_CODE_DIR=../application/src
TARGET_SERVICE_URL=http://localhost:3000
```

---

## Running

```bash
# 1. Setup
cd patcher-rag
npm install
cp .env.example .env  # Add API keys

# 2. Index source code (one-time)
node src/indexer.js --dir ../application/src

# 3. Run poller
node src/main.js
```

---

## Workflow

```
Incident JSON
     │
     ▼
┌────────────┐     ┌──────────────┐     ┌─────────────┐
│  Retrieve  │────►│   Generate   │────►│   Write     │
│  Context   │     │    Patch     │     │   File      │
└────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                                                ▼
                                         ┌────────────┐
                                         │   Git      │
                                         │   Commit   │
                                         └──────┬─────┘
                                                │
                                                ▼
                                         ┌────────────┐
                                         │  Health    │
                                         │  Check     │
                                         └──────┬─────┘
                                                │
                              ┌─────────────────┴─────────────────┐
                              ▼                                   ▼
                        ┌────────────┐                      ┌────────────┐
                        │   Success │                      │  Revert    │
                        │  (mark    │                      │  (git      │
                        │  done)    │                      │  revert)   │
                        └────────────┘                      └────────────┘
```
