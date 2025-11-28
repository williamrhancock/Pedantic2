# How to Code Workflow Nodes

This guide explains how to write code for Python and TypeScript nodes in the visual workflow builder.

> **📋 For Configuration-Based Nodes**: If you're looking for information about HTTP API Calls, File Operations, Conditional Logic, or Database Query nodes, see **[HOW_TO_CONFIGURE_NODES.md](HOW_TO_CONFIGURE_NODES.md)**.

## 📚 Available Node Types

### Code-Based Nodes (This Guide)
- 🐍 **Python Nodes** - Execute Python scripts with restricted environment
- 🟦 **TypeScript Nodes** - Execute TypeScript/JavaScript with async support

### Configuration-Based Nodes ([Configuration Guide](HOW_TO_CONFIGURE_NODES.md))
- 🌐 **HTTP API Call Nodes** - Make requests to external APIs and web services
- 📁 **File Operation Nodes** - Read, write, and manipulate files
- 🔀 **Conditional Logic Nodes** - Branch workflow based on data conditions
- 🗄️ **Database Query Nodes** - Execute SQLite queries and operations

### Control Flow Nodes
- ▶️ **Start Nodes** - Begin workflow execution
- ⏹️ **End Nodes** - Complete workflow execution

## 🐍 Python Nodes

### Basic Structure

Every Python node must define a `run()` function that takes an `input` parameter and returns data:

```python
def run(input):
    # Your code here
    return {"result": "your output"}
```

### Data Flow Between Nodes

#### ✅ What You Can Access
- **`input` parameter**: Contains the complete output from the previous node
- **Return value**: What you return becomes the input for the next node

#### ❌ What You Cannot Access
- Local variables from previous nodes
- Imported modules from previous nodes
- Function definitions from previous nodes

### Example: Basic Data Processing

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

### Working with Time Zones

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

### Data Manipulation

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

### Working with External APIs

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

### Available Python Modules

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

## 🟦 TypeScript Nodes

### Basic Structure

Every TypeScript node must define a `run()` async function:

```typescript
async function run(input: any): Promise<any> {
    // Your code here
    return { result: "your output" };
}
```

### Example: Basic Processing

```typescript
async function run(input: any): Promise<any> {
    // Access data from previous node
    const message = input.message || 'No message';
    
    // Process the data
    const processed = `Processed: ${message}`;
    
    // Return data for next node
    return {
        processedMessage: processed,
        originalInput: input,
        timestamp: new Date().toISOString()
    };
}
```

### Working with APIs

```typescript
async function run(input: any): Promise<any> {
    const url = input.url || 'https://api.github.com/users/octocat';
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            success: true,
            data: data,
            statusCode: response.status,
            url: url
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            url: url
        };
    }
}
```

### Data Processing

```typescript
async function run(input: any): Promise<any> {
    // Extract array from input
    const numbers: number[] = input.numbers || [1, 2, 3, 4, 5];
    
    // Calculate statistics
    const total = numbers.reduce((sum, num) => sum + num, 0);
    const average = numbers.length > 0 ? total / numbers.length : 0;
    const maximum = Math.max(...numbers);
    const minimum = Math.min(...numbers);
    
    return {
        numbers: numbers,
        total: total,
        average: average,
        max: maximum,
        min: minimum,
        count: numbers.length
    };
}
```

## 🔄 Best Practices

### 1. Structure Your Returns
Always return objects with descriptive keys:

```python
# Good
return {
    "user_id": 123,
    "username": "john_doe",
    "email": "john@example.com",
    "is_active": True
}

# Avoid
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

### 4. Pass Through Important Data

```python
def run(input):
    # Process new data
    new_data = {"processed_at": datetime.now().isoformat()}
    
    # Combine with existing data
    return {
        **input,  # Pass through all previous data
        **new_data  # Add new data
    }
```

### 5. Use Meaningful Variable Names

```python
def run(input):
    # Good
    user_email = input.get('email')
    processed_timestamp = datetime.now().isoformat()
    
    # Avoid
    x = input.get('email')
    t = datetime.now().isoformat()
```

## 🚫 Common Pitfalls

### 1. Trying to Access Previous Node Variables

```python
# ❌ This won't work
def run(input):
    print(some_variable_from_previous_node)  # Error: not defined
```

### 2. Not Importing Required Modules

```python
# ❌ This won't work
def run(input):
    now = datetime.now()  # Error: datetime not imported

# ✅ This works
from datetime import datetime

def run(input):
    now = datetime.now()  # Works!
```

### 3. Returning Non-Serializable Data

```python
# ❌ Avoid
def run(input):
    return datetime.now()  # Can't serialize datetime objects

# ✅ Better
def run(input):
    return datetime.now().isoformat()  # String is serializable
```

### 4. Not Handling Missing Input Keys

```python
# ❌ Risky
def run(input):
    name = input['name']  # KeyError if 'name' doesn't exist

# ✅ Safe
def run(input):
    name = input.get('name', 'Unknown')  # Provides default
```

## 🎯 Complete Example: Multi-Step Data Pipeline

### Node 1: Data Fetcher
```python
import requests

def run(input):
    api_key = input.get('api_key', 'demo')
    endpoint = input.get('endpoint', 'users')
    
    try:
        response = requests.get(f'https://api.example.com/{endpoint}', 
                              headers={'Authorization': f'Bearer {api_key}'})
        response.raise_for_status()
        
        return {
            "success": True,
            "data": response.json(),
            "endpoint": endpoint,
            "fetched_at": datetime.now().isoformat()
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Node 2: Data Processor
```python
def run(input):
    if not input.get('success'):
        return input  # Pass through error
    
    users = input['data']
    
    # Process user data
    processed_users = []
    for user in users:
        processed_users.append({
            "id": user['id'],
            "name": user['name'].title(),
            "email": user['email'].lower(),
            "joined_year": user['created_at'][:4]
        })
    
    return {
        "success": True,
        "original_count": len(users),
        "processed_users": processed_users,
        "processed_at": datetime.now().isoformat(),
        "source": input['endpoint']
    }
```

### Node 3: Report Generator
```python
def run(input):
    if not input.get('success'):
        return input  # Pass through error
    
    users = input['processed_users']
    
    # Generate summary
    total_users = len(users)
    year_counts = {}
    
    for user in users:
        year = user['joined_year']
        year_counts[year] = year_counts.get(year, 0) + 1
    
    return {
        "report": {
            "total_users": total_users,
            "users_by_year": year_counts,
            "most_active_year": max(year_counts, key=year_counts.get) if year_counts else None,
            "generated_at": datetime.now().isoformat()
        },
        "raw_data": input['processed_users']
    }
```

This pipeline demonstrates how data flows between nodes, with each node building upon the previous node's output while handling errors gracefully.