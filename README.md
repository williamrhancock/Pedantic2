# Visual Agentic Workflow Builder

A complete, fully functional, local-first visual workflow builder for agentic processes. This powerful platform supports both custom code execution and configuration-based operations for building sophisticated automation workflows.

## 🚀 Features

### Core Platform
- 🎨 **Visual Node Editor**: Intuitive React Flow canvas with glassmorphic, color-coded nodes
- 💾 **Auto-save**: Automatic workflow persistence to SQLite database
- 🚀 **Real-time Execution**: Live feedback on node execution status
- 🔗 **Node Connections**: Visual workflow connections with execution flow display
- 📊 **Execution Logs**: Detailed stdout, stderr, and error reporting
- 📤 **Import/Export**: Save and share workflows as JSON files

### Code-Based Nodes
- 🐍 **Python Code Execution**: Execute Python scripts with `restrictedpython` sandboxing
- 🟦 **TypeScript Code Execution**: Run TypeScript code with async support
- 🎛️ **Monaco Editor**: VS Code-quality editing experience

### Configuration-Based Nodes
- 🌐 **HTTP API Calls**: Make requests to external APIs and web services
- 📁 **File Operations**: Read, write, append, delete, and list files
- 🔀 **Conditional Logic**: Smart workflow branching based on data conditions
- 🗄️ **Database Queries**: Execute SQLite queries and database operations
- 🎯 **Template System**: Dynamic data replacement using `{field}` placeholders

### Advanced Features
- 📋 **JSON Configuration Editor**: Live editing with syntax highlighting
- 🎨 **Color-Coded Nodes**: Visual distinction between different node types
- 🔄 **Data Flow Management**: Seamless data passing between nodes
- 🛡️ **Security Controls**: Sandboxed execution with directory restrictions
- 🧩 **Custom Nodes**: Save frequently used node configurations as reusable templates, with import/export
- 🗂️ **DB Maintenance Panel**: Visual database maintenance for workflows and custom nodes (bulk delete, backup, compact)

## System Requirements

### 1. Node.js and Bun
```bash
# Install Node.js 18+ (required for Next.js 15)
# Download from: https://nodejs.org/

# Install Bun (required for TypeScript execution)
curl -fsSL https://bun.sh/install | bash
# Or on Windows with PowerShell:
# powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. Python 3.11+
```bash
# Make sure Python 3.11+ is installed and accessible as 'python'
python --version  # Should show 3.11+

# Install pip if not already installed
python -m ensurepip --upgrade
```

## Quick Start

### 1. Install Dependencies
```bash
# Clone or extract the project, then:
npm install

# This will automatically install Python dependencies via postinstall script
```

### 2. Run the Application
```bash
npm run dev
```

This command starts both:
- Next.js frontend at http://localhost:3000
- FastAPI backend at http://localhost:8000

### 3. Open the Workflow Builder
Navigate to http://localhost:3000 in your browser.

## Manual Installation (if automatic fails)

If the automatic Python dependency installation fails:

```bash
# Navigate to the API directory
cd api

# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Go back to project root
cd ..

# Start the development servers
npm run dev
```

## Architecture

### Frontend (Next.js 15 + TypeScript)
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Node Editor**: React Flow with custom glassmorphic node components
- **Code Editor**: Monaco Editor (VS Code editor)
- **Database**: SQLite via `sqlite3` Node bindings
- **API**: tRPC for type-safe communication

### Backend (FastAPI)
- **Framework**: FastAPI for the execution engine
- **Python Execution**: RestrictedPython for sandboxed code execution
- **TypeScript Execution**: Bun subprocess for TypeScript code
- **Security**: Memory limits, execution timeouts
- **Topological Sorting**: Automatic workflow execution order

### Data Flow
1. User creates workflow visually in the React Flow-based editor
2. Changes auto-save to SQLite database (throttled 1000ms)
3. Execution sends workflow JSON to FastAPI backend
4. Backend topologically sorts nodes and executes in order
5. Real-time status updates flow back to frontend
6. Logs and results display in side panel

## Headless Execution & Scheduling

You can run workflows **headlessly** (without opening the UI) by keeping the servers running and triggering executions via HTTP from scripts or schedulers.

### 1. Start the Servers (Headless-Friendly)

For production / long-running headless usage:

```bash
# Build once
npm run build

