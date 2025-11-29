import asyncio
import json
import os
import resource
import subprocess
import tempfile
import time
from typing import Any, Dict, List, Optional
import aiohttp
import aiofiles
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
import re
import ipaddress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from RestrictedPython import compile_restricted, safe_globals

# Load environment variables
load_dotenv()

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

def execute_python_code(code: str, input_data: Any) -> Dict[str, Any]:
    """Execute Python code with restrictions"""
    try:
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
        
        # Create safe globals with input data and import capabilities
        restricted_globals = safe_globals.copy()
        restricted_globals['input'] = input_data
        
        # Add safe import functionality
        allowed_modules = {
            'json', 'math', 'random', 'datetime', 'time', 're', 'base64',
            'hashlib', 'collections', 'itertools', 'functools', 'operator',
            'statistics', 'decimal', 'fractions', 'uuid', 'string', 'pytz',
            'calendar', 'copy', 'heapq', 'bisect', 'array', 'enum',
            'dataclasses', 'typing', 'zoneinfo', 'urllib.parse', 'html',
            'csv', 'codecs', 'textwrap', 'difflib', 'pprint', 'numpy',
            'pandas', 'requests', 'urllib', 'urllib.request', 'urllib.error'
        }
        
        def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name not in allowed_modules:
                raise ImportError(f"Module '{name}' is not allowed")
            return __import__(name, globals, locals, fromlist, level)
        
        # Import proper RestrictedPython print support
        from RestrictedPython.PrintCollector import PrintCollector
        
        restricted_globals['__import__'] = safe_import
        restricted_globals['_print_'] = PrintCollector
        restricted_globals['_getattr_'] = getattr
        restricted_globals['_getitem_'] = lambda obj, index: obj[index]
        restricted_globals['_getiter_'] = iter
        restricted_globals['_iter_unpack_sequence_'] = lambda seq, spec=2: seq
        
        # Add essential built-in types and functions
        restricted_globals['dict'] = dict
        restricted_globals['list'] = list
        restricted_globals['tuple'] = tuple
        restricted_globals['set'] = set
        restricted_globals['str'] = str
        restricted_globals['int'] = int
        restricted_globals['float'] = float
        restricted_globals['bool'] = bool
        restricted_globals['len'] = len
        restricted_globals['min'] = min
        restricted_globals['max'] = max
        restricted_globals['sum'] = sum
        restricted_globals['abs'] = abs
        restricted_globals['round'] = round
        restricted_globals['range'] = range
        restricted_globals['enumerate'] = enumerate
        restricted_globals['zip'] = zip
        restricted_globals['isinstance'] = isinstance
        restricted_globals['type'] = type
        restricted_globals['hasattr'] = hasattr
        restricted_globals['sorted'] = sorted
        
        restricted_globals['__builtins__'] = restricted_globals.get('__builtins__', {})
        if isinstance(restricted_globals['__builtins__'], dict):
            restricted_globals['__builtins__']['__import__'] = safe_import
            restricted_globals['__builtins__']['_print_'] = PrintCollector
            restricted_globals['__builtins__']['dict'] = dict
            restricted_globals['__builtins__']['list'] = list
            restricted_globals['__builtins__']['isinstance'] = isinstance
        
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
    
    # Remove interface definitions - use bracket counting for proper nesting
    def remove_interfaces(text):
        result = []
        i = 0
        while i < len(text):
            # Look for interface keyword
            interface_match = re.match(r'interface\s+\w+\s*\{', text[i:])
            if interface_match:
                # Found interface start, now find matching closing brace
                start_pos = i + interface_match.end() - 1  # Position of opening brace
                brace_count = 1
                current_pos = start_pos + 1
                
                while current_pos < len(text) and brace_count > 0:
                    if text[current_pos] == '{':
                        brace_count += 1
                    elif text[current_pos] == '}':
                        brace_count -= 1
                    current_pos += 1
                
                if brace_count == 0:
                    # Successfully found complete interface, skip it
                    i = current_pos
                    continue
            
            # Not an interface or incomplete interface, keep the character
            result.append(text[i])
            i += 1
        
        return ''.join(result)
    
    js_code = remove_interfaces(ts_code)
    
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
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            wrapped_code = f"""
{js_code}

const input = {json.dumps(input_data)};

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
                
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass
                
    except Exception as e:
        return {
            'status': 'error',
            'error': f'Execution failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': ''
        }

async def execute_http_request(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute HTTP/API request"""
    try:
        method = config.get('method', 'GET').upper()
        url = config.get('url', '')
        headers = config.get('headers', {})
        params = config.get('params', {})
        body = config.get('body', {})
        timeout = config.get('timeout', 30)
        
        # Replace placeholders in URL, headers, params, and body with input data
        def replace_placeholders(obj, data):
            if isinstance(obj, str):
                try:
                    # Simple template replacement using input data
                    import re
                    for key, value in (data.items() if isinstance(data, dict) else {}):
                        obj = obj.replace(f'{{{key}}}', str(value))
                    return obj
                except:
                    return obj
            elif isinstance(obj, dict):
                return {k: replace_placeholders(v, data) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [replace_placeholders(item, data) for item in obj]
            return obj
        
        processed_url = replace_placeholders(url, input_data)
        processed_headers = replace_placeholders(headers, input_data)
        processed_params = replace_placeholders(params, input_data)
        processed_body = replace_placeholders(body, input_data)
        
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                processed_url,
                headers=processed_headers,
                params=processed_params,
                json=processed_body if method in ['POST', 'PUT', 'PATCH'] else None,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_text = await response.text()
                
                try:
                    response_data = json.loads(response_text)
                except json.JSONDecodeError:
                    response_data = response_text
                
                execution_time = time.time() - start_time
                
                return {
                    'status': 'success',
                    'output': {
                        'status_code': response.status,
                        'headers': dict(response.headers),
                        'data': response_data,
                        'url': str(response.url),
                        'method': method
                    },
                    'stdout': f"HTTP {method} {processed_url} -> {response.status}",
                    'stderr': '',
                    'execution_time': execution_time
                }
                
    except Exception as e:
        return {
            'status': 'error',
            'error': f'HTTP request failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

async def execute_file_operation(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute file operation"""
    try:
        operation = config.get('operation', 'read')
        file_path = config.get('path', '')
        content = config.get('content', '')
        encoding = config.get('encoding', 'utf-8')
        
        # Security check - restrict to safe paths
        safe_base = Path('/tmp/workflow_files')
        safe_base.mkdir(exist_ok=True)
        
        if not file_path.startswith('/tmp/workflow_files/'):
            file_path = str(safe_base / Path(file_path).name)
        
        file_path_obj = Path(file_path)
        start_time = time.time()
        result_data = {}
        
        if operation == 'read':
            if not file_path_obj.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            async with aiofiles.open(file_path, 'r', encoding=encoding) as f:
                content_data = await f.read()
                result_data = {
                    'content': content_data,
                    'path': file_path,
                    'size': file_path_obj.stat().st_size,
                    'operation': 'read'
                }
                
        elif operation == 'write':
            # Replace content placeholders with input data
            if isinstance(input_data, dict):
                for key, value in input_data.items():
                    content = content.replace(f'{{{key}}}', str(value))
            
            async with aiofiles.open(file_path, 'w', encoding=encoding) as f:
                await f.write(content)
                result_data = {
                    'path': file_path,
                    'bytes_written': len(content.encode(encoding)),
                    'operation': 'write'
                }
                
        elif operation == 'append':
            # Replace content placeholders with input data
            if isinstance(input_data, dict):
                for key, value in input_data.items():
                    content = content.replace(f'{{{key}}}', str(value))
            
            async with aiofiles.open(file_path, 'a', encoding=encoding) as f:
                await f.write(content)
                result_data = {
                    'path': file_path,
                    'bytes_appended': len(content.encode(encoding)),
                    'operation': 'append'
                }
                
        elif operation == 'delete':
            if file_path_obj.exists():
                file_path_obj.unlink()
                result_data = {
                    'path': file_path,
                    'operation': 'delete',
                    'success': True
                }
            else:
                raise FileNotFoundError(f"File not found: {file_path}")
                
        elif operation == 'list':
            dir_path = file_path_obj if file_path_obj.is_dir() else file_path_obj.parent
            files = [str(f) for f in dir_path.iterdir()]
            result_data = {
                'path': str(dir_path),
                'files': files,
                'count': len(files),
                'operation': 'list'
            }
            
        execution_time = time.time() - start_time
        
        return {
            'status': 'success',
            'output': result_data,
            'stdout': f"File operation '{operation}' completed on {file_path}",
            'stderr': '',
            'execution_time': execution_time
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': f'File operation failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

async def execute_conditional_logic(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute conditional logic"""
    try:
        condition_type = config.get('type', 'if')
        conditions = config.get('conditions', [])
        default_output = config.get('default', input_data)
        
        start_time = time.time()
        
        # Helper function to evaluate conditions
        def evaluate_condition(condition_config, data):
            field = condition_config.get('field', '')
            operator = condition_config.get('operator', '==')
            value = condition_config.get('value', '')
            
            # Extract field value from input data
            if isinstance(data, dict):
                field_value = data.get(field, None)
            else:
                field_value = data
            
            # Convert types for comparison
            try:
                if isinstance(value, str) and value.isdigit():
                    value = int(value)
                elif isinstance(value, str) and value.replace('.', '').isdigit():
                    value = float(value)
            except:
                pass
            
            # Evaluate condition
            if operator == '==':
                return field_value == value
            elif operator == '!=':
                return field_value != value
            elif operator == '>':
                return field_value > value
            elif operator == '<':
                return field_value < value
            elif operator == '>=':
                return field_value >= value
            elif operator == '<=':
                return field_value <= value
            elif operator == 'contains':
                return value in str(field_value)
            elif operator == 'exists':
                return field_value is not None
            else:
                return False
        
        result_output = default_output
        matched_condition = None
        
        for i, condition in enumerate(conditions):
            condition_expr = condition.get('condition', {})
            condition_output = condition.get('output', input_data)
            
            if evaluate_condition(condition_expr, input_data):
                result_output = condition_output
                matched_condition = i
                break
        
        execution_time = time.time() - start_time
        
        return {
            'status': 'success',
            'output': {
                'result': result_output,
                'matched_condition': matched_condition,
                'input': input_data,
                'condition_type': condition_type
            },
            'stdout': f"Condition evaluated: matched condition {matched_condition}" if matched_condition is not None else "No conditions matched, using default",
            'stderr': '',
            'execution_time': execution_time
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': f'Conditional logic failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

async def execute_database_query(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute database query (SQLite only for security)"""
    try:
        query = config.get('query', '')
        params = config.get('params', [])
        database = config.get('database', 'workflow.db')
        operation = config.get('operation', 'select')
        
        # Security check - only allow SQLite databases in safe directory
        safe_db_dir = Path('/tmp/workflow_dbs')
        safe_db_dir.mkdir(exist_ok=True)
        
        if not database.startswith('/tmp/workflow_dbs/'):
            database = str(safe_db_dir / Path(database).name)
        
        start_time = time.time()
        
        # Replace query placeholders with input data
        processed_params = params.copy()
        if isinstance(input_data, dict):
            for key, value in input_data.items():
                query = query.replace(f'{{{key}}}', str(value))
                if f':{key}' in query:
                    processed_params.append(value)
        
        with sqlite3.connect(database) as conn:
            conn.row_factory = sqlite3.Row  # For dict-like access
            cursor = conn.cursor()
            
            if operation == 'select':
                cursor.execute(query, processed_params)
                rows = cursor.fetchall()
                result_data = [dict(row) for row in rows]
                
            elif operation in ['insert', 'update', 'delete']:
                cursor.execute(query, processed_params)
                conn.commit()
                result_data = {
                    'rows_affected': cursor.rowcount,
                    'last_row_id': cursor.lastrowid if operation == 'insert' else None
                }
                
            elif operation == 'create':
                cursor.execute(query)
                conn.commit()
                result_data = {'table_created': True}
                
            else:
                raise ValueError(f"Unsupported database operation: {operation}")
        
        execution_time = time.time() - start_time
        
        return {
            'status': 'success',
            'output': {
                'data': result_data,
                'operation': operation,
                'database': database,
                'query': query[:100] + '...' if len(query) > 100 else query
            },
            'stdout': f"Database {operation} completed on {database}",
            'stderr': '',
            'execution_time': execution_time
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': f'Database query failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

def is_local_network_host(host: str) -> bool:
    """Check if host is in allowed local network ranges"""
    try:
        # Parse URL to get hostname
        from urllib.parse import urlparse
        parsed = urlparse(host if '://' in host else f'http://{host}')
        hostname = parsed.hostname
        
        if not hostname:
            return False
            
        # Check against allowed patterns
        allowed_hosts = os.getenv('ALLOWED_OLLAMA_HOSTS', 'localhost,127.0.0.1,192.168.0.0/16,10.0.0.0/8').split(',')
        
        for allowed in allowed_hosts:
            allowed = allowed.strip()
            if hostname == allowed:
                return True
            if hostname == 'localhost' or hostname == '127.0.0.1':
                return True
            # Check CIDR ranges
            if '/' in allowed:
                try:
                    network = ipaddress.ip_network(allowed, strict=False)
                    host_ip = ipaddress.ip_address(hostname)
                    if host_ip in network:
                        return True
                except:
                    continue
        return False
    except:
        return False

async def execute_llm_request(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute LLM request via OpenRouter, OpenAI-style providers, or Ollama.

    Normalized LlmConfig fields:
      - provider: optional, default 'openrouter'
      - model: model string
      - temperature: float
      - max_tokens: int
      - system: system prompt text
      - user: user prompt text (upstream input is appended)
      - api_key: optional per-node API key override
      - api_key_name: optional env var name (legacy)
    """
    try:
        provider = config.get('provider') or 'openrouter'
        model = config.get('model') or 'gpt-4o-mini'
        # Prefer new 'user' field; fall back to legacy 'prompt'
        user_prompt = config.get('user') or config.get('prompt') or 'Process this data.'
        system_prompt = config.get('system') or ''
        temperature = float(config.get('temperature', 0.7))
        max_tokens = int(config.get('max_tokens', 1000))
        api_key_override = config.get('api_key')
        api_key_name = config.get('api_key_name', 'OPENROUTER_API_KEY')
        base_url = config.get('base_url') or ''
        ollama_host = config.get('ollama_host', os.getenv('OLLAMA_HOST', 'http://localhost:11434'))
        
        # Build final user content by appending upstream input as JSON
        upstream_str = ''
        if input_data is not None and input_data != {}:
            try:
                upstream_str = json.dumps(input_data, ensure_ascii=False)
            except Exception:
                upstream_str = str(input_data)
        
        if upstream_str:
            processed_user = f"{user_prompt}\n{upstream_str}"
        else:
            processed_user = user_prompt
        
        processed_system = system_prompt
        
        start_time = time.time()
        
        # OpenAI-style chat completion providers
        if provider in ('openrouter', 'openai', 'groq', 'together', 'fireworks', 'deepinfra', 'perplexity', 'mistral'):
            # For OpenRouter we still allow falling back to an env var for compatibility.
            if provider == 'openrouter':
                api_key = api_key_override or os.getenv(api_key_name)
                if not api_key:
                    raise ValueError(f"API key '{api_key_name}' not found in environment variables")
                chat_url = 'https://openrouter.ai/api/v1/chat/completions'
                extra_headers = {
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Workflow Builder'
                }
            else:
                # For other providers we currently require a per-node API key.
                api_key = api_key_override
                if not api_key:
                    raise ValueError(f"API key is required for provider '{provider}'")

                # Allow overriding the base URL via config.base_url for self-hosted proxies.
                if base_url:
                    url = base_url.rstrip('/') + '/chat/completions'
                else:
                    provider_chat_endpoints = {
                        'openai': 'https://api.openai.com/v1/chat/completions',
                        'groq': 'https://api.groq.com/openai/v1/chat/completions',
                        'together': 'https://api.together.xyz/v1/chat/completions',
                        'fireworks': 'https://api.fireworks.ai/inference/v1/chat/completions',
                        'deepinfra': 'https://api.deepinfra.com/v1/openai/chat/completions',
                        'perplexity': 'https://api.perplexity.ai/openai/v1/chat/completions',
                        'mistral': 'https://api.mistral.ai/v1/chat/completions',
                    }
                    url = provider_chat_endpoints.get(provider)
                    if not url:
                        raise ValueError(f"Chat completions endpoint not configured for provider '{provider}'")

                chat_url = url
                extra_headers = {}

            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                **extra_headers,
            }
            
            payload = {
                'model': model,
                'messages': [
                    {'role': 'user', 'content': processed_user}
                ],
                'temperature': temperature,
                'max_tokens': max_tokens
            }
            
            if processed_system:
                payload['messages'].insert(0, {'role': 'system', 'content': processed_system})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    chat_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    response_data = await response.json()
                    
                    if response.status != 200:
                        raise Exception(f"{provider} API error: {response.status} - {response_data.get('error', 'Unknown error')}")
                    
                    if 'choices' not in response_data or not response_data['choices']:
                        raise Exception("No response from LLM")
                    
                    content = response_data['choices'][0]['message']['content']
                    
                    execution_time = time.time() - start_time
                    
                    return {
                        'status': 'success',
                        'output': {
                            'content': content,
                            'model': model,
                            'provider': provider,
                            'prompt': processed_user[:200] + '...' if len(processed_user) > 200 else processed_user,
                            'tokens_used': response_data.get('usage', {}).get('total_tokens', 0),
                            'finish_reason': response_data['choices'][0].get('finish_reason', 'unknown')
                        },
                        'stdout': f"LLM response from {model} via {provider} ({len(content)} chars)",
                        'stderr': '',
                        'execution_time': execution_time
                    }
        
        elif provider == 'ollama':
            # Ollama local integration
            if not is_local_network_host(ollama_host):
                raise ValueError(f"Ollama host '{ollama_host}' is not in allowed local network ranges")
            
            # Ensure host has proper URL format
            if not ollama_host.startswith('http'):
                ollama_host = f'http://{ollama_host}'
            if not ollama_host.endswith('/'):
                ollama_host += '/'
                
            payload = {
                'model': model,
                'prompt': processed_user,
                'stream': False,
                'options': {
                    'temperature': temperature,
                    'num_predict': max_tokens
                }
            }
            
            if processed_system:
                payload['system'] = processed_system
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f'{ollama_host}api/generate',
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    response_data = await response.json()
                    
                    if response.status != 200:
                        raise Exception(f"Ollama API error: {response.status} - {response_data.get('error', 'Unknown error')}")
                    
                    if 'response' not in response_data:
                        raise Exception("No response from Ollama")
                    
                    content = response_data['response']
                    
                    execution_time = time.time() - start_time
                    
                    return {
                        'status': 'success',
                        'output': {
                            'content': content,
                            'model': model,
                            'provider': 'ollama',
                            'host': ollama_host,
                            'prompt': processed_user[:200] + '...' if len(processed_user) > 200 else processed_user,
                            'eval_count': response_data.get('eval_count', 0),
                            'eval_duration': response_data.get('eval_duration', 0)
                        },
                        'stdout': f"LLM response from {model} via Ollama ({len(content)} chars)",
                        'stderr': '',
                        'execution_time': execution_time
                    }
        
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
            
    except Exception as e:
        return {
            'status': 'error',
            'error': f'LLM request failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

def find_downstream_nodes(foreach_node_id: str, nodes_data: dict, connections_data: dict) -> List[str]:
    """Find all nodes downstream from a foreach node until next 'end' or 'foreach' node"""
    downstream = []
    visited = set()
    queue = [foreach_node_id]
    
    while queue:
        current_id = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)
        
        # Find all nodes connected from this node
        for conn_id, conn_data in connections_data.items():
            if conn_data.get('source') == current_id:
                target_id = conn_data.get('target')
                if target_id and target_id not in visited:
                    target_node = nodes_data.get(target_id, {})
                    target_type = target_node.get('type', '')
                    
                    # Stop at 'end' or another 'foreach' node
                    if target_type in ('end', 'foreach'):
                        continue
                    
                    downstream.append(target_id)
                    queue.append(target_id)
    
    return downstream


async def execute_sub_workflow(
    node_ids: List[str],
    nodes_data: dict,
    connections_data: dict,
    starting_input: Any,
    node_outputs_ref: dict
) -> Dict[str, Any]:
    """Execute a sub-workflow (list of nodes) with given input"""
    local_outputs = {}
    current_input = starting_input
    node_executions = []  # Track execution details for each node
    
    # Execute nodes in order
    for node_id in node_ids:
        node_data = nodes_data.get(node_id, {})
        node_type = node_data.get('type', 'unknown')
        node_title = node_data.get('title', node_id)
        
        # Find input for this node (from local outputs or starting input)
        input_data = current_input
        for conn_id, conn_data in connections_data.items():
            if conn_data.get('target') == node_id:
                source_id = conn_data.get('source')
                if source_id in local_outputs:
                    input_data = local_outputs[source_id]
                    break
        
        # Execute the node
        node_start_time = time.time()
        try:
            if node_type == 'python':
                code = node_data.get('code', 'def run(input):\n    return input')
                result = execute_python_code(code, input_data)
            elif node_type == 'typescript':
                code = node_data.get('code', 'async function run(input: any): Promise<any> {\n    return input;\n}')
                result = await execute_typescript_code(code, input_data)
            elif node_type == 'http':
                config = node_data.get('config', {})
                result = await execute_http_request(config, input_data)
            elif node_type == 'file':
                config = node_data.get('config', {})
                result = await execute_file_operation(config, input_data)
            elif node_type == 'condition':
                config = node_data.get('config', {})
                result = await execute_conditional_logic(config, input_data)
            elif node_type == 'database':
                config = node_data.get('config', {})
                result = await execute_database_query(config, input_data)
            elif node_type == 'llm':
                config = node_data.get('config', {})
                result = await execute_llm_request(config, input_data)
            else:
                result = {
                    'status': 'error',
                    'error': f'Unknown node type in sub-workflow: {node_type}',
                    'output': None
                }
            
            node_execution_time = time.time() - node_start_time
            
            # Track this node's execution
            node_executions.append({
                'node_id': node_id,
                'node_title': node_title,
                'node_type': node_type,
                'status': result.get('status', 'success'),
                'output': result.get('output'),
                'error': result.get('error'),
                'stdout': result.get('stdout', ''),
                'stderr': result.get('stderr', ''),
                'execution_time': node_execution_time
            })
            
            if result['status'] == 'error':
                return {
                    'status': 'error',
                    'output': None,
                    'error': result.get('error'),
                    'node_executions': node_executions
                }
            
            local_outputs[node_id] = result['output']
            current_input = result['output']
            
        except Exception as e:
            node_execution_time = time.time() - node_start_time
            node_executions.append({
                'node_id': node_id,
                'node_title': node_title,
                'node_type': node_type,
                'status': 'error',
                'output': None,
                'error': str(e),
                'stdout': '',
                'stderr': str(e),
                'execution_time': node_execution_time
            })
            return {
                'status': 'error',
                'error': f'Error executing node {node_id}: {str(e)}',
                'output': None,
                'node_executions': node_executions
            }
    
    # Return output from last node with execution details
    if node_ids:
        last_node_id = node_ids[-1]
        return {
            'status': 'success',
            'output': local_outputs.get(last_node_id, current_input),
            'stdout': '',
            'stderr': '',
            'execution_time': sum(exec.get('execution_time', 0) for exec in node_executions),
            'node_executions': node_executions
        }
    else:
        return {
            'status': 'success',
            'output': starting_input,
            'stdout': '',
            'stderr': '',
            'execution_time': 0.0,
            'node_executions': []
        }


async def execute_foreach_loop(
    config: Dict[str, Any],
    input_data: Any,
    foreach_node_id: str,
    nodes_data: dict,
    connections_data: dict
) -> Dict[str, Any]:
    """Execute a foreach loop node"""
    start_time = time.time()
    
    # Extract array to iterate over
    items = []
    items_key = config.get('items_key', 'items')
    
    # Check if input_data is an array
    if isinstance(input_data, list):
        items = input_data
    # Check if input_data has the specified key
    elif isinstance(input_data, dict) and items_key in input_data:
        items_value = input_data[items_key]
        if isinstance(items_value, list):
            items = items_value
    # Fall back to config items
    if not items:
        items = config.get('items', [])
    
    if not isinstance(items, list):
        return {
            'status': 'error',
            'error': f'ForEach node requires an array. Got: {type(items).__name__}',
            'output': None,
            'stdout': '',
            'stderr': '',
            'execution_time': time.time() - start_time
        }
    
    if not items:
        return {
            'status': 'success',
            'output': {
                'results': [],
                'total': 0,
                'successful': 0,
                'failed': 0
            },
            'stdout': 'ForEach loop executed with empty array',
            'stderr': '',
            'execution_time': time.time() - start_time
        }
    
    # Find downstream nodes
    downstream_node_ids = find_downstream_nodes(foreach_node_id, nodes_data, connections_data)
    
    if not downstream_node_ids:
        return {
            'status': 'success',
            'output': {
                'results': [{'item': item, 'output': item, 'status': 'success', 'error': None} for item in items],
                'total': len(items),
                'successful': len(items),
                'failed': 0
            },
            'stdout': 'ForEach loop executed with no downstream nodes',
            'stderr': '',
            'execution_time': time.time() - start_time
        }
    
    # Execute iterations
    execution_mode = config.get('execution_mode', 'serial')
    results = []
    
    async def execute_iteration(item: Any, index: int) -> Dict[str, Any]:
        """Execute one iteration of the loop"""
        try:
            # Execute sub-workflow with item as input
            result = await execute_sub_workflow(
                downstream_node_ids,
                nodes_data,
                connections_data,
                item,  # Replace input_data entirely with current item
                {}
            )
            
            return {
                'item': item,
                'output': result.get('output'),
                'status': result.get('status', 'success'),
                'error': result.get('error'),
                'node_executions': result.get('node_executions', [])  # Include execution details for each node
            }
        except Exception as e:
            return {
                'item': item,
                'output': None,
                'status': 'error',
                'error': str(e)
            }
    
    if execution_mode == 'parallel':
        # Parallel execution with concurrency limit
        max_concurrency = config.get('max_concurrency', 5)
        semaphore = asyncio.Semaphore(max_concurrency)
        
        async def execute_with_semaphore(item: Any, index: int):
            async with semaphore:
                return await execute_iteration(item, index)
        
        # Execute all iterations in parallel (with concurrency limit)
        iteration_tasks = [execute_with_semaphore(item, i) for i, item in enumerate(items)]
        results = await asyncio.gather(*iteration_tasks, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    'item': items[i],
                    'output': None,
                    'status': 'error',
                    'error': str(result)
                })
            else:
                processed_results.append(result)
        results = processed_results
    else:
        # Serial execution
        for i, item in enumerate(items):
            result = await execute_iteration(item, i)
            results.append(result)
    
    # Count successes and failures
    successful = sum(1 for r in results if r.get('status') == 'success')
    failed = len(results) - successful
    
    return {
        'status': 'success',
        'output': {
            'results': results,
            'total': len(results),
            'successful': successful,
            'failed': failed
        },
        'stdout': f'ForEach loop executed {len(results)} iterations ({successful} successful, {failed} failed)',
        'stderr': '',
        'execution_time': time.time() - start_time
    }


@app.post("/run")
async def run_workflow(request: dict):
    """Execute a workflow"""
    print("=== WORKFLOW EXECUTION START ===")
    print(f"Received request: {json.dumps(request, indent=2)}")
    
    try:
        workflow = request.get('workflow', {})
        nodes_data = workflow.get('nodes', {})
        connections_data = workflow.get('connections', {})
        
        print(f"Processing {len(nodes_data)} nodes and {len(connections_data)} connections")
        
        # Simple execution order based on node list (skip topological sort for now)
        node_results = []
        node_outputs = {}
        
        # Track nodes that are downstream from foreach nodes (they execute inside the foreach)
        nodes_to_skip = set()
        for node_id, node_data in nodes_data.items():
            if node_data.get('type') == 'foreach':
                downstream = find_downstream_nodes(node_id, nodes_data, connections_data)
                nodes_to_skip.update(downstream)
                print(f"ForEach node {node_id} has downstream nodes: {downstream}")
        
        # Execute nodes in the order they appear
        for node_id, node_data in nodes_data.items():
            # Skip nodes that are downstream from foreach (they execute inside the foreach)
            if node_id in nodes_to_skip:
                print(f"Skipping node {node_id} (executes inside foreach loop)")
                continue
                
            print(f"\n--- Executing node {node_id} ---")
            node_type = node_data.get('type', 'unknown')
            print(f"Node type: {node_type}")
            
            # Find input for this node
            input_data = {}
            for conn_id, conn_data in connections_data.items():
                if conn_data.get('target') == node_id:
                    source_id = conn_data.get('source')
                    if source_id in node_outputs:
                        input_data = node_outputs[source_id]
                        print(f"Using input from {source_id}: {input_data}")
                        break
            
            if not input_data:
                print("Using default empty input")
                input_data = {}
            
            # Execute the node
            if node_type == 'start':
                result = {
                    'status': 'success',
                    'output': {'message': 'Workflow started'},
                    'stdout': 'Start node executed successfully',
                    'stderr': '',
                    'execution_time': 0.0
                }
                
            elif node_type == 'end':
                result = {
                    'status': 'success',
                    'output': input_data,
                    'stdout': 'End node executed successfully',
                    'stderr': '',
                    'execution_time': 0.0
                }
                
            elif node_type == 'python':
                code = node_data.get('code', 'def run(input):\n    return input')
                print(f"Executing Python code:\n{code}")
                result = execute_python_code(code, input_data)
                
            elif node_type == 'typescript':
                code = node_data.get('code', 'async function run(input: any): Promise<any> {\n    return input;\n}')
                print(f"Executing TypeScript code:\n{code}")
                result = await execute_typescript_code(code, input_data)
                
            elif node_type == 'http':
                config = node_data.get('config', {})
                result = await execute_http_request(config, input_data)
                
            elif node_type == 'file':
                config = node_data.get('config', {})
                result = await execute_file_operation(config, input_data)
                
            elif node_type == 'condition':
                config = node_data.get('config', {})
                result = await execute_conditional_logic(config, input_data)
                
            elif node_type == 'database':
                config = node_data.get('config', {})
                result = await execute_database_query(config, input_data)
                
            elif node_type == 'llm':
                config = node_data.get('config', {})
                result = await execute_llm_request(config, input_data)
                
            elif node_type == 'foreach':
                config = node_data.get('config', {})
                result = await execute_foreach_loop(config, input_data, node_id, nodes_data, connections_data)
                
            else:
                result = {
                    'status': 'error',
                    'error': f'Unknown node type: {node_type}',
                    'output': None,
                    'stdout': '',
                    'stderr': ''
                }
            
            # Store result
            node_result = {
                'id': node_id,
                'status': result['status'],
                'output': result['output'],
                'stdout': result['stdout'],
                'stderr': result['stderr'],
                'execution_time': result.get('execution_time', 0.0),
                'error': result.get('error')
            }
            
            node_results.append(node_result)
            node_outputs[node_id] = result['output']
            
            print(f"Node {node_id} result: {result['status']}")
            if result['status'] == 'error':
                print(f"Error in {node_id}: {result.get('error')}")
                break
        
        # Build final response
        overall_status = 'success'
        overall_error = None
        
        for node_result in node_results:
            if node_result['status'] == 'error':
                overall_status = 'error'
                overall_error = f"Node {node_result['id']} failed: {node_result.get('error')}"
                break
        
        final_result = {
            'status': overall_status,
            'nodes': node_results,
            'total_time': time.time() - time.time(),
            'error': overall_error
        }
        
        print(f"\n=== EXECUTION COMPLETE ===")
        print(f"Final result: {json.dumps(final_result, indent=2)}")
        
        return final_result
        
    except Exception as e:
        print(f"\n=== EXECUTION ERROR ===")
        print(f"Error: {e}")
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