import asyncio
import json
import os
import resource
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from RestrictedPython import compile_restricted, safe_globals

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://localhost:3006",
        "http://localhost:3007",
        "http://localhost:3008",
        "http://localhost:3009",
        "http://localhost:3010"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Node(BaseModel):
    id: str
    data: Dict[str, Any]
    inputs: Dict[str, Any] = {}
    outputs: Dict[str, Any] = {}

class Connection(BaseModel):
    id: str
    source: str
    target: str
    sourceOutput: str
    targetInput: str

class WorkflowRequest(BaseModel):
    workflow: dict

class NodeResult(BaseModel):
    id: str
    status: str
    output: Any = None
    stdout: str = ""
    stderr: str = ""
    error: Optional[str] = None
    execution_time: float = 0.0

class WorkflowResult(BaseModel):
    status: str
    nodes: List[NodeResult]
    total_time: float
    error: Optional[str] = None

def topological_sort(nodes: List[Node], connections: List[Connection]) -> List[Node]:
    """Topologically sort nodes based on connections"""
    # Build adjacency list
    graph = {node.id: [] for node in nodes}
    in_degree = {node.id: 0 for node in nodes}
    
    for conn in connections:
        graph[conn.source].append(conn.target)
        in_degree[conn.target] += 1
    
    # Find nodes with no incoming edges
    queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
    result = []
    
    while queue:
        node_id = queue.pop(0)
        result.append(node_id)
        
        # Remove this node and update in-degrees
        for neighbor in graph[node_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    if len(result) != len(nodes):
        raise ValueError("Circular dependency detected in workflow")
    
    # Return nodes in topological order
    node_map = {node.id: node for node in nodes}
    return [node_map[node_id] for node_id in result]

def execute_python_code(code: str, input_data: Any) -> Dict[str, Any]:
    """Execute Python code with restrictions"""
    try:
        # Set memory limit (256 MB)
        resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
        
        # Compile restricted Python code
        compiled_code = compile_restricted(code, '<string>', 'exec')
        if compiled_code is None:
            return {
                'status': 'error',
                'error': 'Failed to compile Python code',
                'output': None,
                'stdout': '',
                'stderr': ''
            }
        
        # Create safe globals with input data
        restricted_globals = safe_globals.copy()
        restricted_globals['input'] = input_data
        restricted_globals['__builtins__']['_print_'] = lambda *args: print(*args)
        restricted_globals['__builtins__']['_iter_unpack_sequence_'] = lambda seq, spec=2: seq
        restricted_globals['__builtins__']['enumerate'] = enumerate
        restricted_globals['__builtins__']['sorted'] = sorted
        
        # Capture stdout/stderr
        import sys
        from io import StringIO
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        stdout_capture = StringIO()
        stderr_capture = StringIO()
        sys.stdout = stdout_capture
        sys.stderr = stderr_capture
        
        result = None
        try:
            # Execute with timeout
            start_time = time.time()
            exec(compiled_code, restricted_globals)
            
            # Try to get the result from the 'run' function
            if 'run' in restricted_globals:
                result = restricted_globals['run'](input_data)
            else:
                result = input_data
                
            execution_time = time.time() - start_time
            
            return {
                'status': 'success',
                'output': result,
                'stdout': stdout_capture.getvalue(),
                'stderr': stderr_capture.getvalue(),
                'execution_time': execution_time
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'output': None,
                'stdout': stdout_capture.getvalue(),
                'stderr': stderr_capture.getvalue()
            }
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            
    except Exception as e:
        return {
            'status': 'error',
            'error': f'Execution failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': ''
        }

def strip_typescript_types(ts_code: str) -> str:
    """Simple TypeScript to JavaScript converter - strips type annotations"""
    import re
    
    # Remove interface definitions (complete blocks) - handle nested structures properly
    js_code = re.sub(r'interface\s+\w+\s*\{(?:[^{}]|\{[^{}]*\})*\}', '', ts_code, flags=re.MULTILINE | re.DOTALL)
    
    # Remove function return type annotations after closing parenthesis
    js_code = re.sub(r'\)\s*:\s*[A-Za-z_$][\w<>]*(?=\s*\{)', ')', js_code)
    
    # Remove type assertions like 'as Record<string, number>' completely
    js_code = re.sub(r'\s+as\s+[A-Za-z_$][\w]*(?:<[^>]*>)?', '', js_code)
    
    # Remove generic types like Record<string, string> from variable declarations
    js_code = re.sub(r':\s*[A-Za-z_$][\w]*<[^>]*>(?=\s*=)', '', js_code)
    
    # Remove parameter type annotations ONLY within function parameter lists
    def remove_param_types(match):
        func_signature = match.group(0)
        # Only remove type annotations within the parentheses
        cleaned = re.sub(r'(\w+)\s*:\s*[A-Za-z_$][\w<>\[\]]*(?=\s*[,)])', r'\1', func_signature)
        return cleaned
    
    # Match function signatures and clean their parameters
    js_code = re.sub(r'function\s+\w+\s*\([^)]*\)', remove_param_types, js_code)
    js_code = re.sub(r'\w+\s*\([^)]*\)\s*=>', remove_param_types, js_code)
    
    # Clean up multiple newlines and extra spaces
    js_code = re.sub(r'\n\s*\n\s*\n', '\n\n', js_code)
    js_code = re.sub(r'^\s*\n', '', js_code)
    
    return js_code.strip()

async def execute_typescript_code(code: str, input_data: Any) -> Dict[str, Any]:
    """Execute TypeScript code using Node.js (converts TS to JS first)"""
    try:
        # Convert TypeScript to JavaScript
        js_code = strip_typescript_types(code)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            # Wrap the code to handle input/output
            wrapped_code = f"""
{js_code}

// Input data
const input = {json.dumps(input_data)};

// Execute and capture result
(async () => {{
    try {{
        const result = await run(input);
        console.log(JSON.stringify({{ success: true, result }}));
    }} catch (error) {{
        console.error(JSON.stringify({{ success: false, error: error.message }}));
    }}
}})();
"""
            f.write(wrapped_code)
            temp_path = f.name
        
        try:
            # Execute with Node.js
            start_time = time.time()
            process = await asyncio.create_subprocess_exec(
                'node', temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=5.0
            )
            
            execution_time = time.time() - start_time
            
            stdout_str = stdout.decode('utf-8')
            stderr_str = stderr.decode('utf-8')
            
            # Parse the result
            try:
                if stdout_str.strip():
                    result_data = json.loads(stdout_str.strip().split('\n')[-1])
                    if result_data.get('success'):
                        return {
                            'status': 'success',
                            'output': result_data['result'],
                            'stdout': stdout_str,
                            'stderr': stderr_str,
                            'execution_time': execution_time
                        }
                    else:
                        return {
                            'status': 'error',
                            'error': result_data.get('error', 'Unknown error'),
                            'output': None,
                            'stdout': stdout_str,
                            'stderr': stderr_str
                        }
                else:
                    return {
                        'status': 'error',
                        'error': 'No output from TypeScript execution',
                        'output': None,
                        'stdout': stdout_str,
                        'stderr': stderr_str
                    }
            except json.JSONDecodeError:
                return {
                    'status': 'error',
                    'error': 'Failed to parse execution result',
                    'output': None,
                    'stdout': stdout_str,
                    'stderr': stderr_str
                }
            
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
                
    except asyncio.TimeoutError:
        return {
            'status': 'error',
            'error': 'Execution timeout (5 seconds)',
            'output': None,
            'stdout': '',
            'stderr': ''
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': f'Execution failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': ''
        }

@app.post("/run")
async def run_workflow(request: dict):
    """Execute a workflow"""
    try:
        print("=== DEBUGGING WORKFLOW EXECUTION ===")
        print(f"Raw request: {request}")
        print(f"Request type: {type(request)}")
        
        workflow = request.get('workflow', {})
        print(f"Workflow: {workflow}")
        print(f"Workflow type: {type(workflow)}")
        
        start_time = time.time()
        
        # Parse nodes
        nodes = []
        nodes_data = workflow.get('nodes', {})
        print(f"Nodes data: {nodes_data}")
        
        for node_id, node_data in nodes_data.items():
            print(f"Processing node {node_id}: {node_data}")
            nodes.append({
                'id': node_id,
                'data': node_data
            })
        
        # Parse connections
        connections = []
        connections_data = workflow.get('connections', {})
        print(f"Connections data: {connections_data}")
        
        for conn_id, conn_data in connections_data.items():
            print(f"Processing connection {conn_id}: {conn_data}")
            if isinstance(conn_data, dict):
                connections.append({
                    'id': conn_id,
                    'source': conn_data['source'],
                    'target': conn_data['target'],
                    'sourceOutput': conn_data['sourceOutput'],
                    'targetInput': conn_data['targetInput']
                })
        
        print(f"Parsed {len(nodes)} nodes and {len(connections)} connections")
        
        # Execute nodes in simple order (for now, skip topological sort)
        node_results = []
        node_outputs = {}
        
        print("Starting node execution...")
        for node in nodes:
            node_id = node['id']
            node_data = node['data']
            node_type = node_data.get('type', '')
            
            print(f"Executing node {node_id} of type {node_type}")
            
            # Determine input for this node
            input_data = {}
            for conn in connections:
                if conn['target'] == node_id:
                    source_output = node_outputs.get(conn['source'])
                    if source_output is not None:
                        input_data = source_output
                        break
            
            result = {
                'id': node_id,
                'status': 'running',
                'output': None,
                'stdout': '',
                'stderr': '',
                'execution_time': 0.0,
                'error': None
            }
            
            try:
                if node_type == 'start':
                    exec_result = {
                        'status': 'success',
                        'output': {'message': 'Workflow started'},
                        'stdout': 'Start node executed',
                        'stderr': '',
                        'execution_time': 0.0
                    }
                    
                elif node_type == 'end':
                    exec_result = {
                        'status': 'success',
                        'output': input_data,
                        'stdout': 'End node executed',
                        'stderr': '',
                        'execution_time': 0.0
                    }
                    
                elif node_type == 'python':
                    code = node_data.get('code', 'def run(input):\n    return input')
                    print(f"Executing Python code: {code}")
                    exec_result = execute_python_code(code, input_data)
                    
                elif node_type == 'typescript':
                    code = node_data.get('code', 'async function run(input: any): Promise<any> {\n    return input;\n}')
                    print(f"Executing TypeScript code: {code}")
                    exec_result = await execute_typescript_code(code, input_data)
                    
                else:
                    exec_result = {
                        'status': 'error',
                        'error': f'Unknown node type: {node_type}',
                        'output': None,
                        'stdout': '',
                        'stderr': ''
                    }
                
                # Update result
                result.update(exec_result)
                
                # Store output for next nodes
                node_outputs[node_id] = exec_result['output']
                print(f"Node {node_id} completed with status: {exec_result['status']}")
                
            except Exception as e:
                print(f"Error executing node {node_id}: {e}")
                result['status'] = 'error'
                result['error'] = str(e)
                node_outputs[node_id] = None
            
            node_results.append(result)
            
            # Stop execution if a node failed
            if result['status'] == 'error':
                break
        
        total_time = time.time() - start_time
        
        # Determine overall status
        overall_status = 'success'
        overall_error = None
        for result in node_results:
            if result['status'] == 'error':
                overall_status = 'error'
                overall_error = f"Node {result['id']} failed: {result.get('error', 'Unknown error')}"
                break
        
        final_result = {
            'status': overall_status,
            'nodes': node_results,
            'total_time': total_time,
            'error': overall_error
        }
        
        print(f"Final result: {final_result}")
        return final_result
        
    except Exception as e:
        print(f"Workflow execution error: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'status': 'error',
            'nodes': [],
            'total_time': 0.0,
            'error': str(e)
        }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)