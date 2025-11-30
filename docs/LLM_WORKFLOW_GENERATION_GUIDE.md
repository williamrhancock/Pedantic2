# LLM Workflow Generation Guide for Pedantic2

This guide provides complete specifications for generating valid Pedantic2 workflow JSON. Use this document to understand node types, their inputs/outputs, capabilities, limitations, and how data flows between nodes.

## Table of Contents

1. [Workflow JSON Structure](#workflow-json-structure)
2. [Node Types Overview](#node-types-overview)
3. [Code-Based Nodes](#code-based-nodes)
4. [Configuration-Based Nodes](#configuration-based-nodes)
5. [Control Flow Nodes](#control-flow-nodes)
6. [Data Flow and Variable Passing](#data-flow-and-variable-passing)
7. [Template Placeholders](#template-placeholders)
8. [Complete Workflow Example](#complete-workflow-example)

---

## Workflow JSON Structure

### Top-Level Structure

```json
{
  "format": "pedantic-workflow-v1",
  "metadata": {
    "name": "Workflow Name",
    "description": "Optional description",
    "tags": ["tag1", "tag2"],
    "exportedAt": "ISO 8601 timestamp",
    "version": "1.0.0"
  },
  "workflow": {
    "nodes": {
      "node_id": { /* node definition */ }
    },
    "connections": {
      "connection_id": {
        "source": "source_node_id",
        "target": "target_node_id",
        "sourceOutput": "output",
        "targetInput": "input"
      }
    },
    "metadata": {
      "nodeCount": 5,
      "lastModified": "ISO 8601 timestamp"
    }
  }
}
```

### Node Definition Structure

Every node must have:
- `type`: One of the node types (see below)
- `title`: Display name for the node
- `position`: `{ "x": number, "y": number }` for canvas positioning

Additional fields depend on node type:
- **Code nodes** (Python, TypeScript): `code` (string)
- **Config nodes** (HTTP, File, Condition, Database, LLM, Embedding, Markdown, HTML, ForEach): `config` (object)
- **Start/End nodes**: No additional fields
- **All nodes** (except Start/End): `skipDuringExecution` (boolean, optional) - When `true`, node is skipped during execution

### Connection Structure

Connections define data flow:
- `source`: Node ID that produces output
- `target`: Node ID that receives input
- `sourceOutput`: Always `"output"` (the output handle)
- `targetInput`: Always `"input"` (the input handle)

**CRITICAL**: Every workflow MUST have:
1. Exactly one `start` node
2. At least one `end` node
3. A connection path from `start` to `end`

---

## Node Types Overview

### Available Node Types

| Type | Category | Input | Output | Config Required |
|------|----------|-------|--------|----------------|
| `start` | Control | None | `{}` | No |
| `end` | Control | Any | None | No |
| `python` | Code | Any | Any (dict/primitive) | No (code required) |
| `typescript` | Code | Any | Any (dict/primitive) | No (code required) |
| `http` | Config | Any | HTTP response | Yes |
| `file` | Config | Any | File operation result | Yes |
| `condition` | Config | Any | Condition result | Yes |
| `database` | Config | Any | Query result | Yes |
| `llm` | Config | Any | LLM response | Yes |
| `embedding` | Config | Any | Vector embeddings | Yes |
| `foreach` | Control | Array or dict | Loop results | Yes |
| `endloop` | Control | ForEach results | Aggregated results | No |
| `markdown` | Config | Any | Markdown content | Optional |
| `html` | Config | Any | HTML content | Optional |

**Note**: All nodes (except `start` and `end`) support `skipDuringExecution` property. When set to `true`, the node is skipped during execution and input data is passed through unchanged.

---

## Code-Based Nodes

### Python Node

#### Structure
```json
{
  "type": "python",
  "title": "Node Title",
  "code": "def run(input):\n    # Your code\n    return result",
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Parameter**: `input` (any type - dict, list, string, number, etc.)
- **Source**: Complete output from the previous connected node
- **Access**: Direct access via `input` parameter

#### Output
- **Return Value**: Whatever the `run()` function returns
- **Type**: Can be dict, list, string, number, bool, None
- **Next Node**: Receives the return value as its `input`

#### What Python Nodes CAN Do
✅ Access all standard Python libraries (see allowed modules below)  
✅ Process data transformations  
✅ Generate arrays for ForEach loops  
✅ Call `markdown_to_html()` helper function  
✅ Use datetime, random, json, math, etc.  
✅ Return complex nested structures  

#### What Python Nodes CANNOT Do
❌ Access files outside `/tmp/workflow_files/`  
❌ Make network requests (use HTTP node instead)  
❌ Import arbitrary modules (only whitelisted modules)  
❌ Access system resources (file system, environment variables beyond allowed)  
❌ Execute shell commands  
❌ Access variables from other nodes directly (only via `input` parameter)  

#### Allowed Python Modules
- Core: `json`, `math`, `random`, `datetime`, `time`, `re`, `base64`
- Data: `collections`, `itertools`, `functools`, `operator`, `heapq`, `bisect`
- Timezone: `pytz`, `zoneinfo`
- Processing: `numpy`, `pandas`
- HTTP: `requests`, `urllib`, `urllib.parse`, `urllib.request`, `urllib.error`
- Text: `string`, `textwrap`, `difflib`, `html`, `csv`, `markdown`
- Utilities: `uuid`, `hashlib`, `statistics`, `decimal`, `fractions`, `calendar`, `copy`
- Types: `enum`, `dataclasses`, `typing`, `array`
- Other: `codecs`, `pprint`

#### Special Helper Function
- `markdown_to_html(md_text: str) -> str`: Converts markdown to HTML (uses `markdown` library if available, fallback regex otherwise)

#### Example
```python
def run(input):
    # Process input data
    items = input.get('items', [])
    total = sum(item.get('price', 0) for item in items)
    
    return {
        'items': items,
        'total': total,
        'count': len(items)
    }
```

---

### TypeScript Node

#### Structure
```json
{
  "type": "typescript",
  "title": "Node Title",
  "code": "async function run(input: any): Promise<any> {\n    return result;\n}",
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Parameter**: `input` (any type)
- **Source**: Complete output from the previous connected node
- **Access**: Direct access via `input` parameter

#### Output
- **Return Value**: Promise that resolves to any value
- **Type**: Can be dict, list, string, number, bool, null
- **Next Node**: Receives the resolved value as its `input`

#### What TypeScript Nodes CAN Do
✅ Use async/await  
✅ Access all Node.js built-in modules  
✅ Process data transformations  
✅ Generate arrays for ForEach loops  
✅ Use Date, JSON, Math, etc.  
✅ Return complex nested structures  

#### What TypeScript Nodes CANNOT Do
❌ Access files directly (use File node instead)  
❌ Make HTTP requests (use HTTP node instead)  
❌ Access variables from other nodes directly (only via `input` parameter)  
❌ Use browser-specific APIs (runs in Node.js, not browser)  

#### Example
```typescript
async function run(input: any): Promise<any> {
  const items = input.items || [];
  const total = items.reduce((sum: number, item: any) => 
    sum + (item.price || 0), 0);
  
  return {
    items: items,
    total: total,
    count: items.length,
    processedAt: new Date().toISOString()
  };
}
```

---

## Configuration-Based Nodes

### HTTP Node

#### Structure
```json
{
  "type": "http",
  "title": "HTTP Request",
  "config": {
    "method": "GET",
    "url": "https://api.example.com/data",
    "headers": {},
    "params": {},
    "body": {},
    "timeout": 30
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Source**: Output from previous node
- **Usage**: Template placeholders in `url`, `headers`, `params`, `body` are replaced with input values

#### Output Structure
```json
{
  "status_code": 200,
  "headers": { /* response headers */ },
  "data": { /* parsed JSON or raw text */ },
  "url": "final URL after template replacement",
  "method": "GET"
}
```

#### What HTTP Nodes CAN Do
✅ Make GET, POST, PUT, PATCH, DELETE requests  
✅ Use template placeholders: `{field_name}` in URL, headers, params, body  
✅ Set custom headers and query parameters  
✅ Send JSON body for POST/PUT/PATCH  
✅ Configure timeout (default: 30 seconds)  

#### What HTTP Nodes CANNOT Do
❌ Access local files  
❌ Make requests to localhost-only services (security restriction)  
❌ Use authentication methods beyond headers  
❌ Handle cookies/sessions (stateless requests)  

#### Template Placeholder Example
If previous node outputs:
```json
{ "user_id": 123, "api_token": "abc123" }
```

And HTTP config has:
```json
{
  "url": "https://api.example.com/users/{user_id}",
  "headers": { "Authorization": "Bearer {api_token}" }
}
```

Result:
- URL becomes: `https://api.example.com/users/123`
- Header becomes: `Authorization: Bearer abc123`

---

### File Node

#### Structure
```json
{
  "type": "file",
  "title": "File Operation",
  "config": {
    "operation": "write",
    "path": "filename.txt",
    "content": "File content with {placeholders}",
    "encoding": "utf-8"
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Operations
- `read`: Read file contents
- `write`: Overwrite file (creates if doesn't exist)
- `append`: Append to file (creates if doesn't exist)
- `delete`: Delete file
- `list`: List files in directory

#### Input
- **Source**: Output from previous node
- **Usage**: Template placeholders in `content` are replaced with input values

#### Output Structure

**Read:**
```json
{
  "content": "file contents",
  "path": "/tmp/workflow_files/filename.txt",
  "size": 1024,
  "operation": "read"
}
```

**Write/Append:**
```json
{
  "path": "/tmp/workflow_files/filename.txt",
  "bytes_written": 1024,
  "operation": "write"
}
```

**Delete:**
```json
{
  "path": "/tmp/workflow_files/filename.txt",
  "operation": "delete",
  "success": true
}
```

**List:**
```json
{
  "path": "/tmp/workflow_files",
  "files": ["file1.txt", "file2.txt"],
  "count": 2,
  "operation": "list"
}
```

#### What File Nodes CAN Do
✅ Read/write/append/delete files  
✅ Use template placeholders in content  
✅ Specify encoding (default: utf-8)  
✅ List directory contents  

#### What File Nodes CANNOT Do
❌ Access files outside `/tmp/workflow_files/` (security restriction)  
❌ Create directories (only files)  
❌ Access system files or user home directory  
❌ Use absolute paths outside safe directory  

#### Template Placeholder Example
If previous node outputs:
```json
{ "message": "Hello", "timestamp": "2025-01-01" }
```

And File config has:
```json
{
  "operation": "append",
  "content": "[{timestamp}] {message}\n"
}
```

File will contain: `[2025-01-01] Hello\n`

---

### Condition Node

#### Structure
```json
{
  "type": "condition",
  "title": "Condition Router",
  "config": {
    "type": "if",
    "conditions": [
      {
        "condition": {
          "field": "price",
          "operator": ">=",
          "value": 100
        },
        "output": {
          "route": "high_value",
          "action": "premium_processing",
          "priority": "high"
        }
      }
    ],
    "default": {
      "route": "low_value",
      "action": "basic_processing",
      "priority": "low"
    }
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Source**: Output from previous node
- **Field Access**: Supports nested paths like `metadata.totalValue` (use dot notation)

#### Output Structure
```json
{
  "result": { /* matched condition output or default */ },
  "matched_condition": 0,  // index of matched condition, or null
  "input": { /* original input data */ },
  "condition_type": "if",
  // Fields from result are also flattened to top level:
  "route": "high_value",
  "action": "premium_processing",
  "priority": "high"
}
```

**IMPORTANT**: Fields from `result` are automatically flattened to the top level of the output, making them easily accessible to downstream nodes.

#### Operators
- `==`: Equals
- `!=`: Not equals
- `>`: Greater than
- `<`: Less than
- `>=`: Greater than or equal
- `<=`: Less than or equal
- `contains`: String contains (case-sensitive)
- `exists`: Field exists and is not None/null

#### What Condition Nodes CAN Do
✅ Compare field values with operators  
✅ Access nested fields using dot notation (e.g., `metadata.totalValue`)  
✅ Return different outputs based on conditions  
✅ Handle None/null values gracefully  
✅ Type conversion for numeric comparisons  

#### What Condition Nodes CANNOT Do
❌ Complex boolean logic (AND/OR) - use multiple conditions or Python node  
❌ String pattern matching (regex) - use Python node  
❌ Mathematical operations - use Python node  
❌ Access array elements directly - use Python node to extract first  

#### Nested Field Access Example
If input is:
```json
{
  "item": { "price": 150 },
  "metadata": { "totalValue": 1000 }
}
```

Condition can check:
- `field: "item.price"` → accesses `150`
- `field: "metadata.totalValue"` → accesses `1000`

---

### Database Node

#### Structure
```json
{
  "type": "database",
  "title": "Database Query",
  "config": {
    "operation": "select",
    "query": "SELECT * FROM users WHERE id = ?",
    "params": [123],
    "database": "workflow.db"
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Operations
- `select`: Execute SELECT query, returns array of rows
- `insert`: Execute INSERT query, returns `rows_affected` and `last_row_id`
- `update`: Execute UPDATE query, returns `rows_affected`
- `delete`: Execute DELETE query, returns `rows_affected`
- `create`: Execute CREATE TABLE, returns `table_created: true`

#### Input
- **Source**: Output from previous node
- **Usage**: Template placeholders in `query` are replaced with input values

#### Output Structure

**Select:**
```json
{
  "data": [
    { "id": 1, "name": "John" },
    { "id": 2, "name": "Jane" }
  ],
  "operation": "select",
  "database": "/tmp/workflow_dbs/workflow.db",
  "query": "SELECT * FROM users..."
}
```

**Insert/Update/Delete:**
```json
{
  "data": {
    "rows_affected": 1,
    "last_row_id": 42  // only for insert
  },
  "operation": "insert",
  "database": "/tmp/workflow_dbs/workflow.db",
  "query": "INSERT INTO users..."
}
```

**Create:**
```json
{
  "data": { "table_created": true },
  "operation": "create",
  "database": "/tmp/workflow_dbs/workflow.db",
  "query": "CREATE TABLE..."
}
```

#### What Database Nodes CAN Do
✅ Execute SQLite queries (SELECT, INSERT, UPDATE, DELETE, CREATE)  
✅ Use parameterized queries with `params` array  
✅ Use template placeholders in query strings  
✅ Access multiple databases (each in separate file)  

#### What Database Nodes CANNOT Do
❌ Access databases outside `/tmp/workflow_dbs/` (security restriction)  
❌ Use other database engines (only SQLite)  
❌ Execute multiple statements in one query  
❌ Access system databases  

#### Template Placeholder Example
If previous node outputs:
```json
{ "user_id": 123, "status": "active" }
```

And Database config has:
```json
{
  "query": "SELECT * FROM users WHERE id = {user_id} AND status = '{status}'"
}
```

Query becomes: `SELECT * FROM users WHERE id = 123 AND status = 'active'`

**WARNING**: Always prefer parameterized queries (`?` placeholders with `params` array) over template replacement for security.

#### Extension Loading (sqlite-vec)

Database nodes support loading SQLite extensions for vector search. **Note**: Extension loading requires `pysqlite3` to be installed. See [docs/INSTALL_PYSQLITE3.md](../docs/INSTALL_PYSQLITE3.md) for installation instructions based on [Simon Willison's guide](https://til.simonwillison.net/sqlite/build-specific-sqlite-pysqlite-macos).

```json
{
  "type": "database",
  "title": "Load sqlite-vec Extension",
  "config": {
    "operation": "select",
    "database": "rag_vectors.db",
    "query": "SELECT load_extension('/tmp/workflow_files/vec0.so');"
  }
}
```

**Security**: Only extensions from `/tmp/workflow_files/` with whitelisted filenames (`vec0.so`, `vec0.dylib`, `vec0.dll`) are allowed.

---

### Embedding Node

#### Structure
```json
{
  "type": "embedding",
  "title": "Generate Embeddings",
  "config": {
    "model": "all-MiniLM-L6-v2",
    "input_field": "content",
    "output_field": "embedding",
    "format": "blob"
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Source**: Output from previous node
- **Text Extraction**: 
  - String input: uses directly
  - Dict input: extracts from `input_field` (or first string value)
  - Array input: processes each item

#### Output Structure
```json
{
  "embedding": "<BLOB or array>",
  "embedding_array": [0.123, -0.456, ...],
  "embedding_bytes": "<BLOB>",
  "embedding_dim": 384,
  "text": "original text",
  "input_field": "content"
}
```

#### What Embedding Nodes CAN Do
✅ Generate vector embeddings from text  
✅ Support multiple sentence-transformers models  
✅ Batch process arrays of texts  
✅ Output in BLOB format (for SQLite) or JSON array  
✅ Cache models in memory for performance  

#### What Embedding Nodes CANNOT Do
❌ Generate embeddings for images or non-text data  
❌ Use custom embedding models (must be from sentence-transformers)  
❌ Access conversation history (stateless)  

#### Example
```json
{
  "type": "embedding",
  "config": {
    "model": "all-MiniLM-L6-v2",
    "input_field": "content",
    "output_field": "embedding",
    "format": "blob"
  }
}
```

---

### LLM Node

#### API Key Setup (Required)

Before using LLM nodes, you must configure API keys:

1. **Copy the example environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys to `.env`**:
   ```bash
   # For OpenRouter (supports multiple providers)
   OPENROUTER_API_KEY=sk-or-v1-...
   
   # Or provider-specific keys
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GROQ_API_KEY=gsk_...
   ```

3. **In workflow JSON**, use one of these methods:
   - **Option A**: Use `api_key_name` to reference environment variable:
     ```json
     "api_key_name": "OPENROUTER_API_KEY"
     ```
   - **Option B**: Override per-node with `api_key` (stored in DB, not exported):
     ```json
     "api_key": "sk-..."
     ```

**Important**: Never hardcode API keys in workflow JSON files that will be committed to version control. Always use environment variables or the per-node override (which is stored securely in the database).

#### Structure
```json
{
  "type": "llm",
  "title": "LLM Assistant",
  "config": {
    "provider": "openrouter",
    "model": "openai/gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 1000,
    "system": "You are a helpful assistant.",
    "user": "Analyze this data: {field_name}",
    "api_key_name": "OPENROUTER_API_KEY",
    "base_url": "https://openrouter.ai/api/v1"
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Source**: Output from previous node
- **Usage**: 
  - Template placeholders in `user` prompt are replaced
  - **Entire input is automatically appended as JSON to the user prompt**

#### Output Structure
```json
{
  "content": "LLM response text",
  "model": "openai/gpt-4o-mini",
  "provider": "openrouter",
  "prompt": "Full prompt sent to LLM",
  "tokens_used": 150,
  "finish_reason": "stop"
}
```

#### Providers
- `openrouter`: OpenRouter API (supports many models)
- `openai`: OpenAI API
- `groq`: Groq API
- `together`: Together AI
- `fireworks`: Fireworks AI
- `deepinfra`: DeepInfra
- `perplexity`: Perplexity AI
- `mistral`: Mistral AI
- `ollama`: Local Ollama (requires `ollama_host` in config)

#### What LLM Nodes CAN Do
✅ Call various LLM providers  
✅ Use system and user prompts  
✅ Automatically append upstream input as JSON  
✅ Use template placeholders in prompts  
✅ Configure temperature and max_tokens  
✅ Override API key per-node or use environment variable  

#### What LLM Nodes CANNOT Do
❌ Access conversation history (stateless requests)  
❌ Stream responses (returns complete response)  
❌ Use function calling/tools  
❌ Access files directly (must pass content via input)  

#### Input Appending Behavior
If `user` prompt is: `"Analyze this product: {name}"`

And previous node outputs:
```json
{ "name": "Laptop", "price": 999.99, "category": "Electronics" }
```

The actual prompt sent to LLM becomes:
```
Analyze this product: Laptop
{"name": "Laptop", "price": 999.99, "category": "Electronics"}
```

---

### Markdown Viewer Node

#### Structure
```json
{
  "type": "markdown",
  "title": "Markdown Viewer",
  "config": {
    "content_key": "markdown_report"
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Source**: Output from previous node
- **Behavior**: Automatically detects markdown content in any variable

#### Output Structure
```json
{
  "content": "# Markdown content\n\nThis is **bold**.",
  "detected_key": "markdown_report",
  "content_key": "markdown_report",
  "source": { /* original input */ }
}
```

#### Detection Priority
1. If `content_key` is specified and exists in input → use it
2. Scan all input variables for markdown patterns
3. Try common keys: `content`, `markdown`, `text`, `body`, `message`, `output`, `result`, `markdown_report`
4. If input is a string → check if it's markdown
5. Fallback: convert input to string

#### What Markdown Viewer Nodes CAN Do
✅ Automatically detect markdown in any variable  
✅ Specify preferred key via `content_key`  
✅ Display markdown with full GitHub Flavored Markdown support  
✅ Handle anchor links and cross-document links  

#### What Markdown Viewer Nodes CANNOT Do
❌ Convert other formats to markdown (use Python node)  
❌ Edit markdown content (read-only viewer)  
❌ Access files directly (must receive content via input)  

---

### HTML Viewer Node

#### Structure
```json
{
  "type": "html",
  "title": "HTML Viewer",
  "config": {
    "content_key": "html_report"
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Source**: Output from previous node
- **Behavior**: Automatically detects HTML content in any variable

#### Output Structure
```json
{
  "content": "<h1>HTML content</h1><p>This is HTML.</p>",
  "detected_key": "html_report",
  "content_key": "html_report",
  "source": { /* original input */ }
}
```

#### Detection Priority
1. If `content_key` is specified and exists in input → use it
2. Scan all input variables for HTML patterns
3. Try common keys: `content`, `html`, `html_content`, `body`, `message`, `output`, `result`
4. If input is a string → check if it's HTML
5. Fallback: convert input to string

#### What HTML Viewer Nodes CAN Do
✅ Automatically detect HTML in any variable  
✅ Specify preferred key via `content_key`  
✅ Render HTML with proper styling  
✅ Handle anchor links within HTML  

#### What HTML Viewer Nodes CANNOT Do
❌ Convert markdown to HTML (use Python node with `markdown_to_html()`)  
❌ Edit HTML content (read-only viewer)  
❌ Execute JavaScript in HTML (security restriction)  
❌ Access files directly (must receive content via input)  

---

## Control Flow Nodes

### Start Node

#### Structure
```json
{
  "type": "start",
  "title": "Start",
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- None (workflow entry point)

#### Output
```json
{}
```

#### Rules
- **MUST** have exactly one start node per workflow
- **MUST** be the entry point (no nodes can connect TO start)
- Output is always empty object `{}`

---

### End Node

#### Structure
```json
{
  "type": "end",
  "title": "End",
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- Any (receives output from previous node)

#### Output
- None (workflow termination)

#### Rules
- **MUST** have at least one end node per workflow
- **CAN** have multiple end nodes (multiple termination points)
- Input is discarded (workflow ends)

---

### For Each Loop Node

#### Structure
```json
{
  "type": "foreach",
  "title": "For Each Loop",
  "config": {
    "items": [],
    "execution_mode": "serial",
    "max_concurrency": 5,
    "items_key": "items"
  },
  "position": { "x": 100, "y": 100 }
}
```

#### Input
- **Source**: Output from previous node
- **Expected**: Object containing an array, OR array directly
- **Items Key**: If `items_key` is specified (e.g., `"items"`), extracts `input.items`
- **Direct Array**: If input is an array, uses it directly

#### Output Structure
```json
{
  "results": [
    {
      "item": { /* original item */ },
      "output": { /* sub-workflow output */ },
      "status": "success",
      "error": null,
      "node_executions": [ /* all nodes executed in this iteration */ ]
    }
  ],
  "total_iterations": 3,
  "successful": 2,
  "failed": 1
}
```

#### Execution Modes
- `serial`: Execute iterations one at a time (sequential)
- `parallel`: Execute iterations concurrently (up to `max_concurrency`)

#### Sub-Workflow Behavior
- **Downstream nodes** from ForEach are executed for EACH item
- Each iteration receives the **item itself** as input (replaces entire input)
- Original workflow context is preserved in `_workflow_context` key
- **Sub-workflow continues until an EndLoop node** (not End or another ForEach)
- **CRITICAL**: Every ForEach loop MUST have a corresponding EndLoop node to mark where the loop ends

#### What For Each Nodes CAN Do
✅ Iterate over arrays from input  
✅ Execute downstream nodes for each item  
✅ Run iterations serially or in parallel  
✅ Limit concurrency for parallel execution  
✅ Continue processing even if one iteration fails  
✅ Preserve workflow context via `_workflow_context`  

#### What For Each Nodes CANNOT Do
❌ Access items from other iterations directly  
❌ Modify the original array  
❌ Break/continue loops (always processes all items)  
❌ Work without an EndLoop node (EndLoop is required to mark loop end)  

#### Context Preservation
When inside a ForEach loop, nodes receive:
- **Primary input**: The current item being processed
- **Workflow context**: Available via `input._workflow_context` (contains original workflow-level data)

Example: If Python node needs workflow-level data:
```python
def run(input):
    # Get current item
    item = input if '_workflow_context' not in input else {k: v for k, v in input.items() if k != '_workflow_context'}
    
    # Get workflow context
    context = input.get('_workflow_context', {})
    workflow_id = context.get('workflow_id', 'unknown')
    
    return {
        **item,
        'workflow_id': workflow_id
    }
```

#### Example: Generating Items for ForEach
Python node to generate items:
```python
def run(input):
    items = [
        {"id": 1, "name": "Item 1"},
        {"id": 2, "name": "Item 2"},
        {"id": 3, "name": "Item 3"}
    ]
    return {
        "items": items,
        "total": len(items)
    }
```

ForEach config:
```json
{
  "items_key": "items",
  "execution_mode": "serial",
  "max_concurrency": 1
}
```

**IMPORTANT**: After the ForEach loop, you MUST add an EndLoop node. The EndLoop aggregates all iteration results and passes them to the next node.

---

### End Loop Node

#### Structure
```json
{
  "type": "endloop",
  "title": "End Loop",
  "position": { "x": 100, "y": 100 }
}
```

#### Purpose
The EndLoop node marks the end of a ForEach loop's sub-workflow. It aggregates all iteration results and provides them in a structured format to the next node.

#### Input
- **Source**: Automatically receives aggregated results from the ForEach loop
- **Structure**: Contains all iteration outputs from the ForEach sub-workflow

#### Output Structure
```json
{
  "results": [
    {
      "item": { /* original item */ },
      "output": { /* iteration output */ },
      "status": "success",
      "error": null
    }
  ],
  "aggregated_outputs": [
    { /* successful iteration output 1 */ },
    { /* successful iteration output 2 */ }
  ],
  "items": [ /* original items array */ ],
  "total": 3,
  "successful": 2,
  "failed": 1
}
```

#### Key Fields
- **`aggregated_outputs`**: Array of all successful iteration outputs (use this for processing all results)
- **`results`**: Full results array with status and error information
- **`items`**: Original items that were processed
- **`total`**: Total number of iterations
- **`successful`**: Number of successful iterations
- **`failed`**: Number of failed iterations

#### What EndLoop Nodes CAN Do
✅ Aggregate all ForEach iteration results  
✅ Provide structured output for downstream processing  
✅ Support nested ForEach loops (each ForEach has its own EndLoop)  
✅ Pass complete dataset to next node  

#### What EndLoop Nodes CANNOT Do
❌ Work without a corresponding ForEach node  
❌ Be used outside of a ForEach loop context  
❌ Have configuration (it's a marker node)  

#### Usage Pattern
**Correct Pattern:**
```
ForEach → Node A → Node B → EndLoop → Final Processing Node
```

**Incorrect Pattern (missing EndLoop):**
```
ForEach → Node A → Node B → Final Processing Node  ❌
```

#### Example: Processing Aggregated Results
After EndLoop, a Python node can process all results:
```python
def run(input):
    # Get all successful iteration outputs
    all_results = input.get('aggregated_outputs', [])
    
    # Process all results together
    total = sum(item.get('value', 0) for item in all_results)
    average = total / len(all_results) if all_results else 0
    
    return {
        'processed_items': all_results,
        'total': total,
        'average': average,
        'count': len(all_results)
    }
```

#### Nested Loops
ForEach loops can be nested. Each ForEach must have its own EndLoop:

```
Outer ForEach → Node A → Inner ForEach → Node B → Inner EndLoop → Node C → Outer EndLoop → Final Node
```

Each EndLoop aggregates only its own ForEach's results.

---

## Data Flow and Variable Passing

### How Data Flows

1. **Start Node** → outputs `{}`
2. **Node A** receives `{}` as `input`, processes it, returns `{"field1": "value1"}`
3. **Node B** receives `{"field1": "value1"}` as `input`, processes it, returns `{"field1": "value1", "field2": "value2"}`
4. **End Node** receives final output (discarded)

### Key Rules

✅ **DO**:
- Return complete data structures from code nodes
- Use template placeholders `{field_name}` in config nodes
- Access nested fields using dot notation in conditions: `metadata.totalValue`
- Preserve important data by including it in return values

❌ **DON'T**:
- Assume variables persist between nodes (they don't)
- Try to access variables from non-connected nodes
- Return only partial data (next node won't have access to previous fields unless you include them)

### Merging Data

If you need to preserve data from previous nodes:

**Python:**
```python
def run(input):
    # Preserve existing data
    result = {**input}  # Copy all fields
    
    # Add new fields
    result['new_field'] = 'new_value'
    
    return result
```

**TypeScript:**
```typescript
async function run(input: any): Promise<any> {
  return {
    ...input,  // Preserve existing fields
    newField: 'newValue'  // Add new fields
  };
}
```

### Special Data Keys

- `_workflow_context`: Automatically added by ForEach loops, contains original workflow-level data
- `route`, `action`, `priority`: Automatically preserved through sub-workflows (from Condition nodes)

---

## Template Placeholders

### Where Placeholders Work

Template placeholders `{field_name}` work in:
- HTTP: `url`, `headers`, `params`, `body`
- File: `content` (for write/append operations)
- Database: `query` string
- LLM: `user` and `system` prompts

### How They Work

1. Previous node outputs: `{"user_id": 123, "api_token": "abc"}`
2. Config has: `"url": "https://api.com/users/{user_id}"`
3. Result: `"url": "https://api.com/users/123"`

### Replacement Rules

- **Exact match**: `{field_name}` must exactly match a key in input
- **String conversion**: Values are converted to strings
- **Nested access**: NOT supported in templates (use Python/TypeScript node to extract)
- **Missing fields**: If field doesn't exist, placeholder remains as `{field_name}`

### Example: Complex Template

Previous node outputs:
```json
{
  "user": { "id": 123, "name": "John" },
  "timestamp": "2025-01-01"
}
```

**CANNOT** do: `"url": "https://api.com/users/{user.id}"` ❌

**MUST** do: Use Python node first to extract:
```python
def run(input):
    return {
        "user_id": input["user"]["id"],
        "user_name": input["user"]["name"],
        "timestamp": input["timestamp"]
    }
```

Then template can use: `"url": "https://api.com/users/{user_id}"` ✅

---

## Complete Workflow Example

```json
{
  "format": "pedantic-workflow-v1",
  "metadata": {
    "name": "Example Workflow",
    "description": "Demonstrates all node types",
    "tags": ["example"],
    "exportedAt": "2025-01-01T00:00:00.000Z",
    "version": "1.0.0"
  },
  "workflow": {
    "nodes": {
      "start": {
        "type": "start",
        "title": "Start",
        "position": { "x": 100, "y": 100 }
      },
      "python_gen": {
        "type": "python",
        "title": "Generate Data",
        "code": "def run(input):\n    return {\n        'items': [\n            {'id': 1, 'name': 'Item 1', 'price': 10},\n            {'id': 2, 'name': 'Item 2', 'price': 20}\n        ],\n        'workflow_id': 'WF-001'\n    }",
        "position": { "x": 300, "y": 100 }
      },
      "foreach": {
        "type": "foreach",
        "title": "For Each Loop",
        "config": {
          "items_key": "items",
          "execution_mode": "serial",
          "max_concurrency": 1
        },
        "position": { "x": 500, "y": 100 }
      },
      "llm_analyze": {
        "type": "llm",
        "title": "LLM Analysis",
        "config": {
          "provider": "openrouter",
          "model": "openai/gpt-4o-mini",
          "temperature": 0.7,
          "max_tokens": 200,
          "system": "You are a data analyst.",
          "user": "Analyze item: {name} priced at ${price}",
          "api_key_name": "OPENROUTER_API_KEY"
        },
        "position": { "x": 700, "y": 200 }
      },
      "condition": {
        "type": "condition",
        "title": "Route by Price",
        "config": {
          "type": "if",
          "conditions": [
            {
              "condition": {
                "field": "price",
                "operator": ">=",
                "value": 15
              },
              "output": {
                "route": "high_value",
                "priority": "high"
              }
            }
          ],
          "default": {
            "route": "low_value",
            "priority": "low"
          }
        },
        "position": { "x": 900, "y": 200 }
      },
      "file_save": {
        "type": "file",
        "title": "Save Results",
        "config": {
          "operation": "append",
          "path": "results.txt",
          "content": "Item: {name}, Route: {route}, Priority: {priority}\n",
          "encoding": "utf-8"
        },
        "position": { "x": 1100, "y": 200 }
      },
      "python_final": {
        "type": "python",
        "title": "Final Processing",
        "code": "def run(input):\n    context = input.get('_workflow_context', {})\n    return {\n        'workflow_id': context.get('workflow_id', 'unknown'),\n        'item_processed': input.get('name', 'unknown'),\n        'route': input.get('route', 'unknown')\n    }",
        "position": { "x": 1300, "y": 200 }
      },
      "typescript_format": {
        "type": "typescript",
        "title": "Format Report",
        "code": "async function run(input: any): Promise<any> {\n  const markdown = `# Report\\n\\n- Workflow: ${input.workflow_id}\\n- Item: ${input.item_processed}\\n- Route: ${input.route}`;\n  return {\n    ...input,\n    markdown_report: markdown\n  };\n}",
        "position": { "x": 1500, "y": 200 }
      },
      "python_html": {
        "type": "python",
        "title": "Convert to HTML",
        "code": "def run(input):\n    md = input.get('markdown_report', '')\n    html = markdown_to_html(md)\n    return {\n        ...input,\n        'html_report': html\n    }",
        "position": { "x": 1700, "y": 200 }
      },
      "markdown_viewer": {
        "type": "markdown",
        "title": "View Markdown",
        "config": {
          "content_key": "markdown_report"
        },
        "position": { "x": 1900, "y": 100 }
      },
      "html_viewer": {
        "type": "html",
        "title": "View HTML",
        "config": {
          "content_key": "html_report"
        },
        "position": { "x": 1900, "y": 300 }
      },
      "end": {
        "type": "end",
        "title": "End",
        "position": { "x": 2100, "y": 200 }
      }
    },
    "connections": {
      "start_python_gen": {
        "source": "start",
        "target": "python_gen",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "python_gen_foreach": {
        "source": "python_gen",
        "target": "foreach",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "foreach_llm": {
        "source": "foreach",
        "target": "llm_analyze",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "llm_condition": {
        "source": "llm_analyze",
        "target": "condition",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "condition_file": {
        "source": "condition",
        "target": "file_save",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "file_python_final": {
        "source": "file_save",
        "target": "python_final",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "python_final_typescript": {
        "source": "python_final",
        "target": "typescript_format",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "typescript_python_html": {
        "source": "typescript_format",
        "target": "python_html",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "typescript_markdown": {
        "source": "typescript_format",
        "target": "markdown_viewer",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "python_html_html_viewer": {
        "source": "python_html",
        "target": "html_viewer",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "markdown_end": {
        "source": "markdown_viewer",
        "target": "end",
        "sourceOutput": "output",
        "targetInput": "input"
      },
      "html_end": {
        "source": "html_viewer",
        "target": "end",
        "sourceOutput": "output",
        "targetInput": "input"
      }
    },
    "metadata": {
      "nodeCount": 12,
      "lastModified": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Best Practices for LLM Workflow Generation

### 1. Always Include Required Nodes
- ✅ One `start` node
- ✅ At least one `end` node
- ✅ Valid connection path from start to end

### 2. Use Meaningful Node IDs
- ✅ Use descriptive IDs: `python_data_generator`, `http_fetch_api`, `condition_router`
- ❌ Avoid generic IDs: `node1`, `node2`, `node3`

### 3. Position Nodes Logically
- ✅ Left to right flow: Start (x: 100) → ... → End (x: 2000+)
- ✅ Vertical spacing: y: 100 for main flow, y: 200/300 for branches
- ✅ Increment x by 200-300 for readability

### 4. Handle Data Flow Correctly
- ✅ Return complete data structures from code nodes
- ✅ Use template placeholders in config nodes
- ✅ Preserve important fields when transforming data

### 5. ForEach Loop Considerations
- ✅ Generate array with consistent structure
- ✅ Use `items_key` to specify array location
- ✅ Remember: each iteration receives the item, not the full context
- ✅ Access workflow context via `_workflow_context` if needed
- ✅ **CRITICAL**: Always add an EndLoop node after ForEach sub-workflow
- ✅ Use `aggregated_outputs` from EndLoop to process all results together

### 6. Error Prevention
- ✅ Check field existence before accessing: `input.get('field', default)`
- ✅ Handle None/null values in conditions
- ✅ Use parameterized queries for database operations
- ✅ Validate required config fields are present

### 7. Template Placeholder Safety
- ✅ Only use top-level fields in templates
- ✅ Extract nested fields in Python/TypeScript nodes first
- ✅ Test that fields exist before using in templates

---

## Common Patterns

### Pattern 1: Data Generation → Processing → Output
```
Start → Python (generate) → TypeScript (process) → File (save) → End
```

### Pattern 2: API Fetch → Transform → Condition → Branch
```
Start → HTTP (fetch) → Python (transform) → Condition (route) → [Branch A/B] → End
```

### Pattern 3: Loop Processing
```
Start → Python (generate array) → ForEach → [Process each] → EndLoop → Python (aggregate) → End
```

### Pattern 4: LLM Analysis Chain
```
Start → Python (prepare) → LLM (analyze) → Python (format) → Markdown Viewer → End
```

### Pattern 5: Database Workflow
```
Start → Python (data) → Database (create table) → Database (insert) → Database (select) → End
```

---

## Vector Database and RAG Workflows

Pedantic2 supports local vector databases using SQLite with the sqlite-vec extension, enabling RAG (Retrieval-Augmented Generation) workflows entirely on-device.

### Setup Requirements

1. **Install pysqlite3** (required for extension loading):
   - See [docs/INSTALL_PYSQLITE3.md](../docs/INSTALL_PYSQLITE3.md) for detailed instructions
   - Recommended method: Build from source following [Simon Willison's guide](https://til.simonwillison.net/sqlite/build-specific-sqlite-pysqlite-macos)
   - Quick method (macOS): Use Homebrew SQLite and link pysqlite3 against it

2. **Download sqlite-vec extension**:
   - Visit https://github.com/asg017/sqlite-vec/releases
   - Download platform-specific binary (`vec0.so` for Linux, `vec0.dylib` for macOS, `vec0.dll` for Windows)
   - Place in `/tmp/workflow_files/` directory
   - On macOS, you may need to remove quarantine: `xattr -d com.apple.quarantine /tmp/workflow_files/vec0.dylib`

2. **Install sentence-transformers** (for embedding generation):
   - Already included in `requirements.txt`
   - First execution will download the model (~80MB for `all-MiniLM-L6-v2`)

### RAG Workflow Pattern

**Ingestion Phase:**
```
Start → Python (load documents) → Embedding (generate vectors) → 
Database (create table) → Database (load extension) → Database (create vec table) → 
ForEach (documents) → Database (insert vectors) → EndLoop
```

**Query Phase:**
```
Python (prepare query) → Embedding (embed query) → 
Database (vector search) → Python (format context) → 
LLM (generate answer) → Markdown Viewer → End
```

### Database Extension Loading

Database nodes can securely load SQLite extensions:

```json
{
  "type": "database",
  "config": {
    "operation": "select",
    "database": "rag.db",
    "query": "SELECT load_extension('/tmp/workflow_files/vec0.so');"
  }
}
```

**Security**: Only extensions from `/tmp/workflow_files/` with whitelisted filenames are allowed.

### Embedding Node Usage

```json
{
  "type": "embedding",
  "config": {
    "model": "all-MiniLM-L6-v2",
    "input_field": "content",
    "output_field": "embedding",
    "format": "blob"
  }
}
```

### Vector Search Query

After loading sqlite-vec and creating a virtual table:

```json
{
  "type": "database",
  "config": {
    "operation": "select",
    "database": "rag.db",
    "query": "SELECT rowid, distance, content FROM vec_vectors WHERE embedding MATCH ? LIMIT 5;",
    "params": ["{query_embedding}"]
  }
}
```

### Complete Example

See [Local_RAG_Workflow.json](../Local_RAG_Workflow.json) for a complete RAG workflow implementation.

---

## Validation Checklist

Before generating a workflow, ensure:

- [ ] Exactly one `start` node exists
- [ ] At least one `end` node exists
- [ ] All nodes have unique IDs
- [ ] All nodes have `type`, `title`, and `position`
- [ ] Code nodes have `code` field
- [ ] Config nodes have `config` field
- [ ] All connections reference valid node IDs
- [ ] Connection path exists from start to end
- [ ] ForEach nodes have valid `items_key` or receive array input
- [ ] Every ForEach loop has a corresponding EndLoop node
- [ ] Template placeholders reference existing fields
- [ ] Python code has `def run(input):` function
- [ ] TypeScript code has `async function run(input: any): Promise<any>` function
- [ ] Node positions don't overlap (increment x by 200+)

---

## Summary

This guide provides complete specifications for generating Pedantic2 workflows. Key takeaways:

1. **Data flows one-way**: Each node receives the previous node's output as `input`
2. **Template placeholders**: Use `{field_name}` in config nodes to inject values
3. **Code nodes**: Must define `run(input)` function and return data
4. **ForEach loops**: Execute downstream nodes for each array item, MUST end with EndLoop node
5. **EndLoop nodes**: Aggregate ForEach results and provide `aggregated_outputs` array
6. **Context preservation**: Use `_workflow_context` in ForEach sub-workflows
7. **Security restrictions**: Files limited to `/tmp/workflow_files/`, databases to `/tmp/workflow_dbs/`

Use this guide to generate valid, executable workflows that follow Pedantic2's architecture and constraints.