# Start Next.js (frontend + tRPC) in production mode
npm run start

# In another terminal, start FastAPI backend
cd api
uvicorn main:app --host 127.0.0.1 --port 8000
```

Keep both processes running (e.g., via `tmux`, `screen`, a service manager, or OS services).

### 2. HTTP Execution API (FastAPI)

The FastAPI backend exposes:

- `POST http://localhost:8000/run`

Request body:

```json
{
  "workflow": {
    "nodes": { /* node graph, as exported from the UI */ },
    "connections": { /* connections map */ }
  }
}
```

Response (simplified):

```json
{
  "status": "success",
  "nodes": [
    {
      "id": "node-id",
      "status": "success",
      "output": {},
      "stdout": "",
      "stderr": "",
      "execution_time": 0.12
    }
  ],
  "total_time": 0.5,
  "error": null
}
```

#### Getting the workflow JSON

From the UI:

1. Use **Export Workflow** in the top toolbar to download a `.json` file.
2. The downloaded JSON contains the `workflow` object your headless scripts should send to `POST /run`.

You can version and store these workflow JSON files alongside your other automation scripts.

### 3. CLI Scripts that Call the HTTP API

You can wrap the HTTP call in simple scripts for each platform. These scripts are what your schedulers will call.

#### macOS / Linux shell script (`run-workflow.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

WORKFLOW_FILE="${1:-/path/to/exported-workflow.json}"

curl -sS -X POST \
  -H "Content-Type: application/json" \
  --data @"${WORKFLOW_FILE}" \
  http://127.0.0.1:8000/run
```

Make it executable:

```bash
chmod +x run-workflow.sh
```

#### Windows PowerShell script (`run-workflow.ps1`)

```powershell
param(
  [string]$WorkflowFile = "C:\path\to\exported-workflow.json"
)

$body = Get-Content -Raw -Path $WorkflowFile
Invoke-RestMethod -Uri "http://127.0.0.1:8000/run" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### 3.1 Helper CLI: `scripts/run-workflow.ts` (by workflow ID)

Instead of managing workflow JSON files, you can run workflows directly **by ID** stored in the DB.

We provide `scripts/run-workflow.ts`, which:

- Calls the Next.js tRPC `getWorkflow` endpoint to load the workflow by ID.
- Sends the `workflow.data` payload to the FastAPI `/run` endpoint.

Prerequisites:

- Servers running:
  - Next.js: `npm run start` (after `npm run build`)
  - FastAPI: `cd api && uvicorn main:app --host 127.0.0.1 --port 8000`
- Install dev deps (including `ts-node`):

```bash
npm install
```

Usage:

```bash
# Default: Next.js at http://127.0.0.1:3000, FastAPI at http://127.0.0.1:8000
npm run run-workflow -- 42

# Optional overrides
WORKFLOW_WEB_URL="http://my-host:3000" \
WORKFLOW_API_URL="http://my-host:8000" \
  npm run run-workflow -- 42
```

You can schedule this command directly in cron / launchd / Task Scheduler instead of the JSON-based scripts if you prefer.

### 4. Scheduling on macOS, Linux, and Windows

Below are **two patterns** per OS:

- **CLI-based**: scheduler calls your shell/PowerShell script.
- **Direct HTTP-based**: scheduler calls `curl`/`Invoke-WebRequest` directly.

#### 4.1 Linux (cron)

Edit crontab:

```bash
crontab -e
```

Run workflow every day at 02:00 using the shell script:

```cron
0 2 * * * /usr/local/bin/run-workflow.sh /opt/workflows/nightly.json >> /var/log/workflow.log 2>&1
```

Direct `curl` example (no script):

```cron
0 3 * * * curl -sS -X POST -H "Content-Type: application/json" --data @/opt/workflows/cleanup.json http://127.0.0.1:8000/run >> /var/log/workflow.log 2>&1
```

#### 4.2 macOS (launchd)

