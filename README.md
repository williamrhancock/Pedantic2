# Pedantic2: Because Your Workflows Deserve a Snarky Visual Overhaul (Locally, Duh)

![Pedantic2 Main Interface](docs/Pedantic2-main.png)

## 🚀 Tired of Cloud Vampires Sucking Your Data Dry?

Look, we get it: You're a dev with big automation dreams, but the cloud overlords want your firstborn (or at least your credit card) for every ping. Enter **Pedantic2** – the agentic workflow builder that's so stubbornly local, it runs in your bathroom server rack *or* just your laptop. No subscriptions, no vendor lock-in, no "unexpected bill" therapy sessions. Just you, your code, and a visual editor that's prettier than your last breakup.

Why "Pedantic2"? Because the first one was *too* forgiving. This version nags you about timeouts, sandboxes your wild Python dreams, and color-codes your nodes like a passive-aggressive mood ring. Build workflows that fetch APIs, crunch data, branch like a choose-your-own-adventure novel, and log errors without ghosting you.

**TL;DR**: Visual drag-and-drop for agents, code for the masochists, all offline. Deploy? Pfft, as if.

**New in Latest Version**:
- **Skip During Execution**: Mark any node to skip during workflow execution while preserving data flow
- **EndLoop nodes**: Proper ForEach loop termination and data aggregation
- **Auto-arrange**: Column-based layout (5 nodes per column) with special handling for ForEach loops
- **Help icon**: Opens documentation viewer with anchor link support
- **Database maintenance panel**: Workflow/node management, backup, and optimization
- **Custom nodes**: Save, reuse, export, and import node templates
- **HTML Viewer**: Auto-detect and render HTML content (similar to Markdown Viewer)
- **JSON Viewer**: Auto-detect and format JSON with filtered/full view tabs
- **Image Viewer**: Auto-detect and display images (base64, files, URLs) with zoom/pan controls
- **Browser Node**: Playwright automation with headless/headful, stealth mode, session persistence, and multiple output formats
- **OCR Node**: Extract text from images using Tesseract OCR
- **Right-click context menu**: Delete nodes via right-click context menu (prevents accidental deletion)
- **Start/End node timing**: Start node shows execution start time, End node shows total execution duration
- **Improved execution timeline**: Real-time status with execution times
- **Case-insensitive workflow names**: Workflow name matching is now case-insensitive
- **Vector Database Support**: SQLite with sqlite-vec extension for local RAG workflows

## 🎨 What Makes It Tick (Without Needing a Watch)

- **Visual Node Shenanigans**: Drag, drop, connect – React Flow canvas with glassmorphic flair. Nodes glow like they're judging your life choices (green: success; red: "fix your crap").
- **Code Nodes for Showoffs**:
  - **Python**: Sandboxed via RestrictedPython. Write `def run(input): return input + " but snarkier"`. Timeouts? We got 'em, because infinite loops are for amateurs.
  - **TypeScript**: Async via Bun subprocess. `async function run(input): Promise<any> { return input; /* Add your async regret here */ }`. Monaco Editor included – because Notepad++ called, it wants its dignity back.
