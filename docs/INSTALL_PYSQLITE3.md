# Installing pysqlite3 for Vector Database Support

Pedantic2's vector database features require SQLite extension loading support, which the standard Python `sqlite3` module doesn't provide on macOS. This guide covers multiple installation methods.

## Method 1: Build pysqlite3 with Specific SQLite Version (Recommended)

This method builds pysqlite3 against a specific SQLite version, giving you full control and ensuring compatibility. Based on [Simon Willison's guide](https://til.simonwillison.net/sqlite/build-specific-sqlite-pysqlite-macos).

### macOS/Linux

1. **Clone SQLite source**:
   ```bash
   cd /tmp
   git clone https://github.com/sqlite/sqlite
   ```

2. **Check out the version you want** (or use latest):
   ```bash
   cd /tmp/sqlite
   git checkout version-3.45.0  # or latest: git checkout master
   ```

3. **Build SQLite amalgamation**:
   ```bash
   mkdir /tmp/bld
   cd /tmp/bld
   ../sqlite/configure
   make sqlite3.c
   ```

4. **Clone and build pysqlite3**:
   ```bash
   cd /tmp
   git clone https://github.com/coleifer/pysqlite3
   cd pysqlite3
   cp /tmp/bld/sqlite3.c .
   cp /tmp/bld/sqlite3.h .
   python3 setup.py build_static build
   ```

5. **Create a wheel** (optional, for easy installation):
   ```bash
   python3 setup.py bdist_wheel
   ```

6. **Install the wheel**:
   ```bash
   pip install dist/pysqlite3-*.whl
   ```

7. **Verify installation**:
   ```bash
   python3 -c "import pysqlite3 as sqlite3; conn = sqlite3.connect(':memory:'); print('Extension support:', hasattr(conn, 'enable_load_extension')); print('SQLite version:', conn.execute('select sqlite_version()').fetchone()[0])"
   ```
   Should output: `Extension support: True` and your SQLite version.

## Method 2: Quick Install with Homebrew SQLite (macOS)

If you prefer a quicker installation using Homebrew's SQLite:

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

### One-liner Installation (macOS with Homebrew)

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

## Method 3: Using pysqlite3-binary (Easiest, but may have compatibility issues)

The `pysqlite3-binary` package provides pre-built wheels, but may not work on all systems:

```bash
pip install pysqlite3-binary
```

**Note**: This may fail on some macOS systems due to missing extension loading support in the pre-built binaries. If it fails, use Method 1 or Method 2.

## Why This Is Needed

The system SQLite on macOS doesn't include the `sqlite3_enable_load_extension` and `sqlite3_load_extension` functions. To use SQLite extensions like `sqlite-vec` for vector database functionality, you need:

1. A SQLite build with extension loading enabled
2. A Python SQLite module (`pysqlite3`) that links against that SQLite build

**Method 1** (building from source) gives you the most control and ensures compatibility. **Method 2** (Homebrew) is quicker but ties you to Homebrew's SQLite version. **Method 3** (binary) is easiest but may not work on all systems.

## References

- [Building a specific version of SQLite with pysqlite on macOS/Linux](https://til.simonwillison.net/sqlite/build-specific-sqlite-pysqlite-macos) by Simon Willison
- [pysqlite3 GitHub repository](https://github.com/coleifer/pysqlite3)
- [SQLite source code](https://github.com/sqlite/sqlite)