Create a plist file, e.g. `~/Library/LaunchAgents/com.example.workflow.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.example.workflow</string>
    <key>ProgramArguments</key>
    <array>
      <string>/usr/local/bin/run-workflow.sh</string>
      <string>/Users/you/workflows/nightly.json</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key>
      <integer>2</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/you/Library/Logs/workflow.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/you/Library/Logs/workflow.err</string>
  </dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.example.workflow.plist
```

Direct `curl` variant: set `ProgramArguments` to `["/usr/bin/curl", "-sS", "-X", "POST", "-H", "Content-Type: application/json", "--data", "@/Users/you/workflows/nightly.json", "http://127.0.0.1:8000/run"]`.

#### 4.3 Windows (Task Scheduler)

1. Open **Task Scheduler** → **Create Basic Task**.
2. Choose trigger (e.g., daily at 2 AM).
3. **Action**: *Start a program*.
4. Program/script:

   ```text
   powershell.exe
   ```

5. Arguments:

   ```text
   -ExecutionPolicy Bypass -File "C:\path\to\run-workflow.ps1" -WorkflowFile "C:\path\to\nightly.json"
   ```

Direct HTTP example without script:

```powershell
powershell.exe -ExecutionPolicy Bypass -Command ^
  "$body = Get-Content -Raw -Path 'C:\path\to\nightly.json'; ^
   Invoke-RestMethod -Uri 'http://127.0.0.1:8000/run' -Method Post -ContentType 'application/json' -Body $body"
```

### 5. Operational Notes

- Ensure **Next.js** and **FastAPI** servers are running before any scheduled job fires.
- For production, consider running both servers as system services (systemd on Linux, launchd services on macOS, Services on Windows).
- Use the in-app **DB Maintenance** panel to periodically **backup** and **compact** the SQLite database used by headless and UI-driven runs.

## 📚 Documentation

### Getting Started
- **[Main README](README.md)** - Installation, setup, and basic usage
- **[Python Node Guide](HOW_TO_CODE_NODES.md)** - How to write Python code nodes
- **[TypeScript Node Guide](HOW_TO_CODE_TYPESCRIPT_NODES.md)** - How to write TypeScript code nodes
- **[Configuration Node Guide](HOW_TO_CONFIGURE_NODES.md)** - How to configure HTTP, File, Condition, and Database nodes

## Usage

### Available Node Types

#### Code-Based Nodes
- **🐍 Python Nodes** - Execute custom Python scripts ([Guide](HOW_TO_CODE_NODES.md))
- **🟦 TypeScript Nodes** - Execute custom TypeScript code ([Guide](HOW_TO_CODE_TYPESCRIPT_NODES.md))

#### Configuration-Based Nodes ([Configuration Guide](HOW_TO_CONFIGURE_NODES.md))
- **🌐 HTTP API Calls** - Make requests to external APIs with dynamic templates
- **📁 File Operations** - Read, write, and manipulate files with security restrictions
- **🔀 Conditional Logic** - Branch workflows based on data conditions and rules
- **🗄️ Database Queries** - Execute SQLite operations with parameterized queries

### Creating Your First Workflow

1. **Start Node**: Every workflow begins with a Start node (automatically created)

2. **Add Nodes**: Use the toolbar buttons to add different node types:
   - **+ Python** / **+ TypeScript** - Code editor nodes
   - **+ HTTP API** / **+ File Ops** / **+ Condition** / **+ Database** - Configuration nodes

3. **Edit Nodes**: Click on any node to configure it:
   - **Code Nodes**: Monaco editor with syntax highlighting
   - **Config Nodes**: JSON editor with live validation

4. **Drag to Reorder**: Drag nodes vertically to change execution order

5. **Execute**: Click "▶ Execute" to run the entire workflow with real-time logging

### Default Code Templates

**Python Node:**
```python
def run(input):
    # Your code here
    return input
```

**TypeScript Node:**
```typescript
async function run(input: any): Promise<any> {
    // Your code here
    return input;
}
```

### Example Workflows

#### Simple Data Processing
1. **Start** → **Python Code** (generate data) → **TypeScript Code** (analyze data) → **End**

#### API Integration Pipeline
1. **Start** → **HTTP API Call** (fetch data) → **Conditional Logic** (validate response) → **Database Query** (save results) → **File Operations** (log activity) → **End**