- **Config Nodes for the Lazy Genius**:
- HTTP calls with templating: `{user_id}`? Boom, dynamic AF.
- File ops (read/write/delete) in `/tmp/workflow_files/` – because your root dir isn't a playground.
- Conditionals: Branch if `data.salty > 10` (spoiler: it always is).
- SQLite queries: Parameterized, because SQL injection is so 2010.
- LLM AI Assistant: Full dialog with provider/model selection, dynamic model fetching, API key management.
- Embedding Node: Generate vector embeddings using sentence-transformers for semantic search and RAG.
- Markdown Viewer: Auto-detect and render markdown with anchor support.
- HTML Viewer: Auto-detect and render HTML content.
- JSON Viewer: Auto-detect and format JSON with filtered/full view tabs and content key selection.
- Image Viewer: Auto-detect and display images (base64, files, URLs) with zoom/pan controls and download.
- Browser Node: Playwright automation with headless/headful toggle, stealth mode, session persistence, wait conditions, and multiple output formats (HTML, screenshot, PDF, JSON).
- Vector Database Support: SQLite with sqlite-vec extension for local vector search (RAG workflows). Requires `pysqlite3-binary` and sqlite-vec extension file.
- **Fancy Bits**: 
  - **Skip During Execution**: Mark nodes to skip during execution (useful for debugging or temporary disabling)
  - Auto-arrange nodes with intelligent zigzag layout (staggered for visibility)
  - Real-time execution logs (stdout/stderr/errors – the full therapy session)
  - Import/export JSON like you're sharing breakup playlists
  - Help icon opens documentation in markdown viewer with anchor link support
  - Database maintenance panel for cleanup, backup, and optimization
  - Custom nodes: Save, reuse, export, and import node templates
  - Lock functionality to prevent accidental edits during execution
  - Save As with overwrite confirmation (case-insensitive workflow names)
  - Execution timeline shows real-time status with execution times
  - ForEach loops with serial/parallel execution and EndLoop aggregation
  - Right-click context menu: Delete nodes via right-click (with confirmation dialog)
  - Start/End node timing: Start node displays "Started: [time]" and End node displays "Completed: [duration]" during execution
- **Headless Mode**: Run via API or CLI. Schedule with cron/launchd/Task Scheduler. Because who needs a UI for 3 AM regrets?
- **Security? We Pretend**: Timeouts, memory caps, localhost-only. Your secrets stay secret... unless you `print(password)` in a Python node. Rookie.

Pro Tip: Custom nodes? Save configs as templates. Reuse that "scrape cat memes" workflow without the shame.

## 🛠️ Installation: Easier Than Explaining GitHub to Your Mom

