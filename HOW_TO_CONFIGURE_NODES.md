# How to Configure Workflow Nodes

This guide explains how to configure the new node types in the visual workflow builder: HTTP API Calls, File Operations, Conditional Logic, and Database Queries.

## 🌐 HTTP API Call Node

The HTTP API Call node allows you to make requests to external APIs and web services. Configure it using JSON in the node editor.

### Basic Configuration

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

### Parameters

- **`method`** (string): HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- **`url`** (string): Complete URL to request
- **`headers`** (object): HTTP headers to send
- **`params`** (object): Query parameters to append to URL
- **`body`** (object): Request body for POST/PUT/PATCH requests
- **`timeout`** (number): Timeout in seconds (default: 30)

### Dynamic Template Replacement

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
    "content": "{post_content}",
    "tags": ["{tag1}", "{tag2}"]
  }
}
```

If the previous node outputs:
```json
{
  "user_id": 123,
  "api_token": "abc123",
  "post_title": "My New Post",
  "post_content": "This is the content",
  "tag1": "tech",
  "tag2": "tutorial"
}
```

The actual request becomes:
```json
{
  "method": "POST",
  "url": "https://api.example.com/users/123/posts",
  "headers": {
    "Authorization": "Bearer abc123",
    "Content-Type": "application/json"
  },
  "body": {
    "title": "My New Post",
    "content": "This is the content",  
    "tags": ["tech", "tutorial"]
  }
}
```

### Output Format

The node returns structured data:

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

### Examples

#### GET Request with Query Parameters

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

#### POST with Authentication

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

#### REST API with Dynamic Endpoint

```json
{
  "method": "PUT",
  "url": "https://jsonplaceholder.typicode.com/posts/{post_id}",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "id": "{post_id}",
    "title": "{updated_title}",
    "body": "{updated_body}",
    "userId": "{user_id}"
  }
}
```

## 📁 File Operations Node

The File Operations node handles reading, writing, and manipulating files. All operations are security-restricted to the `/tmp/workflow_files/` directory.

### Basic Configuration

```json
{
  "operation": "read",
  "path": "example.txt",
  "content": "",
  "encoding": "utf-8"
}
```

### Parameters

- **`operation`** (string): File operation (`read`, `write`, `append`, `delete`, `list`)
- **`path`** (string): File path (automatically prefixed with `/tmp/workflow_files/`)
- **`content`** (string): Content for write/append operations
- **`encoding`** (string): File encoding (default: `utf-8`)

### Operations

#### Read File

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

#### Write File

```json
{
  "operation": "write",
  "path": "output.txt",
  "content": "Hello World!\nThis is line 2",
  "encoding": "utf-8"
}
```

**Output:**
```json
{
  "path": "/tmp/workflow_files/output.txt",
  "bytes_written": 26,
  "operation": "write"
}
```

#### Append to File

```json
{
  "operation": "append", 
  "path": "log.txt",
  "content": "\n[{timestamp}] New log entry: {message}",
  "encoding": "utf-8"
}
```

#### Delete File

```json
{
  "operation": "delete",
  "path": "temp.txt"
}
```

**Output:**
```json
{
  "path": "/tmp/workflow_files/temp.txt",
  "operation": "delete",
  "success": true
}
```

#### List Directory

```json
{
  "operation": "list",
  "path": "reports/"
}
```

**Output:**
```json
{
  "path": "/tmp/workflow_files/reports",
  "files": [
    "/tmp/workflow_files/reports/report1.txt",
    "/tmp/workflow_files/reports/report2.txt"
  ],
  "count": 2,
  "operation": "list"
}
```

### Dynamic Content with Templates

Use placeholders in content to insert data from previous nodes:

```json
{
  "operation": "write",
  "path": "report_{date}.txt",
  "content": "Report Generated: {timestamp}\nUser: {username}\nData: {processed_data}",
  "encoding": "utf-8"
}
```

### Examples

#### Log Workflow Results

```json
{
  "operation": "append",
  "path": "workflow_logs.txt",
  "content": "\n[{timestamp}] Workflow executed - Status: {status}, Data: {result_summary}"
}
```

#### Generate CSV Report

```json
{
  "operation": "write", 
  "path": "users_{date}.csv",
  "content": "ID,Name,Email,Status\n{user_id},{user_name},{user_email},{user_status}"
}
```

#### Process Template File

```json
{
  "operation": "write",
  "path": "email_template.html",
  "content": "<html><body><h1>Hello {customer_name}!</h1><p>Your order #{order_id} has been {status}.</p></body></html>"
}
```

## 🔀 Conditional Logic Node

The Conditional Logic node enables branching logic in workflows. It evaluates conditions against input data and returns different outputs based on the results.

### Basic Configuration

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

### Parameters

- **`type`** (string): Logic type (currently supports `"if"`)
- **`conditions`** (array): Array of condition objects
- **`default`** (object): Default output if no conditions match

### Condition Object Structure

```json
{
  "condition": {
    "field": "field_name",
    "operator": "==",
    "value": "expected_value"
  },
  "output": {
    "custom": "output_data"
  }
}
```

### Supported Operators

- **`==`** - Equal to
- **`!=`** - Not equal to  
- **`>`** - Greater than
- **`<`** - Less than
- **`>=`** - Greater than or equal to
- **`<=`** - Less than or equal to
- **`contains`** - String contains substring
- **`exists`** - Field exists (not null/undefined)

### Examples

#### User Status Routing

```json
{
  "type": "if,
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

#### Numeric Range Validation

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

#### Error Handling

```json
{
  "type": "if",
  "conditions": [
    {
      "condition": {
        "field": "http_status",
        "operator": "==",
        "value": 200
      },
      "output": {
        "success": true,
        "action": "process_data",
        "next_step": "save_results"
      }
    },
    {
      "condition": {
        "field": "http_status",
        "operator": ">=", 
        "value": 400
      },
      "output": {
        "success": false,
        "action": "handle_error",
        "retry": true,
        "next_step": "error_notification"
      }
    }
  ],
  "default": {
    "success": false,
    "action": "unknown_status",
    "retry": false,
    "next_step": "manual_review"
  }
}
```

#### String Matching

```json
{
  "type": "if",
  "conditions": [
    {
      "condition": {
        "field": "email",
        "operator": "contains",
        "value": "@company.com"
      },
      "output": {
        "user_type": "employee",
        "domain": "internal",
        "access": "full"
      }
    },
    {
      "condition": {
        "field": "email",
        "operator": "contains",
        "value": "@"
      },
      "output": {
        "user_type": "external",
        "domain": "public", 
        "access": "limited"
      }
    }
  ],
  "default": {
    "user_type": "invalid",
    "domain": "unknown",
    "access": "none"
  }
}
```

### Output Format

The node returns the matched condition's output plus metadata:

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

- **`result`** - The output from the matched condition (or default)
- **`matched_condition`** - Index of matched condition (null if default used)
- **`input`** - Original input data  
- **`condition_type`** - Type of conditional logic used

## 🗄️ Database Query Node

The Database Query node enables interaction with SQLite databases. All operations are security-restricted to the `/tmp/workflow_dbs/` directory.

### Basic Configuration

```json
{
  "operation": "select",
  "database": "workflow.db",
  "query": "SELECT * FROM users WHERE id = ?",
  "params": []
}
```

### Parameters

- **`operation`** (string): Database operation (`select`, `insert`, `update`, `delete`, `create`)
- **`database`** (string): Database filename (automatically placed in `/tmp/workflow_dbs/`)
- **`query`** (string): SQL query to execute  
- **`params`** (array): Parameters for parameterized queries

### Operations

#### SELECT Query

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

#### INSERT Query  

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

#### UPDATE Query

```json
{
  "operation": "update", 
  "database": "users.db",
  "query": "UPDATE users SET email = ?, updated_at = ? WHERE id = ?",
  "params": ["newemail@example.com", "2025-11-28", 42]
}
```

**Output:**
```json
{
  "data": {
    "rows_affected": 1,
    "last_row_id": null
  },
  "operation": "update",
  "database": "/tmp/workflow_dbs/users.db"
}
```

#### DELETE Query

```json
{
  "operation": "delete",
  "database": "users.db", 
  "query": "DELETE FROM users WHERE active = ?",
  "params": [0]
}
```

#### CREATE Table

```json
{
  "operation": "create",
  "database": "analytics.db",
  "query": "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, event_name TEXT, timestamp TEXT, data TEXT)"
}
```

### Dynamic Queries with Templates

Use `{field_name}` placeholders in queries to insert data from previous nodes:

```json
{
  "operation": "select",
  "database": "logs.db",
  "query": "SELECT * FROM events WHERE user_id = {user_id} AND date >= '{start_date}' ORDER BY timestamp DESC LIMIT 10"
}
```

Use parameterized queries for user input to prevent SQL injection:

```json
{
  "operation": "insert",
  "database": "workflow_logs.db",
  "query": "INSERT INTO logs (workflow_id, status, message, created_at) VALUES (?, ?, ?, ?)",
  "params": ["{workflow_id}", "{status}", "{message}", "{timestamp}"]
}
```

### Examples

#### User Management

```json
{
  "operation": "select",
  "database": "app.db",
  "query": "SELECT u.*, p.name as profile_name FROM users u LEFT JOIN profiles p ON u.profile_id = p.id WHERE u.email = ?",
  "params": ["{user_email}"]
}
```

#### Analytics Query

```json
{
  "operation": "select", 
  "database": "analytics.db",
  "query": "SELECT DATE(created_at) as date, COUNT(*) as count, AVG(response_time) as avg_time FROM requests WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date DESC",
  "params": ["{start_date}"]
}
```

#### Insert Log Entry

```json
{
  "operation": "insert",
  "database": "logs.db",
  "query": "INSERT INTO activity_logs (user_id, action, details, ip_address, timestamp) VALUES (?, ?, ?, ?, ?)",
  "params": ["{user_id}", "{action}", "{details}", "{ip_address}", "{current_timestamp}"]
}
```

#### Update User Status

```json
{
  "operation": "update",
  "database": "users.db",
  "query": "UPDATE users SET last_login = ?, login_count = login_count + 1, status = 'active' WHERE id = ?",
  "params": ["{current_timestamp}", "{user_id}"]
}
```

#### Create Audit Table

```json
{
  "operation": "create",
  "database": "audit.db", 
  "query": "CREATE TABLE IF NOT EXISTS user_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT, details TEXT, ip_address TEXT, timestamp TEXT, INDEX idx_user_timestamp (user_id, timestamp))"
}
```

## 🔄 Best Practices

### 1. Use Template Placeholders Wisely

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

### 2. Structure Conditional Logic Clearly

```json
// ✅ Good - Clear conditions and meaningful outputs
{
  "conditions": [
    {
      "condition": {"field": "payment_status", "operator": "==", "value": "paid"},
      "output": {"next_action": "ship_order", "status": "processing"}
    },
    {
      "condition": {"field": "payment_status", "operator": "==", "value": "pending"}, 
      "output": {"next_action": "wait_payment", "status": "on_hold"}
    }
  ],
  "default": {"next_action": "cancel_order", "status": "cancelled"}
}
```

### 3. Use Parameterized Database Queries

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

### 4. Handle File Paths Properly

```json
// ✅ Good - Simple filename (auto-prefixed with safe directory)
{
  "operation": "write",
  "path": "report.txt",
  "content": "..."
}

// ✅ Good - Subdirectory organization  
{
  "operation": "write",
  "path": "reports/daily_report_{date}.txt",
  "content": "..."
}
```

### 5. Provide Meaningful Default Outputs

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

## 🚫 Common Pitfalls

### 1. Missing Template Data

When using `{field_name}` placeholders, ensure the field exists in the previous node's output, or the placeholder will be replaced with the literal string `undefined`.

### 2. File Path Security  

All file operations are automatically restricted to `/tmp/workflow_files/`. Don't try to access files outside this directory.

### 3. Database Connection Limits

Each database operation creates a new connection. For high-frequency operations, consider batching multiple operations.

### 4. Infinite Loops in Conditions

Be careful with conditional logic that might create circular dependencies in your workflow.

### 5. Large File Operations

File operations are suitable for text files and moderate data sizes. For large files (>100MB), consider alternative approaches.

## 🎯 Complete Workflow Example

Here's an example workflow using all four new node types:

### Workflow: User Registration Pipeline

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

This example demonstrates how the new node types work together to create sophisticated, data-driven workflows without writing custom code.

## 🎖️ Summary

The four new configuration-based node types provide powerful capabilities:

- **HTTP API Calls** for external service integration
- **File Operations** for data persistence and processing  
- **Conditional Logic** for intelligent workflow branching
- **Database Queries** for structured data management

Each node type uses JSON configuration with template placeholders for dynamic, data-driven workflows. Combined with the existing Python and TypeScript code nodes, these provide a complete toolkit for building complex automation workflows.

## 🤖 LLM AI Assistant Node

The LLM AI Assistant node integrates large language models into workflows via OpenRouter (cloud) or Ollama (local). It supports dynamic prompt templating and secure API key management.

### Basic Configuration

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3.5-sonnet",
  "prompt": "You are a helpful assistant. Process this data: {input}",
  "system": "",
  "temperature": 0.7,
  "max_tokens": 1000,
  "api_key_name": "OPENROUTER_API_KEY",
  "ollama_host": "http://localhost:11434"
}
```

### Parameters

- **`provider`** (string): LLM provider (`"openrouter"` or `"ollama"`)
- **`model`** (string): Model identifier (varies by provider)
- **`prompt`** (string): User prompt with template placeholders
- **`system`** (string): System prompt/instructions (optional)
- **`temperature`** (number): Randomness level (0.0-2.0, default: 0.7)
- **`max_tokens`** (number): Maximum response tokens (default: 1000)
- **`api_key_name`** (string): Environment variable name for API key
- **`ollama_host`** (string): Ollama server URL for local models

### Provider: OpenRouter (Cloud)

OpenRouter provides access to multiple LLM providers through a single API.

#### Setup

1. Create `.env` file in `/api/` directory:
```bash
# Copy from api/.env.example
cp api/.env.example api/.env
```

2. Add your OpenRouter API key:
```bash
# In api/.env
OPENROUTER_API_KEY=or-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Get API key from: https://openrouter.ai/keys