#### File Processing Workflow
1. **Start** → **File Operations** (read input) → **Python Code** (process data) → **File Operations** (write output) → **End**

#### User Registration Flow
1. **Start** → **HTTP API Call** (validate email) → **Conditional Logic** (check validation result) → **Database Query** (create user) → **File Operations** (log registration) → **End**

## Development

### Project Structure
```
/
├── api/                    # FastAPI backend
│   ├── main.py            # FastAPI server with execution engine
│   └── requirements.txt   # Python dependencies
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/trpc/      # tRPC API routes
│   │   ├── globals.css    # Global styles including Rete.js
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main page
│   ├── components/        # React components
│   │   ├── nodes/         # Rete.js node components
│   │   └── workflow-builder.tsx  # Main editor component
│   └── lib/               # Utilities and configuration
│       ├── db.ts          # SQLite database setup
│       ├── trpc-provider.tsx  # tRPC client setup
│       └── utils.ts       # Utility functions
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build the Next.js application
- `npm run start` - Start the built application
- `npm run lint` - Run ESLint

### Database

The application uses SQLite with a simple schema:
```sql
CREATE TABLE workflows (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,  -- JSON workflow data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Workflow data is stored as JSON containing:
- `nodes`: Object with node IDs as keys and node data as values
- `connections`: Object with connection IDs as keys and connection data as values

## Security Considerations

### Python Execution
- Uses `restrictedpython` to prevent dangerous operations
- Memory limit: 256MB per execution
- Execution timeout: 5 seconds
- Subprocess isolation

### TypeScript Execution
- Executes in temporary files via Bun subprocess
- Execution timeout: 5 seconds
- Files cleaned up after execution

### Network Security
- Backend only accepts connections from localhost:3000
- CORS configured for local development
- No external API calls in execution environment

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**2. Python dependencies not installed**
```bash
cd api
pip install -r requirements.txt
```

**3. Bun not found**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Add to PATH or restart terminal
```

**4. Port already in use**
```bash
# Kill processes on ports 3000 or 8000
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:8000 | xargs kill -9
```

**5. SQLite database issues**
```bash
# Delete database file to reset
rm data.dev.db
# Restart the application
npm run dev
```

### Performance Tips

1. **Large Workflows**: The editor handles dozens of nodes efficiently
2. **Auto-save**: Saves are throttled to prevent excessive database writes
3. **Monaco Editor**: Code editors are virtualized for performance
4. **Memory**: Python execution is memory-limited to prevent resource exhaustion

## 🔧 Architecture Details

### Security Model

#### Python Execution
- Uses `restrictedpython` to prevent dangerous operations
- Memory limit: 256MB per execution
- Execution timeout: 5 seconds
- Restricted import whitelist

#### File Operations
- All operations restricted to `/tmp/workflow_files/` directory
- UTF-8 encoding support with configurable alternatives
- Automatic directory creation

#### Database Operations
- SQLite-only for security (no external database connections)
- Operations restricted to `/tmp/workflow_dbs/` directory
- Parameterized queries prevent SQL injection

#### HTTP Requests
- Built with aiohttp for async performance
- Configurable timeouts and headers
- Template-based dynamic URL/header/body construction

### Data Flow Architecture

1. **Frontend** (Next.js + tRPC) handles UI and workflow management
2. **Backend** (FastAPI) manages execution engine and node processing
3. **Security Layers** ensure sandboxed, safe code execution
4. **Template System** enables dynamic data flow between nodes
5. **JSON Configuration** provides code-free operation setup

## 🤝 Contributing

This is a complete, extensible platform. To add features:

1. **New Node Types**:
   - Backend: Add execution functions in `/api/simple_main.py`
   - Frontend: Update node types in `/src/components/simple-workflow-builder.tsx`
   - Documentation: Add guides to appropriate HOW_TO_*.md files

2. **Enhanced UI**: Update components in `/src/components/`
3. **Database Features**: Extend schema in `/src/lib/db.ts`
4. **Security**: Modify sandboxing rules in execution functions
5. **Templates**: Enhance placeholder system for more complex data transformations

## License

MIT License - feel free to use this code for any purpose.