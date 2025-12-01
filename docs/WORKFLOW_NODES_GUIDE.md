# Complete Workflow Nodes Guide

This comprehensive guide covers all node types available in the Visual Agentic Workflow Builder, including code-based nodes, configuration-based nodes, control flow nodes, and advanced features like custom nodes.

## Table of Contents

1. [Introduction](#introduction)
2. [Code-Based Nodes](#code-based-nodes)
   - [Python Nodes](#python-nodes)
   - [TypeScript Nodes](#typescript-nodes)
3. [Configuration-Based Nodes](#configuration-based-nodes)
   - [HTTP API Call Node](#http-api-call-node)
   - [File Operations Node](#file-operations-node)
   - [Markdown Viewer Node](#markdown-viewer-node)
   - [HTML Viewer Node](#html-viewer-node)
   - [Conditional Logic Node](#conditional-logic-node)
   - [Database Query Node](#database-query-node)
   - [Embedding Node](#embedding-node)
   - [LLM AI Assistant Node](#llm-ai-assistant-node)
4. [Control Flow Nodes](#control-flow-nodes)
   - [For Each Loop Node](#for-each-loop-node)
5. [Custom Nodes](#custom-nodes)
6. [Best Practices](#best-practices)
7. [Complete Examples](#complete-examples)

---

## Introduction

The Visual Agentic Workflow Builder supports multiple node types for building sophisticated automation workflows:

### Node Categories

**Code-Based Nodes** (write custom code):
- 🐍 **Python Nodes** - Execute Python scripts with restricted environment
- 🟦 **TypeScript Nodes** - Execute TypeScript/JavaScript with async support

**Configuration-Based Nodes** (configure via JSON):
- 🌐 **HTTP API Calls** - Make requests to external APIs and web services
- 📁 **File Operations** - Read, write, and manipulate files
- 📄 **Markdown Viewer** - Display markdown content from upstream nodes
- 🌐 **HTML Viewer** - Display HTML content from upstream nodes
- 🔀 **Conditional Logic** - Branch workflows based on data conditions
- 🗄️ **Database Queries** - Execute SQLite queries and operations
- 🤖 **LLM AI Assistant** - Integrate large language models into workflows

**Control Flow Nodes**:
- ▶️ **Start Node** - Begin workflow execution
- ⏹️ **End Node** - Complete workflow execution
- 🔄 **For Each Loop** - Iterate over arrays with serial or parallel execution
- 🔁 **End Loop** - Marks the end of a ForEach loop and aggregates results

### Skip During Execution

Any node (except Start and End) can be marked to **Skip During Execution**. When enabled:
- The node is **not executed** during workflow run
- Input data is **passed through unchanged** to downstream nodes
- The node displays a **yellow badge** indicator on the canvas
- Useful for debugging, temporarily disabling nodes, or testing workflow paths

**How to Enable:**
1. Open the node editor
2. Check the "Skip During Execution" checkbox
3. Save the node

**Use Cases:**
- Debugging: Skip problematic nodes to test other parts of the workflow
- Feature flags: Temporarily disable features without deleting nodes
- Testing: Test alternative execution paths
- Performance: Skip expensive operations during development

### Data Flow Between Nodes

#### ✅ What You Can Access
- **`input` parameter**: Contains the complete output from the previous node
- **Return value**: What you return becomes the input for the next node

#### ❌ What You Cannot Access
- Local variables from previous nodes
- Imported modules from previous nodes
- Function definitions from previous nodes

### Template Placeholders

Many configuration-based nodes support dynamic template replacement using `{field_name}` placeholders. These are replaced with actual values from the previous node's output:

```json
{
  "url": "https://api.example.com/users/{user_id}",
  "headers": {
    "Authorization": "Bearer {api_token}"
  }
}
```

If the previous node outputs:
```json
{
  "user_id": 123,
  "api_token": "abc123"
}
```

The placeholders are replaced with actual values.

---

## Code-Based Nodes

### Python Nodes

#### Basic Structure

Every Python node must define a `run()` function that takes an `input` parameter and returns data:

```python
def run(input):
    # Your code here
    return {"result": "your output"}
```

#### Example: Basic Data Processing

```python
def run(input):
    # Access data from previous node
    message = input.get('message', 'No message')
    
    # Process the data
    processed = f"Processed: {message}"
    
    # Return data for next node
    return {
        "processed_message": processed,
        "original_input": input,
        "timestamp": "2025-11-27"
    }
```

#### Example: Data Manipulation

```python
def run(input):
    # Extract data from input
    numbers = input.get('numbers', [1, 2, 3, 4, 5])
    
    # Process data
    total = sum(numbers)
    average = total / len(numbers) if numbers else 0
    maximum = max(numbers) if numbers else 0
    minimum = min(numbers) if numbers else 0
    
    return {
        "numbers": numbers,
        "total": total,
        "average": average,
        "max": maximum,
        "min": minimum,
        "count": len(numbers)
    }
```

#### Example: Working with Time Zones

```python
from datetime import datetime
import pytz

def run(input):
    # Use input as timezone if provided, otherwise default
    tz_name = input.get('timezone', 'America/New_York')
    
    # Validate timezone
    try:
        tz = pytz.timezone(tz_name)
    except:
        tz = pytz.timezone('UTC')  # fallback
    
    # Get current time in specified zone
    now = datetime.now(tz)
    
    return {
        "local_time": now.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "iso_time": now.isoformat(),
        "unix_timestamp": int(now.timestamp()),
        "unix_ms": int(now.timestamp() * 1000),
        "timezone": str(tz)
    }
```

#### Example: Working with External APIs

```python
import requests
import json

def run(input):
    # Get URL from input or use default
    url = input.get('url', 'https://api.github.com/users/octocat')
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "data": data,
            "status_code": response.status_code,
            "url": url
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "url": url
        }
```

#### Available Python Modules

The following modules are available for import:
- **Core**: `json`, `math`, `random`, `datetime`, `time`, `re`, `base64`
- **Data structures**: `collections`, `itertools`, `functools`, `operator`, `heapq`, `bisect`
- **Timezone**: `pytz`, `zoneinfo`
- **Data processing**: `numpy`, `pandas`
- **HTTP**: `requests`, `urllib`, `urllib.parse`, `urllib.request`, `urllib.error`
- **Text**: `string`, `textwrap`, `difflib`, `html`, `csv`
- **Utilities**: `uuid`, `hashlib`, `statistics`, `decimal`, `fractions`, `calendar`, `copy`
- **Types**: `enum`, `dataclasses`, `typing`, `array`
- **Other**: `codecs`, `pprint`

#### Example: Generating Array for For Each Loop

```python
def run(input):
    years = [
        {"year": "1000"},
        {"year": "1200"},
        {"year": "1400"}
    ]
    return {
        "items": years,
        "total": len(years)
    }
```

This output can be consumed by a For Each Loop node using `items_key: "items"`.

---

### TypeScript Nodes

#### Basic Structure

Every TypeScript node must define an async `run()` function that takes an `input` parameter and returns a Promise:

```typescript
async function run(input: any): Promise<any> {
    // Your code here
    return { result: "your output" };
}
```

#### Type Definitions

For better type safety, define interfaces for your input and output:

```typescript
interface InputData {
    message?: string;
    userId?: number;
    timestamp?: string;
}

interface OutputData {
    processedMessage: string;
    userId: number;
    processedAt: string;
}

async function run(input: InputData): Promise<OutputData> {
    const message = input.message || 'No message provided';
    const userId = input.userId || 0;
    
    return {
        processedMessage: `Processed: ${message}`,
        userId: userId,
        processedAt: new Date().toISOString()
    };
}
```

#### Example: Basic Data Processing

```typescript
interface UserInput {
    name?: string;
    age?: number;
    email?: string;
}

interface ProcessedUser {
    name: string;
    age: number;
    email: string;
    isAdult: boolean;
    domain: string;
    processedAt: string;
}

async function run(input: UserInput): Promise<ProcessedUser> {
    // Extract and validate input
    const name = input.name || 'Unknown';
    const age = input.age || 0;
    const email = input.email || 'no-email@example.com';
    
    // Process the data
    const isAdult = age >= 18;
    const domain = email.split('@')[1] || 'unknown';
    
    return {
        name: name.trim(),
        age: age,
        email: email.toLowerCase(),
        isAdult: isAdult,
        domain: domain,
        processedAt: new Date().toISOString()
    };
}
```

#### Example: Working with APIs

```typescript
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode?: number;
}

async function run(input: any): Promise<ApiResponse<any>> {
    const url = input.url || 'https://jsonplaceholder.typicode.com/posts/1';
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Workflow-Bot/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            success: true,
            data: data,
            statusCode: response.status
        };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: 0
        };
    }
}
```

#### Example: Array Processing

```typescript
interface NumberStats {
    numbers: number[];
    sum: number;
    average: number;
    min: number;
    max: number;
    count: number;
    median: number;
    evenCount: number;
    oddCount: number;
}

async function run(input: any): Promise<NumberStats> {
    // Extract numbers from input (handle various formats)
    let numbers: number[] = [];
    
    if (Array.isArray(input.numbers)) {
        numbers = input.numbers.filter(n => typeof n === 'number' && !isNaN(n));
    } else if (typeof input.numbers === 'string') {
        numbers = input.numbers
            .split(',')
            .map(s => parseFloat(s.trim()))
            .filter(n => !isNaN(n));
    } else {
        numbers = [1, 2, 3, 4, 5]; // Default
    }
    
    if (numbers.length === 0) {
        numbers = [0];
    }
    
    // Calculate statistics
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    const average = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    
    // Calculate median
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    
    // Count even/odd
    const evenCount = numbers.filter(n => n % 2 === 0).length;
    const oddCount = numbers.length - evenCount;
    
    return {
        numbers,
        sum,
        average: Math.round(average * 100) / 100,
        min,
        max,
        count: numbers.length,
        median,
        evenCount,
        oddCount
    };
}
```

#### Example: Parallel Processing

```typescript
async function run(input: any): Promise<any> {
    const urls = input.urls || [
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://jsonplaceholder.typicode.com/posts/2',
        'https://jsonplaceholder.typicode.com/posts/3'
    ];
    
    // Process all URLs in parallel
    const results = await Promise.all(
        urls.map(async (url: string) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return {
                    url,
                    success: true,
                    data: await response.json()
                };
            } catch (error) {
                return {
                    url,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        })
    );
    
    return {
        totalRequests: urls.length,
        successfulRequests: results.filter(r => r.success).length,
        results
    };
}
```

---

## Configuration-Based Nodes

### HTTP API Call Node

The HTTP API Call node allows you to make requests to external APIs and web services. Configure it using JSON in the node editor.

#### Basic Configuration

```json
{
  "method": "GET",
  "url": "https://api.example.com/data",
  "headers": {},
  "params": {},
  "body": {},
  "timeout": 30
}
```

#### Parameters

- **`method`** (string): HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- **`url`** (string): Complete URL to request
- **`headers`** (object): HTTP headers to send
- **`params`** (object): Query parameters to append to URL
- **`body`** (object): Request body for POST/PUT/PATCH requests
- **`timeout`** (number): Timeout in seconds (default: 30)

#### Dynamic Template Replacement

Use `{field_name}` placeholders in your configuration to insert data from the previous node:

```json
{
  "method": "POST",
  "url": "https://api.example.com/users/{user_id}/posts",
  "headers": {
    "Authorization": "Bearer {api_token}",
    "Content-Type": "application/json"
  },
  "body": {
    "title": "{post_title}",
    "content": "{post_content}"
  }
}
```

#### Output Format

```json
{
  "status_code": 200,
  "headers": {
    "content-type": "application/json",
    "x-api-version": "1.0"
  },
  "data": {
    "id": 456,
    "title": "My New Post",
    "created_at": "2025-11-28T10:30:00Z"
  },
  "url": "https://api.example.com/users/123/posts",
  "method": "POST"
}
```

#### Authentication Patterns

For workflows that require authentication, see the [Bearer Token Authentication Workflow](../docs/Bearer_Token_Authentication_Workflow.json) example, which demonstrates:

- Preparing credentials (username/password, OAuth2, API keys)
- Authenticating to obtain bearer tokens
- Extracting tokens from authentication responses
- Using bearer tokens in subsequent authenticated requests

See [Bearer Token Authentication Guide](../docs/BEARER_TOKEN_AUTH_GUIDE.md) for detailed patterns and best practices.

#### Examples

**GET Request with Query Parameters:**
```json
{
  "method": "GET",
  "url": "https://api.github.com/search/repositories",
  "params": {
    "q": "{search_term}",
    "sort": "stars",
    "order": "desc",
    "per_page": 10
  },
  "headers": {
    "Accept": "application/vnd.github.v3+json"
  }
}
```

**POST with Authentication:**
```json
{
  "method": "POST", 
  "url": "https://api.slack.com/api/chat.postMessage",
  "headers": {
    "Authorization": "Bearer {slack_token}",
    "Content-Type": "application/json"
  },
  "body": {
    "channel": "{channel_id}",
    "text": "{message}",
    "username": "WorkflowBot"
  }
}
```

---

### File Operations Node

The File Operations node handles reading, writing, and manipulating files. All operations are security-restricted to the `/tmp/workflow_files/` directory.

#### Basic Configuration

```json
{
  "operation": "read",
  "path": "example.txt",
  "content": "",
  "encoding": "utf-8"
}
```

#### Parameters

- **`operation`** (string): File operation (`read`, `write`, `append`, `delete`, `list`)
- **`path`** (string): File path (automatically prefixed with `/tmp/workflow_files/`)
- **`content`** (string): Content for write/append operations
- **`encoding`** (string): File encoding (default: `utf-8`)

#### Operations

**Read File:**
```json
{
  "operation": "read",
  "path": "data.txt",
  "encoding": "utf-8"
}
```

**Output:**
```json
{
  "content": "File contents here...",
  "path": "/tmp/workflow_files/data.txt",
  "size": 1024,
  "operation": "read"
}
```

**Write File:**
```json
{
  "operation": "write",
  "path": "output.txt",
  "content": "Hello World!\nThis is line 2",
  "encoding": "utf-8"
}
```

**Append to File:**
```json
{
  "operation": "append", 
  "path": "log.txt",
  "content": "\n[{timestamp}] New log entry: {message}",
  "encoding": "utf-8"
}
```

**Important:** For `write` and `append` operations, use placeholders in the `content` field to insert data from the previous node:

```json
{
  "operation": "append",
  "path": "example.txt",
  "content": "{content}\n"
}
```

If the previous node outputs:
```json
{
  "content": "Henry VII",
  "model": "gpt-4o-mini",
  "provider": "openai"
}
```

The file will contain: `Henry VII\n`

#### Dynamic Content with Templates

```json
{
  "operation": "write",
  "path": "report_{date}.txt",
  "content": "Report Generated: {timestamp}\nUser: {username}\nData: {processed_data}",
  "encoding": "utf-8"
}
```

---

### Markdown Viewer Node

The Markdown Viewer node automatically detects and displays markdown content from upstream nodes. It's perfect for rendering formatted text, documentation, reports, or any markdown-formatted output in a readable viewer.

#### Basic Configuration

```json
{
  "content_key": "content"
}
```

#### Parameters

- **`content_key`** (string, optional): Specific key to look for markdown content in upstream input (default: `"content"`)

#### How It Works

1. **Automatic Detection**: The node automatically scans all variables from the upstream node's output
2. **Markdown Detection**: It identifies markdown patterns including:
   - Headers (`#`, `##`, `###`)
   - Bold (`**text**`) and italic (`*text*`)
   - Links (`[text](url)`)
   - Code blocks (`` ``` ``)
   - Lists (`-`, `*`, numbered)
   - Blockquotes (`>`)
   - Tables
3. **Priority Order**:
   - First checks the specified `content_key` (if provided)
   - Then scans all variables in the input
   - Falls back to common key names: `content`, `markdown`, `text`, `body`, `message`, `output`, `result`
   - If input is a string, checks if it's markdown
   - Final fallback: converts input to string representation

#### Output Format

```json
{
  "content": "# Markdown Content\n\nThis is **bold** and this is *italic*.",
  "detected_key": "content",
  "source_input": {...}
}
```

#### Features

- **Anchor Support**: The viewer supports anchor links (`#section-name`) for navigation within documents
- **Cross-Document Links**: Supports links to other markdown files (e.g., `docs/file.md#section`)
- **Light Theme**: Always displays in light theme for optimal readability, independent of app theme
- **Full Markdown Support**: Renders GitHub Flavored Markdown including tables, task lists, and more

#### Examples

**Displaying LLM Output as Markdown:**

If an LLM node outputs markdown-formatted content:

```json
{
  "content": "# Analysis Report\n\n## Summary\n\nThis workflow processed **100 items** successfully.\n\n## Details\n\n- Item 1: ✓ Complete\n- Item 2: ✓ Complete\n- Item 3: ⚠ Warning"
}
```

**Markdown Viewer Config:**
```json
{
  "content_key": "content"
}
```

**Displaying Documentation:**

If a Python node generates documentation:

```python
def run(input):
    doc = """# User Guide
    
## Getting Started

1. Install the application
2. Configure settings
3. Run the workflow

## Advanced Features

See [Advanced Configuration](#advanced-configuration) for details.
"""
    return {
        "documentation": doc,
        "version": "1.0.0"
    }
```

**Markdown Viewer Config:**
```json
{
  "content_key": "documentation"
}
```

The viewer will automatically detect and display the markdown content.

#### Viewing Markdown

After workflow execution:
1. Click on the Markdown Viewer node
2. The markdown content opens in a full-size viewer modal
3. Use anchor links to navigate within the document
4. Click on relative markdown file links to open other documentation files

#### Best Practices

1. **Use Descriptive Keys**: If you know which key contains markdown, specify it in `content_key`
2. **Format LLM Output**: When using LLM nodes, request markdown-formatted responses for better readability
3. **Structure Content**: Use proper markdown headers and sections for better navigation with anchors
4. **Link to Documentation**: Use relative links (e.g., `docs/guide.md#section`) to create interconnected documentation

---

### HTML Viewer Node

The HTML Viewer node automatically detects and displays HTML content from upstream nodes. It's similar to the Markdown Viewer but renders HTML instead of markdown. Perfect for displaying HTML reports, web content, or formatted HTML output.

#### Basic Configuration

```json
{
  "content_key": "content"
}
```

#### Parameters

- **`content_key`** (string, optional): The key in the input data that contains HTML content. Defaults to `"content"`. If not specified, the node will automatically scan all string values for HTML content.

#### How It Works

1. **Automatic Detection**: The node scans all string values in the input data for HTML patterns (tags like `<div>`, `<p>`, `<html>`, etc.)
2. **Priority Selection**: 
   - First checks the specified `content_key` (if provided)
   - Then scans all variables for HTML content
   - Falls back to common key names (`html`, `body`, `content`, `output`, etc.)
3. **Rendering**: Displays the HTML in a full-size viewer modal with light theme (for better readability)

#### Examples

**Displaying HTML from HTTP Response:**

If an HTTP node fetches HTML content:

```json
{
  "status": 200,
  "body": "<html><body><h1>Welcome</h1><p>This is HTML content.</p></body></html>",
  "headers": {}
}
```

**HTML Viewer Config:**
```json
{
  "content_key": "body"
}
```

**Displaying HTML Report:**

If a Python node generates HTML:

```python
def run(input):
    html_report = """
    <html>
    <head><title>Report</title></head>
    <body>
        <h1>Analysis Report</h1>
        <table border="1">
            <tr><th>Item</th><th>Status</th></tr>
            <tr><td>Item 1</td><td>✓ Complete</td></tr>
            <tr><td>Item 2</td><td>✓ Complete</td></tr>
        </table>
    </body>
    </html>
    """
    return {
        "html_report": html_report,
        "status": "success"
    }
```

**HTML Viewer Config:**
```json
{
  "content_key": "html_report"
}
```

#### Viewing HTML

After workflow execution:
1. Click on the HTML Viewer node
2. The HTML content opens in a full-size viewer modal
3. HTML is rendered with light theme for better readability
4. Links and interactive elements are preserved

#### Best Practices

1. **Use Descriptive Keys**: If you know which key contains HTML, specify it in `content_key`
2. **Generate Valid HTML**: Ensure HTML is well-formed for proper rendering
3. **Style for Light Theme**: HTML is displayed in light theme, so design accordingly
4. **Security Note**: HTML is rendered as-is, so be cautious with user-generated content

#### Differences from Markdown Viewer

- **HTML Viewer**: Renders raw HTML content, preserves all HTML tags and styling
- **Markdown Viewer**: Renders markdown-formatted text, converts markdown to HTML

Use HTML Viewer when you have HTML content directly, and Markdown Viewer when you have markdown that needs to be converted to HTML.

---

### Conditional Logic Node

The Conditional Logic node enables branching logic in workflows. It evaluates conditions against input data and returns different outputs based on the results.

#### Basic Configuration

```json
{
  "type": "if",
  "conditions": [
    {
      "condition": {
        "field": "status",
        "operator": "==",
        "value": "success"
      },
      "output": {
        "result": "success",
        "message": "Operation completed successfully"
      }
    }
  ],
  "default": {
    "result": "default",
    "message": "No conditions matched"
  }
}
```

#### Parameters

- **`type`** (string): Logic type (currently supports `"if"`)
- **`conditions`** (array): Array of condition objects
- **`default`** (object): Default output if no conditions match

#### Supported Operators

- **`==`** - Equal to
- **`!=`** - Not equal to  
- **`>`** - Greater than
- **`<`** - Less than
- **`>=`** - Greater than or equal to
- **`<=`** - Less than or equal to
- **`contains`** - String contains substring
- **`exists`** - Field exists (not null/undefined)

#### Examples

**User Status Routing:**
```json
{
  "type": "if",
  "conditions": [
    {
      "condition": {
        "field": "user_type",
        "operator": "==",
        "value": "admin"
      },
      "output": {
        "access_level": "full",
        "redirect": "/admin/dashboard",
        "permissions": ["read", "write", "delete"]
      }
    },
    {
      "condition": {
        "field": "user_type", 
        "operator": "==",
        "value": "premium"
      },
      "output": {
        "access_level": "premium",
        "redirect": "/premium/dashboard",
        "permissions": ["read", "write"]
      }
    }
  ],
  "default": {
    "access_level": "basic",
    "redirect": "/dashboard",
    "permissions": ["read"]
  }
}
```

**Numeric Range Validation:**
```json
{
  "type": "if",
  "conditions": [
    {
      "condition": {
        "field": "age",
        "operator": ">=",  
        "value": 18
      },
      "output": {
        "eligible": true,
        "category": "adult",
        "message": "Access granted"
      }
    },
    {
      "condition": {
        "field": "age",
        "operator": ">=",
        "value": 13
      },
      "output": {
        "eligible": true,
        "category": "teen",  
        "message": "Parental consent required"
      }
    }
  ],
  "default": {
    "eligible": false,
    "category": "child",
    "message": "Access denied"
  }
}
```

#### Output Format

```json
{
  "result": {
    "access_level": "premium",
    "redirect": "/premium/dashboard",
    "permissions": ["read", "write"]
  },
  "matched_condition": 1,
  "input": {
    "user_type": "premium",
    "user_id": 123
  },
  "condition_type": "if"
}
```

---

### Database Query Node

The Database Query node enables interaction with SQLite databases. All operations are security-restricted to the `/tmp/workflow_dbs/` directory.

#### Basic Configuration

```json
{
  "operation": "select",
  "database": "workflow.db",
  "query": "SELECT * FROM users WHERE id = ?",
  "params": []
}
```

#### Parameters

- **`operation`** (string): Database operation (`select`, `insert`, `update`, `delete`, `create`)
- **`database`** (string): Database filename (automatically placed in `/tmp/workflow_dbs/`)
- **`query`** (string): SQL query to execute  
- **`params`** (array): Parameters for parameterized queries

#### Operations

**SELECT Query:**
```json
{
  "operation": "select",
  "database": "users.db", 
  "query": "SELECT id, name, email FROM users WHERE active = ? ORDER BY name",
  "params": [1]
}
```

**Output:**
```json
{
  "data": [
    {"id": 1, "name": "Alice", "email": "alice@example.com"},
    {"id": 3, "name": "Bob", "email": "bob@example.com"}
  ],
  "operation": "select",
  "database": "/tmp/workflow_dbs/users.db",
  "query": "SELECT id, name, email FROM users..."
}
```

**INSERT Query:**
```json
{
  "operation": "insert",
  "database": "users.db",
  "query": "INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)",
  "params": ["John Doe", "john@example.com", "2025-11-28"]
}
```

**Output:**
```json
{
  "data": {
    "rows_affected": 1,
    "last_row_id": 42
  },
  "operation": "insert",
  "database": "/tmp/workflow_dbs/users.db" 
}
```

**Dynamic Queries with Templates:**

Use `{field_name}` placeholders in queries to insert data from previous nodes:

```json
{
  "operation": "select",
  "database": "logs.db",
  "query": "SELECT * FROM events WHERE user_id = {user_id} AND date >= '{start_date}' ORDER BY timestamp DESC LIMIT 10"
}
```

**Use parameterized queries for user input to prevent SQL injection:**

```json
{
  "operation": "insert",
  "database": "workflow_logs.db",
  "query": "INSERT INTO logs (workflow_id, status, message, created_at) VALUES (?, ?, ?, ?)",
  "params": ["{workflow_id}", "{status}", "{message}", "{timestamp}"]
}
```

#### Extension Loading (sqlite-vec)

Database nodes support loading SQLite extensions for vector search capabilities. **Note**: Extension loading requires `pysqlite3` to be installed. See [docs/INSTALL_PYSQLITE3.md](../docs/INSTALL_PYSQLITE3.md) for installation instructions based on [Simon Willison's guide](https://til.simonwillison.net/sqlite/build-specific-sqlite-pysqlite-macos).

**Load Extension:**
```json
{
  "operation": "select",
  "database": "rag_vectors.db",
  "query": "SELECT load_extension('/tmp/workflow_files/vec0.so');"
}
```

**Security Rules:**
- Extensions must be in `/tmp/workflow_files/` directory
- Only whitelisted filenames: `vec0.so`, `vec0.dylib`, `vec0.dll`
- Path traversal (`../`) is blocked
- Absolute paths outside safe directory are blocked

**Create Vector Table:**
```json
{
  "operation": "select",
  "database": "rag_vectors.db",
  "query": "CREATE VIRTUAL TABLE IF NOT EXISTS vec_vectors USING vec0(embedding float[384] distance_metric=cosine);"
}
```

**Vector Search:**
```json
{
  "operation": "select",
  "database": "rag_vectors.db",
  "query": "SELECT rowid, distance, content FROM vec_vectors WHERE embedding MATCH ? LIMIT 5;",
  "params": ["{query_embedding}"]
}
```

**Loading Full Documents:**

SQLite TEXT fields can store up to 1GB per field, so you can load full documents. Here are common patterns:

**Load from Files:**
```python
# In a Python node
from pathlib import Path
docs_dir = Path('/tmp/workflow_files/documents')
documents = []
for file_path in docs_dir.glob('*.txt'):  # or .md, .json, etc.
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        documents.append({
            'id': len(documents) + 1,
            'filename': file_path.name,
            'content': content  # Can be very large
        })
return {'documents': documents}
```

**Chunk Large Documents (Recommended for RAG):**
For better semantic search results, consider chunking large documents:
```python
# Split document into overlapping chunks
chunk_size = 1000  # characters
chunk_overlap = 200
chunks = []
start = 0
while start < len(content):
    end = start + chunk_size
    chunks.append({
        'content': content[start:end],
        'chunk_index': len(chunks)
    })
    start = end - chunk_overlap
```

**Load from HTTP/URLs:**
Use an HTTP node to fetch documents, then process in a Python node.

See [Embedding Node](#embedding-node), [Local_RAG_Workflow.json](../Local_RAG_Workflow.json), and [Load_Full_Documents_Example.json](../Load_Full_Documents_Example.json) for complete RAG workflow examples.

---

### Embedding Node

The Embedding node generates vector embeddings from text using sentence-transformers models. This enables semantic search, similarity matching, and RAG (Retrieval-Augmented Generation) workflows.

#### Basic Configuration

```json
{
  "model": "all-MiniLM-L6-v2",
  "input_field": "content",
  "output_field": "embedding",
  "format": "blob"
}
```

#### Parameters

- **`model`** (string): Sentence-transformers model name (default: `all-MiniLM-L6-v2`)
  - Common models: `all-MiniLM-L6-v2` (384 dims, fast), `all-mpnet-base-v2` (768 dims, higher quality)
- **`input_field`** (string): Field name to extract text from input (default: `content`)
- **`output_field`** (string): Field name for embedding output (default: `embedding`)
- **`format`** (string): Output format - `blob` for SQLite BLOB or `array` for JSON array (default: `blob`)

#### Input

- **Source**: Output from previous node
- **Text Extraction**: 
  - If input is a string, uses it directly
  - If input is a dict, extracts from `input_field` (or first string value found)
  - Supports arrays of texts for batch processing

#### Output Structure

**Single Text Input:**
```json
{
  "embedding": "<BLOB bytes>",  // or array if format="array"
  "embedding_array": [0.123, -0.456, ...],
  "embedding_bytes": "<BLOB bytes>",
  "embedding_dim": 384,
  "text": "original text",
  "input_field": "content"
}
```

**Batch Input (array of texts):**
```json
{
  "embedding": [<BLOB>, <BLOB>, ...],  // or array of arrays
  "embedding_array": [[...], [...], ...],
  "embedding_bytes": [<BLOB>, <BLOB>, ...],
  "embedding_dim": 384,
  "texts": ["text1", "text2", ...],
  "input_field": "content",
  "count": 2
}
```

#### What Embedding Nodes CAN Do

✅ Generate vector embeddings from text  
✅ Support multiple sentence-transformers models  
✅ Batch process arrays of texts  
✅ Output in BLOB format (for SQLite) or JSON array format  
✅ Cache models in memory for performance  
✅ Preserve original input data in output  

#### What Embedding Nodes CANNOT Do

❌ Generate embeddings for images or other non-text data  
❌ Use custom embedding models (must be from sentence-transformers)  
❌ Access conversation history (stateless)  
❌ Modify input text (read-only)  

#### Model Caching

Models are cached in memory after first load, so subsequent executions in the same workflow run are faster. The first execution will download the model if not already cached.

#### Example: Single Text Embedding

**Input:**
```json
{
  "content": "SQLite is a lightweight database"
}
```

**Embedding Node Config:**
```json
{
  "model": "all-MiniLM-L6-v2",
  "input_field": "content",
  "output_field": "embedding",
  "format": "blob"
}
```

**Output:**
```json
{
  "content": "SQLite is a lightweight database",
  "embedding": "<384-dim BLOB>",
  "embedding_array": [0.123, -0.456, ...],
  "embedding_dim": 384,
  "text": "SQLite is a lightweight database"
}
```

#### Example: Batch Embedding

**Input:**
```json
{
  "documents": [
    {"content": "Document 1"},
    {"content": "Document 2"},
    {"content": "Document 3"}
  ]
}
```

**Embedding Node Config:**
```json
{
  "model": "all-MiniLM-L6-v2",
  "input_field": "documents",
  "output_field": "embeddings",
  "format": "array"
}
```

**Output:**
```json
{
  "documents": [...],
  "embeddings": [[0.123, ...], [0.456, ...], [0.789, ...]],
  "embedding_dim": 384,
  "count": 3
}
```

#### Vector Database Integration

Embeddings are typically used with vector databases for semantic search:

1. **Generate embeddings** using Embedding node
2. **Store in SQLite with sqlite-vec** extension (see Database node)
3. **Search similar vectors** using SQL queries with `MATCH` operator
4. **Use in RAG workflows** with LLM nodes

**Handling Large Documents:**

- **Full documents**: SQLite TEXT fields support up to 1GB, so you can store entire documents
- **Chunking recommended**: For better search results, chunk large documents (500-2000 characters) with overlap (100-200 characters)
- **Metadata**: Store filename, chunk_index, and other metadata alongside content for better context in search results
- **Example**: See [Load_Full_Documents_Example.json](../Load_Full_Documents_Example.json) for a complete workflow

See the [Local RAG Workflow example](../Local_RAG_Workflow.json) for a complete implementation.

---

### LLM AI Assistant Node

The LLM AI Assistant node integrates large language models into workflows. It supports multiple providers and dynamic prompt templating.

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

3. **In the LLM node configuration**, you can:
   - **Use environment variable**: Set `api_key_name` (e.g., `"api_key_name": "OPENROUTER_API_KEY"`)
   - **Override per-node**: Set `api_key` directly in the node config (stored securely in DB, not exported)

**Important**: Never hardcode API keys in workflow JSON files that will be committed to version control. Always use environment variables or the per-node override. See [SECURITY.md](../SECURITY.md) for detailed security guidelines.

#### Configuration via UI

The LLM node uses a dedicated full-size dialog (similar to the node editor) for configuration. The dialog provides:

- **Form View**: User-friendly form with fields for:
  - API Key Override (per-node, optional)
  - Provider Selection (OpenAI, Groq, Together, Fireworks, DeepInfra, Perplexity, Mistral, OpenRouter, etc.)
  - Model Selection (dynamically fetched based on provider and API key)
  - Temperature (0.0-2.0)
  - Max Tokens
  - System Prompt
  - User Prompt

- **Advanced JSON View**: Raw JSON editor for advanced configuration

#### Basic Configuration Structure

```json
{
  "provider": "openrouter",
  "model": "x-ai/grok-4.1-fast:free",
  "temperature": 0.7,
  "max_tokens": 1000,
  "system": "",
  "user": "Who was king/queen of England during year {year}, just respond with the name and nothing else.",
  "api_key": "sk-or-v1-...",
  "base_url": "https://openrouter.ai/api/v1"
}
```

#### Parameters

- **`provider`** (string): LLM provider (`openai`, `groq`, `together`, `fireworks`, `deepinfra`, `perplexity`, `mistral`, `openrouter`, etc.)
- **`model`** (string): Model identifier (e.g., `gpt-4o-mini`, `claude-3-5-sonnet-20241022`)
- **`temperature`** (number): Randomness level (0.0-2.0, default: 0.7)
- **`max_tokens`** (number): Maximum response tokens (default: 1000)
- **`system`** (string): System prompt/instructions (optional)
- **`user`** (string): User prompt with template placeholders
- **`api_key`** (string, optional): Per-node API key override (stored securely in DB, not in JSON export)
- **`base_url`** (string, optional): Custom base URL for non-standard or self-hosted providers

#### How It Works

1. **Prompt Construction**: The `user` prompt is filled with template placeholders from the previous node's output
2. **Upstream Input**: The complete upstream `input_data` (as JSON) is automatically appended to the `user` prompt
3. **Message Format**: The backend constructs messages as:
   ```json
   {
     "messages": [
       {"role": "system", "content": "<system prompt>"},
       {"role": "user", "content": "<user prompt>\n<upstream input as JSON>"}
     ]
   }
   ```

#### Dynamic Prompt Templates

Use `{field_name}` placeholders in prompts to insert data from previous nodes:

**Previous Node Output:**
```json
{
  "user_feedback": "The app is slow and crashes often",
  "user_rating": 2,
  "app_version": "1.2.3",
  "device": "iPhone 14"
}
```

**LLM Node Config:**
```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3.5-sonnet", 
  "user": "Analyze this user feedback:\n\nFeedback: {user_feedback}\nRating: {user_rating}/5\nApp Version: {app_version}\nDevice: {device}\n\nProvide:\n1. Issue categories\n2. Severity assessment\n3. Recommended actions",
  "system": "You are a product manager analyzing user feedback.",
  "temperature": 0.2,
  "max_tokens": 1000
}
```

#### Supported Providers

The LLM node supports multiple providers via their `/v1/chat/completions` endpoint:

- **OpenAI**: `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-3.5-turbo`
- **Anthropic** (via OpenRouter): `anthropic/claude-3.5-sonnet`, `anthropic/claude-3-haiku`
- **Groq**: `groq/llama-3.1-70b-versatile`, `groq/mixtral-8x7b-32768`
- **Together AI**: `togethercomputer/Llama-2-70B-32K-Instruct`
- **Fireworks AI**: `fireworks/mixtral-8x7b-instruct`
- **DeepInfra**: Various models via DeepInfra
- **Perplexity**: `perplexity/llama-3.1-sonar-large-128k-online`
- **Mistral AI**: `mistralai/mistral-large-2407`
- **OpenRouter**: Access to all above models via a single API

#### Model Selection

When you click the model dropdown:
1. First, select a provider
2. The system fetches available models from the provider's `/v1/models` endpoint
3. Select the desired model from the list

**Note:** If no API key is provided (neither in the override box nor in environment variables), you'll be prompted to enter one before choosing a model.

#### Output Format

```json
{
  "content": "Based on the sales data analysis...",
  "model": "x-ai/grok-4.1-fast:free",
  "provider": "openrouter",
  "prompt": "Analyze this sales data and provide...",
  "tokens_used": 847,
  "finish_reason": "stop"
}
```

#### Examples

**Content Analysis:**
```json
{
  "provider": "openrouter",
  "model": "openai/gpt-4o",
  "user": "Analyze this text and extract key themes: {text_content}",
  "system": "You are a text analysis assistant.",
  "temperature": 0.3,
  "max_tokens": 500
}
```

**Data Summarization:**
```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3.5-sonnet",
  "user": "Summarize this data in one paragraph: {data_summary}",
  "temperature": 0.2,
  "max_tokens": 200
}
```

#### API Key Management

- **Per-Node Override**: You can set an API key directly in the LLM node configuration (stored securely in DB, not exported)
- **Environment Variables**: Set keys in `.env` file (e.g., `OPENROUTER_API_KEY`, `OPENAI_API_KEY`) and reference via `api_key_name` in config
- **Security**: 
  - API keys are never displayed in the JSON export or Advanced JSON view
  - Never hardcode keys in workflow JSON files
  - Always use environment variables or per-node override
  - See [SECURITY.md](../SECURITY.md) for detailed guidelines

---

## Control Flow Nodes

### For Each Loop Node

The For Each Loop node iterates over an array of items, executing a sub-workflow for each item. It supports both serial and parallel execution modes.

**IMPORTANT**: Every ForEach loop MUST have a corresponding EndLoop node to mark where the loop ends and aggregate results.

#### Basic Configuration

```json
{
  "items": [],
  "execution_mode": "serial",
  "max_concurrency": 5,
  "items_key": "items"
}
```

#### Parameters

- **`items`** (array): Static array of items to iterate over (used if not provided by upstream node)
- **`execution_mode`** (string): Execution mode (`serial` or `parallel`)
- **`max_concurrency`** (number): Maximum concurrent executions in parallel mode (default: 5)
- **`items_key`** (string): Key to extract array from upstream input (default: `"items"`)

#### How It Works

1. **Input Source**: The for-each node can get items from:
   - Upstream node output (if it's an array)
   - Upstream node output at `input_data[items_key]` (e.g., `input.items`)
   - Static `items` array in config (fallback)

2. **Sub-Workflow Execution**: 
   - All nodes connected downstream from the for-each node until an 'endloop' node are executed as a sub-workflow
   - The sub-workflow continues until an EndLoop node (not End or another ForEach)
   - Each item replaces the `input_data` entirely for that iteration
   - The sub-workflow receives the item as its input

3. **Execution Modes**:
   - **Serial**: Items are processed one at a time, in order
   - **Parallel**: Items are processed concurrently, with `max_concurrency` limit

4. **Error Handling**: 
   - If one iteration fails, other iterations continue processing
   - Errors are collected in the results array

#### Output Format

```json
{
  "results": [
    {
      "item": {"year": "1000"},
      "output": {"path": "/tmp/workflow_files/example.txt", "bytes_appended": 22},
      "status": "success",
      "error": null
    },
    {
      "item": {"year": "1200"},
      "output": {"path": "/tmp/workflow_files/example.txt", "bytes_appended": 10},
      "status": "success",
      "error": null
    }
  ],
  "total": 2,
  "successful": 2,
  "failed": 0
}
```

#### Example: Processing Array from Python Node

**Python Node (upstream):**
```python
def run(input):
    years = [
        {"year": "1000"},
        {"year": "1200"},
        {"year": "1400"}
    ]
    return {
        "items": years,
        "total": len(years)
    }
```

**For Each Loop Config:**
```json
{
  "items": [],
  "execution_mode": "serial",
  "max_concurrency": 5,
  "items_key": "items"
}
```

**Workflow Structure:**
```
Start → Python (generate array) → For Each Loop → LLM (process each item) → File (append each result) → EndLoop → Final Processing → End
```

In this example:
- The Python node generates an array of years
- The For Each Loop extracts the array using `items_key: "items"`
- For each year, the LLM node processes it and the File node appends the result
- The EndLoop node aggregates all iteration results
- The Final Processing node receives all aggregated results
- All three iterations execute sequentially

#### Example: Parallel Processing

```json
{
  "items": [
    {"id": 1, "name": "Item 1"},
    {"id": 2, "name": "Item 2"},
    {"id": 3, "name": "Item 3"}
  ],
  "execution_mode": "parallel",
  "max_concurrency": 3,
  "items_key": "items"
}
```

This will process up to 3 items concurrently, improving performance for I/O-bound operations.

#### Best Practices

1. **Use Serial for Dependent Operations**: If each iteration depends on the previous one, use `serial` mode
2. **Use Parallel for Independent Operations**: If iterations are independent, use `parallel` mode with appropriate `max_concurrency`
3. **Handle Errors Gracefully**: The for-each node continues processing even if some iterations fail
4. **Monitor Execution Time**: Parallel execution can be faster but may hit rate limits or resource constraints
5. **Always Use EndLoop**: Every ForEach loop MUST have a corresponding EndLoop node to aggregate results

---

### End Loop Node

The End Loop node marks the end of a ForEach loop's sub-workflow. It aggregates all iteration results and provides them in a structured format to the next node.

#### Basic Structure

```json
{
  "type": "endloop",
  "title": "End Loop",
  "position": { "x": 100, "y": 100 }
}
```

#### Purpose

The EndLoop node is a marker node that:
- Defines where a ForEach loop's sub-workflow ends
- Aggregates all iteration results from the ForEach loop
- Provides structured output for downstream processing
- Ensures no data is lost between iterations

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

#### What EndLoop Nodes CAN Do

✅ Aggregate all ForEach iteration results  
✅ Provide structured output for downstream processing  
✅ Support nested ForEach loops (each ForEach has its own EndLoop)  
✅ Pass complete dataset to next node  
✅ Preserve all iteration data without loss

#### What EndLoop Nodes CANNOT Do

❌ Work without a corresponding ForEach node  
❌ Be used outside of a ForEach loop context  
❌ Have configuration (it's a marker node)  
❌ Process data (it only aggregates and passes through)

---

## Custom Nodes

Custom nodes allow you to save frequently used node configurations as reusable templates that can be shared across workflows.

### Creating a Custom Node

1. **Edit a Node**: Open any node (Python, TypeScript, HTTP, File, Condition, Database, LLM, or For Each) in the editor
2. **Configure It**: Set up the node with your desired code or configuration
3. **Save as Custom Node**: Click the "Save as Custom Node" button in the left sidebar
4. **Provide Details**:
   - **Name**: Unique name for your custom node (required)
   - **Description**: Brief description of what the node does (optional but recommended)
5. **Save**: The custom node is now available globally in all workflows

### Using Custom Nodes

1. **Access from Toolbar**: Use the "Custom Nodes" dropdown in the top navigation bar
2. **Select Node**: Choose a custom node from the list (shows name and description)
3. **Instantiate**: The node is added to your canvas with the saved configuration
4. **Edit**: You can edit the instance like any other node

### Updating Custom Nodes

When editing a custom node instance:

1. **Make Changes**: Modify the code or configuration as needed
2. **Update Custom Node**: Click "Update Custom Node" in the left sidebar
3. **Confirmation**: You'll see a confirmation dialog: "Custom node updated."
4. **Effect**: The custom node template is updated, and all future instances will use the new configuration

**Note:** Existing instances in workflows retain their current configuration. Only new instances created after the update will use the new configuration.

### Exporting Custom Nodes

1. **Edit Custom Node Instance**: Open a custom node in the editor
2. **Export**: Click "Export Custom Node" in the left sidebar
3. **Provide Filename**: Enter a filename (without extension)
4. **Download**: A JSON file is downloaded containing the custom node definition

The exported JSON can be shared with other users or imported into other instances of the application.

### Importing Custom Nodes

1. **Import Button**: Click the "Import" button in the top navigation bar
2. **Select File**: Choose a custom node JSON file
3. **Overwrite Prompt**: If a custom node with the same name exists, you'll be prompted to overwrite it
4. **Success**: The custom node is added to your database and available for use

### Custom Node Structure

Exported custom nodes have this structure:

```json
{
  "name": "My Custom Node",
  "type": "python",
  "description": "Processes user data and returns formatted output",
  "config": {
    "code": "def run(input):\n    return {\"processed\": input}",
    "config": null
  },
  "created_at": "2025-11-29T10:00:00Z"
}
```

### Best Practices

1. **Descriptive Names**: Use clear, descriptive names for custom nodes
2. **Good Descriptions**: Write helpful descriptions that explain what the node does
3. **Version Control**: Export custom nodes and store them in version control
4. **Documentation**: Document any special requirements or dependencies
5. **Testing**: Test custom nodes thoroughly before sharing

---

## Best Practices

### 1. Structure Your Returns

Always return objects with descriptive keys:

```python
# ✅ Good
def run(input):
    return {
        "user_id": 123,
        "username": "john_doe",
        "email": "john@example.com",
        "is_active": True
    }

# ❌ Avoid
def run(input):
    return user_data  # unclear what this contains
```

### 2. Handle Errors Gracefully

```python
def run(input):
    try:
        # Risky operation
        result = process_data(input)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 3. Validate Inputs

```python
def run(input):
    # Check required fields
    if 'user_id' not in input:
        return {"error": "user_id is required"}
    
    user_id = input['user_id']
    if not isinstance(user_id, int):
        return {"error": "user_id must be an integer"}
    
    # Continue with processing...
```

### 4. Use Template Placeholders Wisely

```json
// ✅ Good - Clear field names
{
  "url": "https://api.service.com/users/{user_id}/orders/{order_id}",
  "headers": {
    "Authorization": "Bearer {api_token}"
  }
}

// ❌ Avoid - Unclear placeholders  
{
  "url": "https://api.service.com/users/{x}/orders/{y}"
}
```

### 5. Use Parameterized Database Queries

```json
// ✅ Good - Parameterized query (safe)
{
  "operation": "select",
  "query": "SELECT * FROM users WHERE email = ? AND status = ?",
  "params": ["{user_email}", "active"]
}

// ❌ Risky - Direct string interpolation (SQL injection risk)
{
  "operation": "select",
  "query": "SELECT * FROM users WHERE email = '{user_email}'"
}
```

### 6. Provide Meaningful Defaults

```json
// ✅ Good - Informative default
{
  "default": {
    "action": "manual_review",
    "reason": "No automated rules matched",
    "priority": "medium"
  }
}

// ❌ Poor - Unclear default
{
  "default": {}
}
```

### 7. Type Safety in TypeScript

```typescript
// ✅ Good - Proper type definitions
interface InputData {
    userId: number;
    email: string;
}

interface OutputData {
    processed: boolean;
    userId: number;
}

async function run(input: InputData): Promise<OutputData> {
    // Type-safe code
    return {
        processed: true,
        userId: input.userId
    };
}

// ❌ Avoid - Using 'any' everywhere
async function run(input: any): Promise<any> {
    return input.data.map((item: any) => item.value);
}
```

### 8. Error Handling in TypeScript

```typescript
// ✅ Comprehensive error handling
async function run(input: any): Promise<any> {
    try {
        const url = input.url;
        if (!url) {
            throw new Error('URL is required');
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return { success: true, data };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
```

---

## Complete Examples

### Example 1: User Registration Pipeline

This workflow demonstrates a complete user registration process using multiple node types.

#### 1. HTTP API Call - Validate Email

```json
{
  "method": "POST",
  "url": "https://api.emailvalidation.com/validate",
  "headers": {
    "Authorization": "Bearer {email_api_key}",
    "Content-Type": "application/json"
  },
  "body": {
    "email": "{user_email}"
  }
}
```

#### 2. Conditional Logic - Route Based on Validation

```json
{
  "type": "if",
  "conditions": [
    {
      "condition": {
        "field": "data.is_valid",
        "operator": "==", 
        "value": true
      },
      "output": {
        "status": "valid_email",
        "proceed": true,
        "next_step": "create_user"
      }
    }
  ],
  "default": {
    "status": "invalid_email",
    "proceed": false,
    "next_step": "reject_registration"
  }
}
```

#### 3. Database Query - Create User Account

```json
{
  "operation": "insert",
  "database": "users.db",
  "query": "INSERT INTO users (email, status, created_at) VALUES (?, ?, ?)",
  "params": ["{user_email}", "pending", "{timestamp}"]
}
```

#### 4. File Operations - Log Registration

```json
{
  "operation": "append",
  "path": "registrations.log",
  "content": "\n[{timestamp}] New registration: {user_email} - Status: {status} - User ID: {data.last_row_id}"
}
```

### Example 2: Data Processing with For Each Loop

This workflow processes an array of items using a for-each loop.

#### 1. Python Node - Generate Data Array

```python
def run(input):
    years = [
        {"year": "1000"},
        {"year": "1200"},
        {"year": "1400"}
    ]
    return {
        "items": years,
        "total": len(years)
    }
```

#### 2. For Each Loop - Iterate Over Items

```json
{
  "items": [],
  "execution_mode": "serial",
  "max_concurrency": 5,
  "items_key": "items"
}
```

#### 3. LLM Node - Process Each Item

```json
{
  "provider": "openrouter",
  "model": "x-ai/grok-4.1-fast:free",
  "user": "Who was king/queen of England during year {year}, just respond with the name and nothing else.",
  "temperature": 0.7,
  "max_tokens": 100
}
```

#### 4. File Node - Append Each Result

```json
{
  "operation": "append",
  "path": "example.txt",
  "content": "{content}\n"
}
```

**Workflow Structure:**
```
Start → Python (generate array) → For Each Loop → LLM (process each) → File (append each) → End
```

### Example 3: Multi-Step Data Pipeline

This example shows a complete data processing pipeline using TypeScript nodes.

#### Node 1: Data Fetcher

```typescript
interface FetcherInput {
    endpoint?: string;
    apiKey?: string;
    limit?: number;
}

interface FetcherOutput {
    success: boolean;
    data?: any[];
    error?: string;
    metadata: {
        endpoint: string;
        fetchedAt: string;
        count: number;
    };
}

async function run(input: FetcherInput): Promise<FetcherOutput> {
    const endpoint = input.endpoint || 'https://jsonplaceholder.typicode.com/posts';
    const limit = input.limit || 10;
    
    try {
        const url = new URL(endpoint);
        url.searchParams.set('_limit', limit.toString());
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (input.apiKey) {
            headers['Authorization'] = `Bearer ${input.apiKey}`;
        }
        
        const response = await fetch(url.toString(), { headers });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const dataArray = Array.isArray(data) ? data : [data];
        
        return {
            success: true,
            data: dataArray,
            metadata: {
                endpoint: endpoint,
                fetchedAt: new Date().toISOString(),
                count: dataArray.length
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: {
                endpoint: endpoint,
                fetchedAt: new Date().toISOString(),
                count: 0
            }
        };
    }
}
```

#### Node 2: Data Processor

```typescript
interface ProcessorInput {
    success: boolean;
    data?: any[];
    error?: string;
    metadata: {
        endpoint: string;
        fetchedAt: string;
        count: number;
    };
}

interface ProcessedItem {
    id: number;
    title: string;
    wordCount: number;
    titleLength: number;
    createdAt: string;
}

interface ProcessorOutput {
    success: boolean;
    processedData?: ProcessedItem[];
    error?: string;
    statistics: {
        totalItems: number;
        averageWordCount: number;
        averageTitleLength: number;
        processedAt: string;
    };
}

async function run(input: ProcessorInput): Promise<ProcessorOutput> {
    if (!input.success || !input.data) {
        return {
            success: false,
            error: input.error || 'No data to process',
            statistics: {
                totalItems: 0,
                averageWordCount: 0,
                averageTitleLength: 0,
                processedAt: new Date().toISOString()
            }
        };
    }
    
    try {
        const processedData: ProcessedItem[] = input.data.map(item => {
            const title = item.title || item.name || 'Untitled';
            const body = item.body || item.description || '';
            const wordCount = body.split(/\s+/).filter((word: string) => word.length > 0).length;
            
            return {
                id: item.id || Math.random(),
                title: title.trim(),
                wordCount: wordCount,
                titleLength: title.length,
                createdAt: new Date().toISOString()
            };
        });
        
        // Calculate statistics
        const totalItems = processedData.length;
        const totalWordCount = processedData.reduce((sum, item) => sum + item.wordCount, 0);
        const totalTitleLength = processedData.reduce((sum, item) => sum + item.titleLength, 0);
        
        const averageWordCount = totalItems > 0 ? Math.round((totalWordCount / totalItems) * 100) / 100 : 0;
        const averageTitleLength = totalItems > 0 ? Math.round((totalTitleLength / totalItems) * 100) / 100 : 0;
        
        return {
            success: true,
            processedData: processedData,
            statistics: {
                totalItems,
                averageWordCount,
                averageTitleLength,
                processedAt: new Date().toISOString()
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Processing failed',
            statistics: {
                totalItems: 0,
                averageWordCount: 0,
                averageTitleLength: 0,
                processedAt: new Date().toISOString()
            }
        };
    }
}
```

---

## Common Pitfalls and Solutions

### 1. Missing Template Data

When using `{field_name}` placeholders, ensure the field exists in the previous node's output, or the placeholder will be replaced with the literal string `undefined`.

**Solution:** Always validate that required fields exist before using them in templates.

### 2. File Path Security

All file operations are automatically restricted to `/tmp/workflow_files/`. Don't try to access files outside this directory.

**Solution:** Use relative paths within the allowed directory.

### 3. Database Connection Limits

Each database operation creates a new connection. For high-frequency operations, consider batching multiple operations.

**Solution:** Use transactions or batch operations when possible.

### 4. Infinite Loops in Conditions

Be careful with conditional logic that might create circular dependencies in your workflow.

**Solution:** Design workflows with clear start and end points, avoiding circular references.

### 5. Large File Operations

File operations are suitable for text files and moderate data sizes. For large files (>100MB), consider alternative approaches.

**Solution:** Process files in chunks or use streaming when available.

### 6. Async/Await in TypeScript

**❌ Forgetting to await:**
```typescript
async function run(input: any): Promise<any> {
    const response = fetch('https://api.example.com'); // Missing await!
    return response; // Returns a Promise, not the actual data
}
```

**✅ Proper async/await:**
```typescript
async function run(input: any): Promise<any> {
    const response = await fetch('https://api.example.com');
    const data = await response.json();
    return data;
}
```

### 7. Returning Non-Serializable Data

**❌ Avoid:**
```python
def run(input):
    return datetime.now()  # Can't serialize datetime objects
```

**✅ Better:**
```python
def run(input):
    return datetime.now().isoformat()  # String is serializable
```

---

## Summary

This guide covers all node types available in the Visual Agentic Workflow Builder:

- **Code-Based Nodes**: Python and TypeScript for custom logic
- **Configuration-Based Nodes**: HTTP, File, Markdown Viewer, HTML Viewer, Condition, Database, Embedding, and LLM for common operations
- **Control Flow Nodes**: For Each Loop with EndLoop aggregation for iteration
- **Custom Nodes**: Reusable node templates for sharing
- **Skip During Execution**: Feature to temporarily disable nodes during execution

Each node type uses JSON configuration with template placeholders for dynamic, data-driven workflows. Combined together, these provide a complete toolkit for building complex automation workflows without extensive custom coding.

**Key Features:**
- **Skip During Execution**: Mark any node to skip during workflow execution while preserving data flow
- **ForEach Loops**: Iterate over arrays with serial or parallel execution, aggregated by EndLoop nodes
- **Vector Database Support**: SQLite with sqlite-vec extension for semantic search and RAG workflows
- **Custom Nodes**: Save, reuse, export, and import node templates for workflow efficiency

For more information about the platform architecture, headless execution, and scheduling, see the [main README](../README.md).