**Prerequisites** (or suffer the postinstall script's wrath):
- Node.js 18+ ([grab it](https://nodejs.org/))
- Bun ([curl -fsSL https://bun.sh/install | bash](https://bun.sh/) – Windows? PowerShell that noise.)
- Python 3.11+ ([check: python --version](https://www.python.org/); pip upgrade if it's cranky.)

1. Clone this bad boy:
   ```bash
   git clone https://github.com/williamrhancock/Pedantic2.git
   cd Pedantic2
   ```

2. Npm the dependencies (Python deps auto-install, because magic):
   ```bash
   npm install
   ```

3. **Install Python dependencies** (if not auto-installed):
   ```bash
   cd api
   pip install -r requirements.txt
   cd ..
   ```
   
   **Note for Vector Database Support**: The standard Python `sqlite3` module doesn't support loading extensions. For vector database workflows (RAG), you need extension loading support.
   
   **Recommended Method (macOS/Linux)**: Build pysqlite3 from source with a specific SQLite version. See [docs/INSTALL_PYSQLITE3.md](docs/INSTALL_PYSQLITE3.md) for detailed instructions based on [Simon Willison's guide](https://til.simonwillison.net/sqlite/build-specific-sqlite-pysqlite-macos).
   
   **Quick Method (macOS with Homebrew):**
   ```bash
   brew install sqlite
   export LDFLAGS="-L$(brew --prefix sqlite)/lib"
   export CPPFLAGS="-I$(brew --prefix sqlite)/include"
   pip install pysqlite3
   ```
   
   **Linux (Debian/Ubuntu):**
   ```bash
   sudo apt-get install libsqlite3-dev
   pip install pysqlite3
   ```
   
   **Linux (RHEL/CentOS):**
   ```bash
   sudo yum install sqlite-devel
   pip install pysqlite3
   ```
   
   For complete installation instructions, troubleshooting, and alternative methods, see [docs/INSTALL_PYSQLITE3.md](docs/INSTALL_PYSQLITE3.md).
   
   **Alternative**: Try `pysqlite3-binary` first (may not work on all platforms):
   ```bash
   pip install pysqlite3-binary
   ```
   
   After installation, restart the FastAPI server. The code will automatically detect and use the extension-capable sqlite3 module.
   
   **Note**: If extension loading isn't available, regular database operations still work. Only vector database features (sqlite-vec) require extension support.
   
   **Note for Browser Node**: Playwright requires browser binaries to be installed separately:
   ```bash
   pip install playwright
   playwright install
   ```
   The `playwright install` command downloads browser binaries (Chromium, Firefox, WebKit) needed for browser automation. This is a **required step** - the browser node will not work without it.

4. **Set up API keys** (required for LLM and external API nodes):
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your actual API keys
   # Required for LLM nodes: OPENROUTER_API_KEY (or provider-specific keys)
   # Required for stock workflow: POLYGON_API_KEY
   # See .env.example for all available options
   ```
   
   **Important**: Never commit `.env` files! They're gitignored for a reason.

4. Fire it up:
   ```bash
   npm run dev
   ```
   - Frontend: [http://localhost:3000](http://localhost:3000) (ooh, shiny!)
   - Backend: [http://localhost:8000](http://localhost:8000) (the brains, quietly judging)

Manual Python drama? `cd api; python -m venv venv; source venv/bin/activate; pip install -r requirements.txt`. Weep if needed.

## 🐳 Docker (Single-Container, Prod-like)

Prefer containers? There's a single Docker image that runs **both** the Next.js frontend and the FastAPI backend.

**Platform support:**  
- Image is built and tested for **Linux x86_64/amd64** (including Docker Desktop on macOS/Windows using a linux/amd64 engine).  
- Vector DB (sqlite-vec) inside Docker uses the **Linux x86_64 loadable extension** only.  
- Native Linux arm64 (aarch64) containers are **not guaranteed** to have a working sqlite-vec extension yet. Everything else (Browser, OCR, HTTP, LLM, etc.) still works on arm64, but vector search may be disabled or noisy there.

### Build the image

From the repo root:

```bash
docker build -f docker/Dockerfile -t pedantic2 .
```

This will:
- Build the Next.js frontend in a Node builder stage
- Install Python dependencies (FastAPI backend)
- Install Playwright browsers and Tesseract OCR
- Bundle everything into a single runtime image

### Run the container

Minimal run (expects `.env` for API keys in the host working directory):

```bash
docker run --env-file .env -p 3000:3000 pedantic2
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend (inside container): http://localhost:8000 (exposed if you map it)

If you want direct access to the FastAPI API from the host:

```bash
docker run --env-file .env -p 3000:3000 -p 8000:8000 pedantic2
```

### Using docker-compose (optional)

In the `docker/` folder:

```bash
cd docker
docker-compose up --build
```

That will:
- Build the `pedantic2` image from `docker/Dockerfile`
- Start the app as `pedantic2-app`
- Map:
  - `3000:3000` for the frontend
  - `8000:8000` for the API
- Mount volumes:
  - `workflow_files` → `/tmp/workflow_files`
  - `workflow_dbs` → `/tmp/workflow_dbs`

### Notes

- All file operations still live under `/tmp/workflow_files/` **inside the container**. With volumes, that data persists across restarts.
- SQLite DBs live under `/tmp/workflow_dbs/` when using the DB node. Again, volumes keep them around.
- API keys and provider settings are still controlled via environment variables (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, etc.) – never bake secrets into images.


## 📖 Quickstart: From Blank Canvas to "Eureka!" (or "Why Me?")

1. Open localhost:3000. Start node auto-spawns. Lazy much?
2. Toolbar → Add Node:
   - Code? Pick Python/TS, paste snark in Monaco.
   - Config? JSON editor validates your typos live.
3. Drag connections. Data flows like gossip.
4. Hit **Execute**. Watch nodes light up (or explode – logs will tell).
5. Save as JSON. Share with friends who owe you favors.

**Example Workflow: "Procrastinator's API Fetch"**
- Start → HTTP (GET /cats) → Python (`return data + " meow snark"`) → Condition (if funny?) → File Write → End.
- Boom: Local cat facts, zero AWS bills.

**Example Workflow: "Bearer Token Authentication"**
- Start → Prepare Credentials → Authenticate → Extract Token → Use Token in API Request → End.
- Perfect for OAuth2, API key exchange, or username/password authentication. See [Bearer Token Authentication Guide](docs/BEARER_TOKEN_AUTH_GUIDE.md) for details.

**Using API Keys in Workflows:**
- **LLM Nodes**: Use `api_key_name` in config (e.g., `"api_key_name": "OPENROUTER_API_KEY"`) or set per-node override
- **HTTP Nodes**: Use Python node to inject keys from environment: `os.getenv('API_KEY_NAME')` → `{API_KEY_NAME}` placeholder
- **Never hardcode keys** in workflow JSON files - use environment variables instead
- See [SECURITY.md](SECURITY.md) for detailed security guidelines

Headless? POST to `/run` with workflow JSON. Or `npm run run-workflow -- 42` (ID from DB). Schedule it to run while you nap.

## 🧠 Deep Dives (For When READMEs Lie)

- [Complete Workflow Nodes Guide](docs/WORKFLOW_NODES_GUIDE.md) - Detailed documentation for all node types
- [Workflow Examples](docs/WORKFLOW_EXAMPLES.md) - Comprehensive guide to all example workflows
- [LLM Workflow Generation Guide](docs/LLM_WORKFLOW_GENERATION_GUIDE.md) - For LLMs generating workflows (and for wiring up automatic workflow generation)
- [Bearer Token Authentication Guide](docs/BEARER_TOKEN_AUTH_GUIDE.md) - Complete guide to authentication patterns and bearer token workflows

### Using the LLM Workflow Generation Guide for Auto-Generated Workflows

If you want an LLM (or any external tool) to **generate Pedantic2 workflows for you**, point it at  
`docs/LLM_WORKFLOW_GENERATION_GUIDE.md` and tell it to strictly follow that spec.

At a minimum, your prompt to the LLM should say something like:

```text
You are generating workflows for Pedantic2.
Only produce JSON that matches docs/LLM_WORKFLOW_GENERATION_GUIDE.md.
Do not invent new node types or fields.
Always:
- Include exactly one start node and at least one end node
- Ensure every branch reaches an end node
- Add EndLoop after every ForEach loop
- Use unique, descriptive node and connection IDs
Return ONLY valid JSON, no commentary.
```

Then:

1. Paste the generated JSON into the **Import Workflow** dialog in Pedantic2, or  
2. Save it under `docs/examples/` and load it via the UI.

The guide already documents:
- Full JSON schema for workflows
- All node types, fields, and constraints
- Critical rules (EndLoop after ForEach, connection IDs, required nodes)

Treat it as the **single source of truth** for any automated workflow generator.


DB woes? Maintenance panel: Delete, backup, compact. Because SQLite bloat is real.

## 🤖 Architecture: Nerd Flex

- **Frontend**: Next.js 15, React Flow, Tailwind + shadcn/ui. tRPC for chatty vibes.
- **Backend**: FastAPI (Python), Bun (TS exec). SQLite (`data.dev.db`) stores your masterpieces.
- **No Docs Folder?** Shh, it's "embedded" in MDs. Pull requests for a real one? Yes pls.

## ⚠️ Caveats (Because Perfection is Boring)

- File ops locked to `/tmp/workflow_files/`. Escape? PR it.
- Windows? PowerShell everything. Unix envy included.
- Infinite loops? Timeouts slap you. Cry less.
- Prod? Scale your own bathroom rack.

## 🚧 Potential ToDos (Because We're Not Done Yet)

### High-Impact Nodes

**Puppeteer/Chrome DevTools Protocol Node** (lighter alternative to Playwright)

**Email Nodes** (IMAP + SMTP)
- "Watch Inbox" trigger (poll or future webhook)
- "Send Email" with attachments from previous nodes
- "Parse Email" (extract body, attachments, links)
- Instantly enables 70% of real-world business automations.

**WebSocket Client Node**
- Because half the interesting internet now speaks WebSockets (LiveKit, Binance, Twitter Spaces, etc.)

**OCR Node** (Tesseract or Windows OCR / macOS Vision / easyocr)
- Take a screenshot/PDF → extract text. The moment you add this + Browser node = unbeatable.
- ✅ **Already implemented!** (Tesseract OCR)

**Spreadsheet Node** (read/write/manipulate XLSX, CSV, Google Sheets local cache)
- Built-in Pandas mini-mode: filter, pivot, groupby via simple UI
- "Sheet → Rows → ForEach" pattern becomes trivial

**SSH / Remote Command Node**
- Run commands on your VPS, NAS, or Raspberry Pi cluster. Local-first doesn't mean single-machine-only.

**Git Node**
- Clone, commit+push, create PR, read file from repo at tag/branch
- Bonus: "Deploy this workflow to my server" one-click pattern

**Cron / Schedule Trigger Node** (visual cron UI inside the canvas)
- Turns Pedantic2 into a real cron replacement with visual debugging.

**Webhook Trigger Node**
- Expose `http://localhost:3000/webhook/my_cool_trigger` → Start node. Instantly you have Zapier/Make at home.

### Very Spicy But Doable Nodes

**Local LLM Node** (Ollama / llama.cpp / LM Studio / OpenAI-compatible endpoint)
- You already have cloud LLM, but a first-class "pick a local model" node with model auto-discovery would be legendary.

**Audio Transcription Node** (Whisper.cpp or faster-whisper)
- Drop an audio file → get text + timestamps + speaker diarization option.

**Image Generation / Editing Node** (Stable Diffusion Automatic1111 API or ComfyUI API)
- The moment you can chain "describe image with LLaVA → edit prompt → SD" locally, people will tattoo your name somewhere.

**Cache / Memoize Node**
- "Only run this expensive subgraph if inputs changed" with TTL. Saves hours when doing RAG or API calls.

**Merge / Join Node** (SQL-style joins on arrays of objects)
- Currently people do this in Python nodes — giving them a visual join would be chef's kiss.

**Rate Limiter / Throttle Node**
- "Only let max 5 items through per minute" — critical for not getting banned.

**Human-in-the-Loop Node**
- Pauses execution, shows data, waits for user input/approval in the UI (with optional timeout → default branch).

**Telegram / Discord / Slack Bots**
- Send message, wait for reply, react to messages, etc.

**Crypto / Wallet Node**
- Sign transactions, check balances (EVM & Solana). The degen crowd will flood your repo.

**Time Travel / Version Node**
- "Run this workflow as it existed 3 days ago" using the DB history. Mind-bending debugging superpower.

### Small But Annoyingly Missing Quality-of-Life Nodes

- **Delay / Sleep Node** (with "smart delay until next minute/hour" option)
- **Random Node** (random int, choice from list, UUID, fake data)
- **CSV ↔ JSON Converter Node**
- **Regex Extract / Replace Node**
- **JWT Encode/Decode Node**
- **Crypto** (hash, encrypt/decrypt with key from env)

### Niche but Will Make Specific People Cry Tears of Joy

- **Tail File Node** (watch log file like `tail -f`)
- **MQTT Client**
- **Bluetooth LE Scanner**
- **Home Assistant Node**
- **Obsidian Vault Read/Write**

---

*Want to implement one of these? Fork, code, PR. We'll shower you with gratitude (and merge it faster than you can say "local-first").*

## 🙌 Contributing: Be the Snark You Wish to See

Fork, fix, PR. Tests? Add 'em. Docs? Flesh 'em. Moar nodes? Yes.

## License

**Business Source License 1.1** (free for personal & non-commercial use)  
Commercial production use, SaaS, or resale requires a paid license.

→ Details: [LICENSE.md](LICENSE.md) • [Commercial pricing](COMMERCIAL.md)

© William R. Hancock. Use it, abuse it, attribute it. Or don't – karma's a workflow.

## 👋 Say Hi (or Complain)

[@williamrhancock on GitHub](https://github.com/williamrhancock). Issues? File 'em. Stars? Shower 'em. Clouds? Keep walking.

---

*Built with love, snark, and zero VC funding. Because independence > invoices.*
