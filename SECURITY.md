# Security Guidelines

## API Key Management

**NEVER commit API keys or secrets to the repository!**

### Best Practices

1. **Use Environment Variables**
   - Store API keys in `.env` files (which are gitignored)
   - Use `.env.example` as a template (without real keys)
   - Access keys via `os.getenv()` in Python or `process.env` in TypeScript

2. **Workflow Files**
   - Never hardcode API keys in workflow JSON files
   - Use template placeholders: `{API_KEY_NAME}`
   - Inject keys via Python/TypeScript nodes that read from environment variables

3. **Example: Injecting API Keys**

   **Python Node (before HTTP node):**
   ```python
   import os
   
   def run(input):
       api_key = os.getenv('POLYGON_API_KEY', '')
       return {
           **input,
           'POLYGON_API_KEY': api_key
       }
   ```

   **HTTP Node Config:**
   ```json
   {
     "url": "https://api.example.com/data?apiKey={POLYGON_API_KEY}"
   }
   ```

4. **LLM Nodes**
   - Use `api_key_name` to reference environment variables
   - Or use per-node API key override (stored securely in DB, not in JSON export)
   - Never hardcode keys in workflow JSON

### If You Accidentally Commit a Key

1. **Immediately rotate/revoke the exposed key**
2. **Remove it from git history** (if not yet pushed):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **If already pushed**: Rotate the key and consider using git-secrets or BFG Repo-Cleaner

### Prevention Tools

- Use `.gitignore` to exclude `.env` files
- Use the provided `scripts/pre-commit-check.sh` hook to detect API keys before committing
- Review workflow JSON files before committing
- Use `.env.example` as a template (never commit actual `.env`)

### Installing Pre-commit Hook

To automatically check for API keys before committing:

```bash
# Make the script executable (already done)
chmod +x scripts/pre-commit-check.sh

# Install as git hook
ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit
```

This will block commits that contain potential API keys.

### Environment Variables

Create a `.env` file in the project root (or `api/.env` for backend):

```bash
# Copy from .env.example
cp .env.example .env

# Edit .env and add your actual keys
# NEVER commit this file!
```

