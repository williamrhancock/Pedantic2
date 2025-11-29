# Pedantic2: Because Your Workflows Deserve a Snarky Visual Overhaul (Locally, Duh)

![Pedantic2 Banner](https://via.placeholder.com/800x200/FF6B6B/FFFFFF?text=Pedantic2%3A+Local+Agentic+Chaos+Builder)  
*(Imagine a sleek, glassmorphic node graph here, but since we're local-first, draw your own. No cloud crayons required.)*

## 🚀 Tired of Cloud Vampires Sucking Your Data Dry?

Look, we get it: You're a dev with big automation dreams, but the cloud overlords want your firstborn (or at least your credit card) for every ping. Enter **Pedantic2** – the agentic workflow builder that's so stubbornly local, it runs in your bathroom server rack *or* just your laptop. No subscriptions, no vendor lock-in, no "unexpected bill" therapy sessions. Just you, your code, and a visual editor that's prettier than your last breakup.

Why "Pedantic2"? Because the first one was *too* forgiving. This version nags you about timeouts, sandboxes your wild Python dreams, and color-codes your nodes like a passive-aggressive mood ring. Build workflows that fetch APIs, crunch data, branch like a choose-your-own-adventure novel, and log errors without ghosting you.

**TL;DR**: Visual drag-and-drop for agents, code for the masochists, all offline. Deploy? Pfft, as if.

**New in Latest Version**:
- EndLoop nodes for proper ForEach loop termination and data aggregation
- Auto-arrange with aggressive zigzag layout for better connection visibility
- Help icon opens documentation viewer
- Database maintenance panel for workflow/node management
- Custom nodes with export/import support
- Improved execution timeline with real-time status
- Case-insensitive workflow name matching

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
- Markdown Viewer: Auto-detect and render markdown with anchor support.
- HTML Viewer: Auto-detect and render HTML content.
- **Fancy Bits**: 
  - Auto-arrange nodes with intelligent zigzag layout (staggered for visibility)
  - Real-time execution logs (stdout/stderr/errors – the full therapy session)
  - Import/export JSON like you're sharing breakup playlists
  - Help icon opens documentation in markdown viewer
  - Database maintenance panel for cleanup and optimization
  - Custom nodes: Save, reuse, export, and import node templates
  - Lock functionality to prevent accidental edits during execution
  - Save As with overwrite confirmation (case-insensitive workflow names)
  - Execution timeline shows real-time status with timestamps
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

3. **Set up API keys** (required for LLM and external API nodes):
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

**Docker?** Not yet. Pull requests welcome, slacker.

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

**Using API Keys in Workflows:**
- **LLM Nodes**: Use `api_key_name` in config (e.g., `"api_key_name": "OPENROUTER_API_KEY"`) or set per-node override
- **HTTP Nodes**: Use Python node to inject keys from environment: `os.getenv('API_KEY_NAME')` → `{API_KEY_NAME}` placeholder
- **Never hardcode keys** in workflow JSON files - use environment variables instead
- See [SECURITY.md](SECURITY.md) for detailed security guidelines

Headless? POST to `/run` with workflow JSON. Or `npm run run-workflow -- 42` (ID from DB). Schedule it to run while you nap.

## 🧠 Deep Dives (For When READMEs Lie)

- [Do you want to do this the easy way?](docs/WORKFLOW_NODES_GUIDE.md), or the hardway (YOLO).


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

## 🙌 Contributing: Be the Snark You Wish to See

Fork, fix, PR. Tests? Add 'em. Docs? Flesh 'em. Moar nodes? Yes.

## 📄 License: MIT – Steal Responsibly

© William R. Hancock. Use it, abuse it, attribute it. Or don't – karma's a workflow.

## 👋 Say Hi (or Complain)

[@williamrhancock on GitHub](https://github.com/williamrhancock). Issues? File 'em. Stars? Shower 'em. Clouds? Keep walking.

---

*Built with love, snark, and zero VC funding. Because independence > invoices.*
