# Complete Node Type Test Workflow

This workflow comprehensively tests all available node types in the Visual Agentic Workflow Builder.

## Workflow Overview

This test workflow exercises **all 9 node types** in sequence:

1. **Start Node** - Initiates the workflow
2. **Python Node (Data Generator)** - Generates test data
3. **TypeScript Node (Processor)** - Processes and enhances the data
4. **HTTP API Node** - Makes an external API call
5. **File Operations Node** - Writes data to a file
6. **Python Node (Merge Data)** - Merges file operation results with original data
7. **Conditional Logic Node** - Branches based on score thresholds
8. **Python Node (Flatten Output)** - Flattens conditional logic output structure
9. **Database Query Node (Create)** - Creates a SQLite table
10. **Database Query Node (Insert)** - Inserts workflow results into the database
11. **LLM AI Assistant Node** - Generates an AI summary
12. **Python Node (Finalizer)** - Collects all results and creates final summary
13. **End Node** - Completes the workflow

## Node Details

### 1. Python Data Generator
- Generates sample test data including workflow_id, user_id, status, score, message, and metadata
- Uses Python's `datetime` and `random` modules

### 2. TypeScript Processor
- Processes data from Python node
- Adds enhanced fields and summary information
- Demonstrates async/await functionality

### 3. HTTP API Test
- Makes a GET request to `https://jsonplaceholder.typicode.com/posts/1`
- Tests external API integration
- Returns JSON response data

### 4. File Operations Test
- Writes a formatted text file to `/tmp/workflow_files/test_workflow_output.txt`
- Uses template placeholders to insert data from previous nodes
- Tests file write operation

### 5. Python Merge Data
- Merges file operation results with original data
- Prepares data structure for conditional logic testing
- Ensures all required fields are available

### 6. Conditional Logic Test
- Tests branching logic based on score thresholds:
  - Score >= 80: High score (premium level)
  - Score >= 60: Medium score (standard level)
  - Score < 60: Low score (basic level)
- Returns appropriate action and level based on condition

### 7. Python Flatten Output
- Extracts data from conditional logic's nested output structure
- Flattens for easier template access in subsequent nodes
- Makes fields available for database operations

### 8. Database Query (Create)
- Creates a SQLite table `workflow_results` in `/tmp/workflow_dbs/test_workflow.db`
- Tests database schema creation

### 9. Database Query (Insert)
- Inserts workflow results into the database
- Uses parameterized queries with template placeholders
- Tests data persistence

### 10. LLM AI Assistant Test
- Sends a summary request to OpenRouter (Claude 3.5 Sonnet)
- Requires `OPENROUTER_API_KEY` environment variable
- Generates a brief summary of the workflow test data
- **Note**: Will fail if API key is not configured, but workflow will continue

### 11. Python Finalizer
- Collects all workflow results
- Creates comprehensive test summary
- Reports success/failure status for each node type
- Returns final workflow completion data

## How to Use

### Import the Workflow

1. Open the Workflow Builder
2. Click the **Import** button (folder with arrow icon)
3. Select `Complete_Node_Type_Test_Workflow.json`
4. The workflow will be loaded with all nodes configured

### Execute the Workflow

1. Click the **▶ Execute** button
2. Watch the execution logs in the right panel
3. Each node will execute in sequence
4. Check the final summary in the logs

### Expected Results

- **Python nodes**: Should execute successfully and return data
- **TypeScript node**: Should process data and add enhanced fields
- **HTTP API**: Should fetch data from JSONPlaceholder API
- **File Operations**: Should create `test_workflow_output.txt` in `/tmp/workflow_files/`
- **Conditional Logic**: Should evaluate score and return appropriate level
- **Database Operations**: Should create table and insert record in `/tmp/workflow_dbs/test_workflow.db`
- **LLM AI**: May fail if API key not configured, but workflow continues
- **Final Summary**: Should show test results for all node types

### Prerequisites

- **OpenRouter API Key** (optional, for LLM node):
  - Add to `api/.env`: `OPENROUTER_API_KEY=your-key-here`
  - Or use Ollama by changing provider to `"ollama"` and model to `"llama2:latest"`

### File Locations

- **Output File**: `/tmp/workflow_files/test_workflow_output.txt`
- **Database**: `/tmp/workflow_dbs/test_workflow.db`
- **Table**: `workflow_results`

## Testing Each Node Type

This workflow is designed to test:

✅ **Start/End Nodes** - Workflow control flow  
✅ **Python Nodes** - Code execution with RestrictedPython  
✅ **TypeScript Nodes** - Async code execution with Node.js  
✅ **HTTP API Nodes** - External API integration  
✅ **File Operation Nodes** - File system operations  
✅ **Conditional Logic Nodes** - Branching and decision making  
✅ **Database Query Nodes** - SQLite database operations  
✅ **LLM AI Assistant Nodes** - AI model integration  

## Troubleshooting

- **LLM Node Fails**: Ensure `OPENROUTER_API_KEY` is set in `api/.env`, or switch to Ollama
- **File Operations Fail**: Check that `/tmp/workflow_files/` directory exists and is writable
- **Database Operations Fail**: Check that `/tmp/workflow_dbs/` directory exists and is writable
- **HTTP API Fails**: Check internet connection and API availability

## Workflow Flow Diagram

```
Start → Python (Generate) → TypeScript (Process) → HTTP API → File Ops
  → Python (Merge) → Conditional Logic → Python (Flatten) → DB Create
  → DB Insert → LLM AI → Python (Finalize) → End
```

## Notes

- The workflow uses template placeholders (`{field_name}`) to pass data between nodes
- Some nodes require specific data structures from previous nodes
- The conditional logic node returns a nested structure that needs flattening
- Database operations use parameterized queries for security
- All file and database operations are restricted to safe directories (`/tmp/workflow_*`)