#### Popular Models

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3.5-sonnet",
  "prompt": "Analyze this data and provide insights: {input}",
  "temperature": 0.3,
  "max_tokens": 2000
}
```

**Available Models:**
- **Anthropic**: `anthropic/claude-3.5-sonnet`, `anthropic/claude-3-haiku`
- **OpenAI**: `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-3.5-turbo`
- **Meta**: `meta-llama/llama-3.1-405b-instruct`
- **Google**: `google/gemini-pro-1.5`
- **Mistral**: `mistralai/mistral-large`

### Provider: Ollama (Local)

Ollama allows running open-source LLMs locally on your network.

#### Setup

1. Install Ollama: https://ollama.ai/

2. Download a model:
```bash
ollama pull llama2
ollama pull codellama
ollama pull mistral
```

3. Configure host in `.env` (optional):
```bash
# Default: http://localhost:11434
OLLAMA_HOST=http://localhost:11434

# For other network hosts:
ALLOWED_OLLAMA_HOSTS=localhost,127.0.0.1,192.168.1.0/24,10.0.0.0/8
```

#### Configuration

```json
{
  "provider": "ollama",
  "model": "llama2:latest",
  "prompt": "Analyze and summarize this text: {content}",
  "system": "You are a helpful text analysis assistant.",
  "temperature": 0.6,
  "max_tokens": 1000,
  "ollama_host": "http://localhost:11434"
}
```

**Popular Ollama Models:**
- **Llama 2**: `llama2:latest`, `llama2:13b`, `llama2:70b`
- **Code Llama**: `codellama:latest`, `codellama:13b`
- **Mistral**: `mistral:latest`, `mistral:7b`
- **Neural Chat**: `neural-chat:latest`
- **Vicuna**: `vicuna:latest`

### Dynamic Prompt Templates

Use `{field_name}` placeholders in prompts to insert data from previous nodes.

#### Special Placeholders:
- **`{input}`** - Complete input data as JSON
- **`{field_name}`** - Specific field from input data

#### Example: Multi-Step Analysis

**Previous Node Output:**
```json
{
  "user_feedback": "The app is slow and crashes often",
  "user_rating": 2,
  "app_version": "1.2.3",
  "device": "iPhone 14",
  "timestamp": "2025-11-28T10:30:00Z"
}
```

**LLM Node Config:**
```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3.5-sonnet", 
  "prompt": "Analyze this user feedback and categorize the issues:\n\nFeedback: {user_feedback}\nRating: {user_rating}/5\nApp Version: {app_version}\nDevice: {device}\n\nProvide:\n1. Issue categories (performance, stability, usability)\n2. Severity assessment\n3. Recommended actions\n4. Priority level",
  "system": "You are a product manager analyzing user feedback. Provide structured, actionable analysis.",
  "temperature": 0.2,
  "max_tokens": 1000
}
```

### Output Format

#### OpenRouter Response

```json
{
  "content": "Based on the sales data analysis...",
  "model": "anthropic/claude-3.5-sonnet",
  "provider": "openrouter",
  "prompt": "Analyze this sales data and provide...",
  "tokens_used": 847,
  "finish_reason": "stop"
}
```

#### Ollama Response

```json
{
  "content": "The code review reveals several areas...",
  "model": "codellama:latest",
  "provider": "ollama", 
  "host": "http://localhost:11434",
  "prompt": "Review this code and provide...",
  "eval_count": 423,
  "eval_duration": 1234567
}
```

### Examples

#### Content Moderation Workflow

```json
{
  "provider": "openrouter",
  "model": "openai/gpt-4o",
  "prompt": "Moderate this user-generated content for policy violations:\n\nContent: {user_content}\nUser: {username}\nContext: {content_type}\n\nCheck for:\n1. Inappropriate language\n2. Spam content\n3. Misinformation\n4. Policy violations\n\nRespond with JSON: {\"approved\": boolean, \"issues\": [], \"confidence\": 0.0-1.0}",
  "system": "You are a content moderation assistant. Be thorough but fair in your analysis.",
  "temperature": 0.1,
  "max_tokens": 500
}
```

#### Smart Email Responses

```json
{
  "provider": "ollama",
  "model": "mistral:latest",
  "prompt": "Generate a professional email response:\n\nOriginal Email: {original_email}\nSender: {sender_name}\nContext: {email_context}\nDesired Tone: {response_tone}\n\nGenerate an appropriate response email.",
  "system": "You are a professional email assistant. Write clear, courteous, and effective business communications.",
  "temperature": 0.6,
  "max_tokens": 800,
  "ollama_host": "http://localhost:11434"
}
```

### Security Model

#### API Key Protection
- **🔐 Environment Variables**: API keys stored in `.env` file, never in workflow JSON
- **📝 Key Names**: Workflows reference key names (e.g., `OPENROUTER_API_KEY`), not actual keys  
- **🚫 No Exposure**: Keys never appear in logs, responses, or frontend
- **🎭 UI Masking**: Configuration editor shows key names, not values

#### Network Security
- **🏠 Local Only**: Ollama restricted to local network ranges (localhost, 192.168.x.x, 10.x.x.x)
- **✅ Validation**: Automatic CIDR range validation for Ollama hosts
- **🛡️ Timeout Protection**: Request timeouts prevent hanging executions
- **⚡ Rate Limiting**: Built-in aiohttp session management

The LLM node integrates seamlessly with other workflow nodes to create intelligent, AI-powered automation pipelines with both cloud and local AI capabilities.
