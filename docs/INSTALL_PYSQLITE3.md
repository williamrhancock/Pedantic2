# Installing pysqlite3 for Vector Database Support

## macOS (with Homebrew)

If you have Homebrew installed (which you do), follow these steps:

1. **Install SQLite via Homebrew** (if not already installed):
   ```bash
   brew install sqlite
   ```

2. **Set environment variables** to point to Homebrew's SQLite:
   ```bash
   export LDFLAGS="-L$(brew --prefix sqlite)/lib"
   export CPPFLAGS="-I$(brew --prefix sqlite)/include"
   ```

3. **Install pysqlite3**:
   ```bash
   pip install pysqlite3
   ```

4. **Verify installation**:
   ```bash
   python3 -c "import pysqlite3 as sqlite3; conn = sqlite3.connect(':memory:'); print('Extension support:', hasattr(conn, 'enable_load_extension'))"
   ```
   Should output: `Extension support: True`

5. **Restart your FastAPI server** for the changes to take effect.

## Alternative: One-liner Installation

```bash
LDFLAGS="-L$(brew --prefix sqlite)/lib" CPPFLAGS="-I$(brew --prefix sqlite)/include" pip install pysqlite3
```

## macOS Security Warning (Gatekeeper)

If you see: *"Apple could not verify 'vec0.dylib' is free of malware"*

This is macOS Gatekeeper blocking the unsigned extension. To allow it:

```bash
# Remove the quarantine attribute
xattr -d com.apple.quarantine /tmp/workflow_files/vec0.dylib
```

If that doesn't work, you may need to allow it in System Settings:
1. Go to **System Settings** → **Privacy & Security**
2. Scroll down to find the blocked file notification
3. Click **"Allow Anyway"**

## Troubleshooting

If you still get errors:
- Make sure you have Xcode Command Line Tools: `xcode-select --install`
- Try upgrading Homebrew SQLite: `brew upgrade sqlite`
- Check that Homebrew SQLite has extension support: `sqlite3 --version` (should show version 3.x)
- For Gatekeeper issues: `xattr -d com.apple.quarantine /tmp/workflow_files/vec0.dylib`

## Why This Is Needed

The system SQLite on macOS doesn't include the `sqlite3_enable_load_extension` and `sqlite3_load_extension` functions. Homebrew's SQLite is compiled with extension support enabled, so we need to link pysqlite3 against it.

