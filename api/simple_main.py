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
try:
    # Try to use pysqlite3 which supports extension loading
    # Install with: pip install pysqlite3-binary (may require building from source on some platforms)
    import pysqlite3 as sqlite3
    _HAS_EXTENSION_SUPPORT = True
except ImportError:
    # Fall back to standard sqlite3 (may not support extensions)
    import sqlite3
    _HAS_EXTENSION_SUPPORT = hasattr(sqlite3.Connection, 'enable_load_extension')
from pathlib import Path
from dotenv import load_dotenv
import re
import ipaddress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from RestrictedPython import compile_restricted, safe_globals

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifespan events"""
    # Startup
    yield
    # Shutdown - gracefully handle cancellation
    try:
        # Give pending tasks a moment to complete
        await asyncio.sleep(0.1)
    except asyncio.CancelledError:
        # This is expected during shutdown, ignore it
        pass

app = FastAPI(lifespan=lifespan)

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
            'pandas', 'requests', 'urllib', 'urllib.request', 'urllib.error',
            'markdown',  # For markdown to HTML conversion
            'bs4',  # BeautifulSoup for HTML parsing
            'os',  # For environment variable access (os.getenv)
            'sentence_transformers'  # For embedding generation
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
        # _getitem_ handles item access like obj[index]
        def _getitem_handler(obj, index, *args):
            """Handle item access for RestrictedPython"""
            return obj[index]
        restricted_globals['_getitem_'] = _getitem_handler
        restricted_globals['_getiter_'] = iter
        # _iter_unpack_sequence_ handles sequence unpacking
        def _iter_unpack_handler(seq, *args):
            """Handle sequence unpacking for RestrictedPython"""
            return seq
        restricted_globals['_iter_unpack_sequence_'] = _iter_unpack_handler
        # Required for augmented assignments and complex expressions in f-strings
        # _inplacevar_ handles in-place operations (like +=, -=, etc.)
        # RestrictedPython calls it with (operation, variable_name, value)
        def _inplacevar_handler(*args, **kwargs):
            """Handle in-place operations for RestrictedPython"""
            # RestrictedPython transforms in-place ops like x += y into _inplacevar_('+', 'x', y)
            # We just need to return the value - the actual operation is handled by RestrictedPython
            if len(args) >= 3:
                return args[2]  # Return the value (third argument)
            elif len(args) >= 1:
                return args[-1]  # Fallback: return last argument
            return None
        restricted_globals['_inplacevar_'] = _inplacevar_handler
        # _write_ handles write operations to variables (list of (name, value) tuples)
        def _write_handler(*args, **kwargs):
            """Handle write operations for RestrictedPython"""
            # RestrictedPython uses this to track variable writes
            # We don't need to do anything special here
            pass
        restricted_globals['_write_'] = _write_handler
        
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
        
        # Add markdown to HTML conversion helper
        try:
            import markdown
            def markdown_to_html(md_text: str) -> str:
                """Convert markdown text to HTML"""
                if not isinstance(md_text, str):
                    return str(md_text)
                return markdown.markdown(md_text, extensions=['fenced_code', 'tables', 'toc'])
            restricted_globals['markdown_to_html'] = markdown_to_html
        except ImportError:
            # If markdown library not available, provide a simple fallback
            def markdown_to_html(md_text: str) -> str:
                """Simple markdown to HTML conversion (fallback)"""
                if not isinstance(md_text, str):
                    return str(md_text)
                # Basic conversions
                import re
                html = md_text
                html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
                html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
                html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
                html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
                html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
                html = re.sub(r'\n', '<br>\n', html)
                return f'<div>{html}</div>'
            restricted_globals['markdown_to_html'] = markdown_to_html
        
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
                
                # Merge original input data with response so downstream nodes can access both
                output_data = {
                    'status_code': response.status,
                    'headers': dict(response.headers),
                    'data': response_data,
                    'url': str(response.url),
                    'method': method
                }
                
                # Preserve original input data (like 'ticker') for downstream nodes
                if isinstance(input_data, dict):
                    for key, value in input_data.items():
                        if key not in output_data:  # Don't overwrite response fields
                            output_data[key] = value
                
                return {
                    'status': 'success',
                    'output': output_data,
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
            
            # Extract field value from input data (support nested paths like "metadata.totalValue")
            field_value = None
            if isinstance(data, dict):
                # Handle nested field paths (e.g., "metadata.totalValue")
                if '.' in field:
                    parts = field.split('.')
                    current = data
                    try:
                        for part in parts:
                            if isinstance(current, dict):
                                current = current.get(part)
                            else:
                                current = None
                                break
                        field_value = current
                    except (AttributeError, TypeError, KeyError):
                        field_value = None
                else:
                    field_value = data.get(field, None)
            else:
                field_value = data
            
            # Handle None values - can't compare None with numbers
            if field_value is None:
                if operator == 'exists':
                    return False
                elif operator == '!=':
                    return value is not None
                else:
                    # For comparison operators, None values should return False
                    return False
            
            # Convert types for comparison
            try:
                if isinstance(value, str) and value.isdigit():
                    value = int(value)
                elif isinstance(value, str) and value.replace('.', '', 1).isdigit():
                    value = float(value)
            except:
                pass
            
            # Evaluate condition
            try:
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
            except (TypeError, ValueError) as e:
                # If comparison fails (e.g., comparing incompatible types), return False
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
        
        # Flatten the output: merge result_output fields into the main output
        # This ensures route/action/priority are available to downstream nodes
        output = {
            'result': result_output,
            'matched_condition': matched_condition,
            'input': input_data,
            'condition_type': condition_type
        }
        
        # If result_output is a dict, merge its fields into the output for easier access
        if isinstance(result_output, dict):
            output.update(result_output)
        
        return {
            'status': 'success',
            'output': output,
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

def validate_extension_path(extension_path: str) -> tuple[bool, str]:
    """Validate SQLite extension path for security.
    
    Returns:
        (is_valid, error_message_or_validated_path)
    """
    import sys
    
    # Allowed extension filenames (sqlite-vec)
    allowed_extensions = {'vec0.so', 'vec0.dylib', 'vec0.dll'}
    
    # Platform-specific extension mapping
    platform_extensions = {
        'linux': 'vec0.so',
        'darwin': 'vec0.dylib',  # macOS
        'win32': 'vec0.dll'
    }
    platform_ext = platform_extensions.get(sys.platform, 'vec0.so')
    
    # Must be within safe directory
    safe_dir = Path('/tmp/workflow_files')
    safe_dir_str = str(safe_dir)
    
    # Normalize path
    path = Path(extension_path)
    
    # Check for path traversal attempts
    if '..' in str(path):
        return False, "Path traversal (..) not allowed in extension paths"
    
    # Check if path is absolute and outside safe directory
    if path.is_absolute():
        try:
            path.resolve().relative_to(safe_dir.resolve())
        except ValueError:
            return False, f"Extension path must be within {safe_dir_str}"
    
    # Check filename is in whitelist
    filename = path.name
    if filename not in allowed_extensions:
        return False, f"Extension filename '{filename}' not allowed. Allowed: {', '.join(allowed_extensions)}"
    
    # Construct full path for requested filename
    full_path = safe_dir / filename
    
    # If requested file doesn't exist, try platform-specific extension
    if not full_path.exists():
        # Try platform-specific extension as fallback
        platform_path = safe_dir / platform_ext
        if platform_path.exists() and filename != platform_ext:
            # User requested wrong platform extension, but correct one exists
            return True, str(platform_path)
        else:
            return False, f"Extension file not found: {full_path}. Expected platform extension: {platform_ext}"
    
    return True, str(full_path)

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
        processed_params = []
        
        # First, replace {key} placeholders in the query string
        if isinstance(input_data, dict):
            for key, value in input_data.items():
                query = query.replace(f'{{{key}}}', str(value))
        
        # Now process parameters from the config params array
        # These are the actual parameters that will be bound to ? placeholders
        for param_template in params:
            if isinstance(param_template, str) and param_template.startswith('{') and param_template.endswith('}'):
                # Extract key from {key} format
                key = param_template[1:-1]
                if key in input_data:
                    value = input_data[key]
                    
                    # Check if this is a vec0 MATCH query - vec0 requires JSON array format as a STRING
                    if 'MATCH' in query.upper():
                        import json
                        # For vec0 MATCH queries, prefer the _array version if available
                        array_key = f'{key}_array'
                        if array_key in input_data:
                            # Convert list to JSON string for vec0
                            embedding_array = input_data[array_key]
                            if isinstance(embedding_array, list):
                                processed_params.append(json.dumps(embedding_array))
                            else:
                                processed_params.append(embedding_array)
                        elif isinstance(value, bytes):
                            # Convert bytes back to numpy array, then to JSON string
                            import numpy as np
                            try:
                                # Assume float32 format (as stored by embedding node)
                                embedding_array = np.frombuffer(value, dtype=np.float32).tolist()
                                processed_params.append(json.dumps(embedding_array))
                            except Exception as e:
                                # Fallback: use the bytes value (might fail, but at least try)
                                processed_params.append(value)
                        elif isinstance(value, str):
                            if value.startswith('['):
                                # Already a JSON array string, use as-is
                                processed_params.append(value)
                            else:
                                # Might be base64 encoded - try to decode and convert
                                import base64
                                import numpy as np
                                try:
                                    decoded_bytes = base64.b64decode(value)
                                    embedding_array = np.frombuffer(decoded_bytes, dtype=np.float32).tolist()
                                    processed_params.append(json.dumps(embedding_array))
                                except Exception:
                                    # Not base64, use as-is (might fail, but let vec0 handle the error)
                                    processed_params.append(value)
                        elif isinstance(value, list):
                            # Already a list, convert to JSON string
                            processed_params.append(json.dumps(value))
                        else:
                            # Other format - try to convert to JSON string
                            try:
                                processed_params.append(json.dumps(value))
                            except Exception:
                                processed_params.append(value)
                    else:
                        # Not a MATCH query, use value as-is
                        processed_params.append(value)
                else:
                    # Key not found, append None or empty string
                    processed_params.append(None)
            else:
                # Not a template, use as-is
                processed_params.append(param_template)
        
        # Check if query contains load_extension call
        import re
        load_ext_pattern = r'load_extension\s*\(\s*["\']([^"\']+)["\']\s*\)'
        load_ext_match = re.search(load_ext_pattern, query, re.IGNORECASE)
        
        with sqlite3.connect(database) as conn:
            # Check if extension loading is supported
            extension_loading_supported = hasattr(conn, 'enable_load_extension')
            
            # Check if query uses vec0 (needs extension loaded)
            # This includes CREATE VIRTUAL TABLE ... USING vec0(...)
            # or queries on vec0 virtual tables (check for common vec0 table patterns)
            query_upper = query.upper()
            uses_vec0 = (
                'VEC0' in query_upper or 
                'USING VEC0' in query_upper or
                # Check if querying a vec0 virtual table (common patterns)
                any(pattern in query_upper for pattern in [
                    'FROM VEC_', 'FROM VEC0_', 'JOIN VEC_', 'JOIN VEC0_',
                    'VEC_DOCS', 'VEC_VECTORS', 'VEC_EMBEDDINGS'
                ])
            )
            
            # If load_extension is explicitly called in the query, handle it
            if load_ext_match:
                if not extension_loading_supported:
                    install_instructions = (
                        "SQLite extension loading is not available on this system.\n\n"
                        "Vector database features (sqlite-vec) require extension loading support.\n\n"
                        "Workarounds:\n"
                        "1. Use workflows that don't require vector databases\n"
                        "2. Use Embedding nodes with Python nodes for similarity search\n"
                        "3. Store embeddings as JSON and use Python for vector operations\n\n"
                        "For full vector database support, you may need:\n"
                        "- A Python environment with pysqlite3 pre-installed\n"
                        "- Or compile SQLite/Python with extension loading enabled\n\n"
                        "See docs/INSTALL_PYSQLITE3.md for detailed instructions.\n"
                        "Note: All other workflow features work without extension loading."
                    )
                    return {
                        'status': 'error',
                        'error': f'Extension loading not supported. {install_instructions}',
                        'output': None,
                        'stdout': '',
                        'stderr': 'enable_load_extension() method not available. See error message for installation instructions.'
                    }
                
                ext_path = load_ext_match.group(1)
                is_valid, validated_path = validate_extension_path(ext_path)
                if not is_valid:
                    return {
                        'status': 'error',
                        'error': f'Extension loading failed: {validated_path}',
                        'output': None,
                        'stdout': '',
                        'stderr': f'Invalid extension path: {ext_path}'
                    }
                
                # Enable extension loading
                try:
                    conn.enable_load_extension(True)
                except AttributeError:
                    return {
                        'status': 'error',
                        'error': 'Extension loading not supported. Install pysqlite3-binary: pip install pysqlite3-binary',
                        'output': None,
                        'stdout': '',
                        'stderr': 'enable_load_extension() method not available'
                    }
                
                # Ensure we use absolute resolved path
                validated_path_abs = str(Path(validated_path).resolve())
                
                # SQLite on macOS/Linux automatically appends platform-specific extensions
                # So we need to remove the extension to avoid double extension (.dylib.dylib)
                import sys
                if sys.platform == 'darwin' and validated_path_abs.endswith('.dylib'):
                    # Remove .dylib - SQLite will add it automatically
                    validated_path_abs = validated_path_abs[:-6]
                elif sys.platform.startswith('linux') and validated_path_abs.endswith('.so'):
                    # Remove .so - SQLite will add it automatically  
                    validated_path_abs = validated_path_abs[:-3]
                elif sys.platform == 'win32' and validated_path_abs.endswith('.dll'):
                    # Remove .dll - SQLite will add it automatically
                    validated_path_abs = validated_path_abs[:-4]
                
                # Replace the entire load_extension call with path (without extension)
                original_call = load_ext_match.group(0)
                new_call = f'load_extension("{validated_path_abs}")'
                query = query.replace(original_call, new_call)
            
            # If query uses vec0 but extension wasn't explicitly loaded, load it automatically
            if uses_vec0 and not load_ext_match:
                # Extension needed but not explicitly loaded in query - load it automatically
                if extension_loading_supported:
                    try:
                        conn.enable_load_extension(True)
                        # Get the extension path (platform-specific)
                        import sys
                        safe_dir = Path('/tmp/workflow_files')
                        if sys.platform == 'darwin':
                            ext_file = safe_dir / 'vec0.dylib'
                            ext_path = str(ext_file.resolve())[:-6] if ext_file.exists() else None  # Remove .dylib
                        elif sys.platform.startswith('linux'):
                            ext_file = safe_dir / 'vec0.so'
                            ext_path = str(ext_file.resolve())[:-3] if ext_file.exists() else None  # Remove .so
                        elif sys.platform == 'win32':
                            ext_file = safe_dir / 'vec0.dll'
                            ext_path = str(ext_file.resolve())[:-4] if ext_file.exists() else None  # Remove .dll
                        else:
                            ext_file = safe_dir / 'vec0.so'
                            ext_path = str(ext_file.resolve())[:-3] if ext_file.exists() else None
                        
                        # Check if extension file exists
                        if ext_path and ext_file.exists():
                            try:
                                conn.load_extension(ext_path)
                            except Exception as e:
                                return {
                                    'status': 'error',
                                    'error': f'Failed to auto-load vec0 extension: {str(e)}. Make sure vec0 extension is in /tmp/workflow_files/',
                                    'output': None,
                                    'stdout': '',
                                    'stderr': str(e)
                                }
                        else:
                            return {
                                'status': 'error',
                                'error': f'vec0 extension not found at {ext_file}. Download from https://github.com/asg017/sqlite-vec/releases',
                                'output': None,
                                'stdout': '',
                                'stderr': f'Extension file not found: {ext_file}'
                            }
                    except Exception as e:
                        return {
                            'status': 'error',
                            'error': f'Failed to enable extension loading: {str(e)}',
                            'output': None,
                            'stdout': '',
                            'stderr': str(e)
                        }
            
            conn.row_factory = sqlite3.Row  # For dict-like access
            cursor = conn.cursor()
            
            # Preserve original input data (workflow context) for passing through
            base_output = input_data.copy() if isinstance(input_data, dict) else {}
            
            # Check if query contains multiple statements (separated by semicolons)
            statements = [s.strip() for s in query.split(';') if s.strip()]
            
            if operation == 'select':
                if len(statements) > 1:
                    # Multiple statements - execute all but return results from last SELECT
                    for stmt in statements[:-1]:
                        cursor.execute(stmt, [])
                    cursor.execute(statements[-1], processed_params)
                else:
                    cursor.execute(query, processed_params)
                rows = cursor.fetchall()
                result_data = [dict(row) for row in rows]
                
            elif operation in ['insert', 'update', 'delete']:
                if len(statements) > 1:
                    # Multiple statements - need to split parameters appropriately
                    # For now, execute each statement with appropriate parameters
                    # This is a simplified approach - assumes params are in order
                    param_index = 0
                    total_rows_affected = 0
                    last_row_id = None
                    
                    for i, stmt in enumerate(statements):
                        # Count placeholders in this statement
                        placeholder_count = stmt.count('?')
                        if placeholder_count > 0:
                            stmt_params = processed_params[param_index:param_index + placeholder_count]
                            cursor.execute(stmt, stmt_params)
                            param_index += placeholder_count
                        else:
                            cursor.execute(stmt)
                        
                        total_rows_affected += cursor.rowcount
                        if operation == 'insert' and cursor.lastrowid:
                            last_row_id = cursor.lastrowid
                    
                    conn.commit()
                    result_data = {
                        'rows_affected': total_rows_affected,
                        'last_row_id': last_row_id
                    }
                else:
                    cursor.execute(query, processed_params)
                    conn.commit()
                    result_data = {
                        'rows_affected': cursor.rowcount,
                        'last_row_id': cursor.lastrowid if operation == 'insert' else None
                    }
                
            elif operation == 'create':
                if len(statements) > 1:
                    # Execute all statements
                    for stmt in statements:
                        cursor.execute(stmt)
                else:
                    cursor.execute(query)
                conn.commit()
                result_data = {'table_created': True}
                
            else:
                raise ValueError(f"Unsupported database operation: {operation}")
            
            # Merge query results with original context (preserve workflow data)
            output = {
                **base_output,
                'data': result_data,
                'operation': operation,
                'database': database,
                'query': query[:100] + '...' if len(query) > 100 else query
            }
        
        execution_time = time.time() - start_time
        
        return {
            'status': 'success',
            'output': output,
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

def detect_markdown(text: str) -> bool:
    """Detect if a string contains markdown content"""
    if not isinstance(text, str) or len(text.strip()) == 0:
        return False
    
    # Common markdown patterns
    markdown_patterns = [
        r'^#{1,6}\s+',  # Headers (#, ##, ###, etc.)
        r'\*\*.*?\*\*',  # Bold (**text**)
        r'\*.*?\*',  # Italic (*text*)
        r'\[.*?\]\(.*?\)',  # Links [text](url)
        r'```',  # Code blocks
        r'^\s*[-*+]\s+',  # Unordered lists
        r'^\s*\d+\.\s+',  # Ordered lists
        r'^\s*>\s+',  # Blockquotes
        r'`[^`]+`',  # Inline code
        r'^\s*\|.*\|',  # Tables
    ]
    
    import re
    text_lines = text.split('\n')
    markdown_score = 0
    
    for line in text_lines[:50]:  # Check first 50 lines
        for pattern in markdown_patterns:
            if re.search(pattern, line, re.MULTILINE):
                markdown_score += 1
                break
    
    # If we find multiple markdown patterns, it's likely markdown
    return markdown_score >= 2

async def execute_markdown_viewer(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute markdown viewer node - automatically detects markdown in any variable"""
    try:
        content_key = config.get('content_key', 'content')
        markdown_content = ''
        detected_key = None
        
        # Priority 1: Check for 'content' field first (from LLM nodes)
        # This is the most common case - LLM nodes return their answer in 'content'
        # We prioritize this because LLM responses are typically the actual answer text
        if isinstance(input_data, dict) and 'content' in input_data:
            candidate = input_data['content']
            if isinstance(candidate, str) and len(candidate.strip()) > 0:
                # Check if this looks like a JSON string (starts with { or [)
                # If so, it might be the entire object stringified - skip it
                candidate_stripped = candidate.strip()
                if candidate_stripped.startswith('{') or candidate_stripped.startswith('['):
                    # This might be a JSON string of the entire object - skip it
                    # and look for the actual answer in other fields
                    pass
                # LLM content is usually the answer - use it if it's substantial (> 20 chars)
                # or if it contains markdown patterns
                elif len(candidate) > 20 or detect_markdown(candidate):
                    markdown_content = candidate
                    detected_key = 'content'
        
        # Priority 2: Try the specified content_key if provided (and not already found)
        # If content_key is explicitly set (not default 'content'), trust it and use it even without markdown detection
        if not markdown_content and isinstance(input_data, dict):
            if content_key in input_data:
                candidate = input_data[content_key]
                if isinstance(candidate, str):
                    # If content_key was explicitly provided (not default), use it without markdown detection
                    # Otherwise, check for markdown patterns
                    if config.get('content_key') and config.get('content_key') != 'content':
                        markdown_content = candidate
                        detected_key = content_key
                    elif detect_markdown(candidate):
                        markdown_content = candidate
                        detected_key = content_key
        
        # If no markdown found in specified key, scan all variables
        if not markdown_content and isinstance(input_data, dict):
            for key, value in input_data.items():
                if isinstance(value, str) and detect_markdown(value):
                    markdown_content = value
                    detected_key = key
                    break
        
        # If still no markdown found, try common key names
        if not markdown_content and isinstance(input_data, dict):
            common_keys = ['content', 'answer', 'markdown', 'text', 'body', 'message', 'output', 'result', 'markdown_report']
            for key in common_keys:
                if key in input_data:
                    candidate = input_data[key]
                    if isinstance(candidate, str):
                        markdown_content = candidate
                        detected_key = key
                        break
        
        # If input_data is a string, check if it's markdown
        if not markdown_content and isinstance(input_data, str):
            if detect_markdown(input_data):
                markdown_content = input_data
                detected_key = 'input'
        
        # Final fallback: find the longest string value (likely the answer/content)
        # But exclude JSON strings (they start with { or [)
        if not markdown_content:
            if isinstance(input_data, dict):
                # Find all string values and pick the longest one (likely the main content)
                # Exclude JSON strings (they start with { or [)
                string_values = [(key, value) for key, value in input_data.items() 
                               if isinstance(value, str) and len(value.strip()) > 0
                               and not (value.strip().startswith('{') or value.strip().startswith('['))]
                if string_values:
                    # Sort by length (descending) and take the longest
                    string_values.sort(key=lambda x: len(x[1]), reverse=True)
                    markdown_content = string_values[0][1]
                    detected_key = string_values[0][0]
                else:
                    # Last resort: convert to JSON string (formatted)
                    import json
                    markdown_content = json.dumps(input_data, indent=2)
                    detected_key = 'json'
            else:
                markdown_content = str(input_data)
                detected_key = 'input'
        
        return {
            'status': 'success',
            'output': {
                'content': markdown_content,
                'detected_key': detected_key,
                'content_key': content_key,
                'source': input_data
            },
            'stdout': f'Markdown viewer detected content from key: {detected_key}',
            'stderr': '',
            'execution_time': 0.0
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': f'Markdown viewer failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

def detect_html(text: str) -> bool:
    """Detect if a string contains HTML content"""
    if not isinstance(text, str) or len(text.strip()) == 0:
        return False
    
    # Common HTML patterns
    html_patterns = [
        r'<html[^>]*>',
        r'<body[^>]*>',
        r'<div[^>]*>',
        r'<p[^>]*>',
        r'<h[1-6][^>]*>',
        r'<span[^>]*>',
        r'<a[^>]*href',
        r'<img[^>]*src',
        r'<table[^>]*>',
        r'<ul[^>]*>',
        r'<ol[^>]*>',
        r'<li[^>]*>',
        r'<br\s*/?>',
        r'</[^>]+>',  # Closing tags
    ]
    
    import re
    html_score = 0
    
    for pattern in html_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            html_score += 1
    
    # If we find multiple HTML patterns, it's likely HTML
    return html_score >= 2

# Global model cache for sentence-transformers (per-process)
_embedding_model_cache: Dict[str, Any] = {}

async def execute_embedding_node(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute embedding node - generate vector embeddings from text using sentence-transformers"""
    try:
        model_name = config.get('model', 'all-MiniLM-L6-v2')
        input_field = config.get('input_field', 'content')
        output_field = config.get('output_field', 'embedding')
        format_type = config.get('format', 'blob')  # 'blob' or 'array'
        
        start_time = time.time()
        
        # Load or get cached model
        if model_name not in _embedding_model_cache:
            try:
                from sentence_transformers import SentenceTransformer
                _embedding_model_cache[model_name] = SentenceTransformer(model_name)
            except ImportError:
                return {
                    'status': 'error',
                    'error': 'sentence-transformers not installed. Install with: pip install sentence-transformers',
                    'output': None,
                    'stdout': '',
                    'stderr': 'sentence-transformers module not found',
                    'execution_time': 0.0
                }
            except Exception as e:
                return {
                    'status': 'error',
                    'error': f'Failed to load embedding model: {str(e)}',
                    'output': None,
                    'stdout': '',
                    'stderr': str(e),
                    'execution_time': 0.0
                }
        
        model = _embedding_model_cache[model_name]
        
        # Extract text from input
        texts = []
        if isinstance(input_data, str):
            texts = [input_data]
        elif isinstance(input_data, dict):
            # Try to get from specified field
            if input_field in input_data:
                field_value = input_data[input_field]
                if isinstance(field_value, str):
                    texts = [field_value]
                elif isinstance(field_value, list):
                    texts = [str(item) for item in field_value]
                else:
                    texts = [str(field_value)]
            else:
                # Fallback: use first string value found
                for key, value in input_data.items():
                    if isinstance(value, str):
                        texts = [value]
                        input_field = key
                        break
                    elif isinstance(value, list) and len(value) > 0:
                        texts = [str(item) for item in value]
                        input_field = key
                        break
        else:
            texts = [str(input_data)]
        
        if not texts:
            return {
                'status': 'error',
                'error': f'No text found in input field "{input_field}"',
                'output': None,
                'stdout': '',
                'stderr': f'Input field "{input_field}" not found or empty',
                'execution_time': 0.0
            }
        
        # Generate embeddings
        import numpy as np
        embeddings = model.encode(texts, convert_to_numpy=True)
        embedding_dim = embeddings.shape[1] if len(embeddings.shape) > 1 else len(embeddings)
        
        # Prepare output
        base_output = input_data.copy() if isinstance(input_data, dict) else {}
        
        if len(texts) == 1:
            # Single text input
            embedding = embeddings[0] if len(embeddings.shape) > 1 else embeddings
            embedding_array = embedding.tolist()
            embedding_bytes = embedding.astype(np.float32).tobytes()
            
            output = {
                **base_output,
                output_field: embedding_bytes if format_type == 'blob' else embedding_array,
                f'{output_field}_array': embedding_array,
                f'{output_field}_bytes': embedding_bytes,
                f'{output_field}_dim': embedding_dim,
                'text': texts[0],
                'input_field': input_field
            }
        else:
            # Batch input
            embedding_arrays = [emb.tolist() for emb in embeddings]
            embedding_bytes_list = [emb.astype(np.float32).tobytes() for emb in embeddings]
            
            output = {
                **base_output,
                output_field: embedding_bytes_list if format_type == 'blob' else embedding_arrays,
                f'{output_field}_array': embedding_arrays,
                f'{output_field}_bytes': embedding_bytes_list,
                f'{output_field}_dim': embedding_dim,
                'texts': texts,
                'input_field': input_field,
                'count': len(texts)
            }
        
        execution_time = time.time() - start_time
        
        return {
            'status': 'success',
            'output': output,
            'stdout': f'Generated {len(texts)} embedding(s) using model {model_name} (dim={embedding_dim})',
            'stderr': '',
            'execution_time': execution_time
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': f'Embedding generation failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e),
            'execution_time': 0.0
        }

async def execute_html_viewer(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute HTML viewer node - automatically detects HTML in any variable"""
    try:
        content_key = config.get('content_key', 'content')
        html_content = ''
        detected_key = None
        
        # First, try the specified content_key if provided
        # If content_key is explicitly set (not default 'content'), trust it and use it even without HTML detection
        if isinstance(input_data, dict):
            if content_key in input_data:
                candidate = input_data[content_key]
                if isinstance(candidate, str):
                    # If content_key was explicitly provided (not default), use it without HTML detection
                    # Otherwise, check for HTML patterns
                    if config.get('content_key') and config.get('content_key') != 'content':
                        html_content = candidate
                        detected_key = content_key
                    elif detect_html(candidate):
                        html_content = candidate
                        detected_key = content_key
        
        # If no HTML found in specified key, scan all variables
        if not html_content and isinstance(input_data, dict):
            for key, value in input_data.items():
                if isinstance(value, str) and detect_html(value):
                    html_content = value
                    detected_key = key
                    break
        
        # If still no HTML found, try common key names
        if not html_content and isinstance(input_data, dict):
            common_keys = ['content', 'html', 'html_content', 'body', 'message', 'output', 'result']
            for key in common_keys:
                if key in input_data:
                    candidate = input_data[key]
                    if isinstance(candidate, str):
                        html_content = candidate
                        detected_key = key
                        break
        
        # If input_data is a string, check if it's HTML
        if not html_content and isinstance(input_data, str):
            if detect_html(input_data):
                html_content = input_data
                detected_key = 'input'
        
        # Final fallback: convert to string
        if not html_content:
            if isinstance(input_data, dict):
                # Try to find any string value
                for key, value in input_data.items():
                    if isinstance(value, str) and len(value.strip()) > 0:
                        html_content = value
                        detected_key = key
                        break
            else:
                html_content = str(input_data)
                detected_key = 'input'
        
        return {
            'status': 'success',
            'output': {
                'content': html_content,
                'detected_key': detected_key,
                'content_key': content_key,
                'source': input_data
            },
            'stdout': f'HTML viewer detected content from key: {detected_key}',
            'stderr': '',
            'execution_time': 0.0
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': f'HTML viewer failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

async def execute_json_viewer(config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
    """Execute JSON viewer node - automatically detects and formats JSON in any variable"""
    try:
        import json
        # Get content_key from config, default to empty string to differentiate from explicit 'content'
        content_key = config.get('content_key', '')
        # Check if content_key was explicitly set (not empty and not None)
        content_key_explicitly_set = bool(content_key and content_key.strip())
        json_content = None
        detected_key = None
        
        # Helper function to check if a string is valid JSON
        def is_json_string(text: str) -> bool:
            if not isinstance(text, str) or len(text.strip()) == 0:
                return False
            try:
                json.loads(text)
                return True
            except:
                return False
        
        # Helper function to get value from nested dict using dot notation (e.g., 'output.data')
        def get_nested_value(obj: Any, key_path: str) -> Any:
            """Get value from nested dict using dot notation"""
            if not key_path or not isinstance(obj, dict):
                return None
            keys = key_path.split('.')
            current = obj
            for key in keys:
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return None
            return current
        
        # Priority 1: Try the specified content_key if provided (supports nested paths)
        if isinstance(input_data, dict) and content_key_explicitly_set:
            # Check if input_data is empty first
            if not input_data:
                return {
                    'status': 'error',
                    'error': f'JSON viewer: input_data is empty (no data received from upstream node)',
                    'output': {
                        'content': json.dumps({
                            'error': 'Input data is empty',
                            'message': 'No data was received from the upstream node. Check that the upstream node is outputting data correctly.',
                            'content_key': content_key,
                            'input_data': input_data
                        }, indent=2),
                        'detected_key': None,
                        'content_key': content_key,
                        'source': input_data
                    },
                    'stdout': f'JSON viewer: input_data is empty',
                    'stderr': f'No data received from upstream node. Expected content_key: "{content_key}"',
                    'execution_time': 0.0
                }
            
            # Try nested path first (e.g., 'output.data')
            if '.' in content_key:
                candidate = get_nested_value(input_data, content_key)
            else:
                # Try direct key access
                candidate = input_data.get(content_key) if content_key in input_data else None
            
            if candidate is not None:
                # If it's already a dict/list, use it directly
                if isinstance(candidate, (dict, list)):
                    json_content = candidate
                    detected_key = content_key
                # If it's a string, try to parse as JSON
                elif isinstance(candidate, str) and is_json_string(candidate):
                    json_content = json.loads(candidate)
                    detected_key = content_key
                # If it's a primitive value (number, bool, None), wrap it in a dict for JSON display
                elif isinstance(candidate, (int, float, bool)) or candidate is None:
                    json_content = {"value": candidate, "path": content_key}
                    detected_key = content_key
            else:
                # Key was explicitly set but not found - return error message
                return {
                    'status': 'error',
                    'error': f'JSON viewer: content_key "{content_key}" not found in input data',
                    'output': {
                        'content': json.dumps({
                            'error': f'Content key "{content_key}" not found',
                            'available_keys': list(input_data.keys()) if isinstance(input_data, dict) else [],
                            'input_data': input_data,
                            'hint': f'Available keys: {list(input_data.keys()) if isinstance(input_data, dict) else "N/A"}. For nested paths, use dot notation like "output.data".'
                        }, indent=2),
                        'detected_key': None,
                        'content_key': content_key,
                        'source': input_data
                    },
                    'stdout': f'JSON viewer: content_key "{content_key}" not found',
                    'stderr': f'Content key "{content_key}" not found in input data. Available keys: {list(input_data.keys()) if isinstance(input_data, dict) else "N/A"}',
                    'execution_time': 0.0
                }
        
        # Priority 2: Only auto-detect if content_key was NOT explicitly set
        # If content_key was explicitly set and we found something, don't auto-detect
        should_auto_detect = not content_key_explicitly_set
        
        # Priority 3: Auto-detect only if content_key was NOT explicitly set
        if should_auto_detect and json_content is None and isinstance(input_data, dict):
            # First, try common key names
            common_keys = ['json', 'data', 'content', 'body', 'output', 'result', 'response']
            for key in common_keys:
                if key in input_data:
                    candidate = input_data[key]
                    if isinstance(candidate, (dict, list)):
                        json_content = candidate
                        detected_key = key
                        break
                    elif isinstance(candidate, str) and is_json_string(candidate):
                        json_content = json.loads(candidate)
                        detected_key = key
                        break
            
            # If still not found, scan all variables
            if json_content is None:
                for key, value in input_data.items():
                    # If it's already a dict/list, use it
                    if isinstance(value, (dict, list)):
                        json_content = value
                        detected_key = key
                        break
                    # If it's a string, try to parse as JSON
                    elif isinstance(value, str) and is_json_string(value):
                        json_content = json.loads(value)
                        detected_key = key
                        break
        
        # Priority 4: If input_data itself is a dict/list, use it (only if auto-detect is enabled)
        if should_auto_detect and json_content is None:
            if isinstance(input_data, (dict, list)):
                json_content = input_data
                detected_key = 'input'
            elif isinstance(input_data, str) and is_json_string(input_data):
                json_content = json.loads(input_data)
                detected_key = 'input'
        
        # Final fallback: convert entire input_data to JSON (only if auto-detect)
        if should_auto_detect and json_content is None:
            json_content = input_data
            detected_key = 'input'
        
        # Format JSON with indentation
        json_string = json.dumps(json_content, indent=2, ensure_ascii=False)
        
        return {
            'status': 'success',
            'output': {
                'content': json_string,
                'json_data': json_content,
                'detected_key': detected_key,
                'content_key': content_key,
                'source': input_data
            },
            'stdout': f'JSON viewer detected content from key: {detected_key}',
            'stderr': '',
            'execution_time': 0.0
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': f'JSON viewer failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e)
        }

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
        
        # First, replace placeholders in user_prompt template (like {query}, {context}, etc.)
        # This is similar to how HTTP node handles placeholders
        processed_user = user_prompt
        if isinstance(input_data, dict):
            import re
            for key, value in input_data.items():
                # Replace {key} placeholders in the prompt
                placeholder = f'{{{key}}}'
                if placeholder in processed_user:
                    # Convert value to string, but handle long strings gracefully
                    if isinstance(value, str) and len(value) > 5000:
                        # For very long strings (like context), truncate with ellipsis
                        processed_user = processed_user.replace(placeholder, value[:5000] + '...')
                    else:
                        processed_user = processed_user.replace(placeholder, str(value))
        
        # Only append remaining input_data as JSON if there are placeholders that weren't replaced
        # and if the prompt doesn't already contain the data we need
        # Check if prompt still has unreplaced placeholders
        unreplaced_placeholders = re.findall(r'\{(\w+)\}', processed_user)
        if unreplaced_placeholders and input_data is not None and input_data != {}:
            # If there are unreplaced placeholders, append the data as JSON for reference
            # But only if it's not too large (to avoid token limit issues)
            try:
                upstream_str = json.dumps(input_data, ensure_ascii=False)
                # Limit the appended JSON to avoid token limit issues
                if len(upstream_str) > 2000:
                    upstream_str = upstream_str[:2000] + '... (truncated)'
                processed_user = f"{processed_user}\n\nAdditional data:\n{upstream_str}"
            except Exception:
                upstream_str = str(input_data)
                if len(upstream_str) > 2000:
                    upstream_str = upstream_str[:2000] + '... (truncated)'
                processed_user = f"{processed_user}\n\nAdditional data:\n{upstream_str}"
        
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
    """Find all nodes downstream from a foreach node until 'endloop' node (supports nested loops)"""
    downstream = []
    visited = set()
    queue = [foreach_node_id]
    endloop_node_id = None
    
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
                    
                    # Stop at 'endloop' node (marks end of this foreach loop)
                    if target_type == 'endloop':
                        endloop_node_id = target_id
                        continue
                    
                    # Stop at 'end' node (workflow termination)
                    if target_type == 'end':
                        continue
                    
                    # For nested loops: stop at another 'foreach' node (it will have its own endloop)
                    if target_type == 'foreach':
                        continue
                    
                    downstream.append(target_id)
                    queue.append(target_id)
    
    # Include the endloop node in the downstream list if found
    if endloop_node_id:
        downstream.append(endloop_node_id)
    
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
        skip_during_execution = node_data.get('skipDuringExecution', False)
        
        # Find input for this node (from local outputs or starting input)
        input_data = current_input
        for conn_id, conn_data in connections_data.items():
            if conn_data.get('target') == node_id:
                source_id = conn_data.get('source')
                if source_id in local_outputs:
                    input_data = local_outputs[source_id]
                    break
        
        # Check if node should be skipped
        if skip_during_execution:
            # Pass through input to output without executing
            result = {
                'status': 'success',
                'output': input_data,
                'stdout': f'Node "{node_title}" skipped during execution (input passed through)',
                'stderr': '',
                'execution_time': 0.0
            }
            local_outputs[node_id] = result['output']
            node_executions.append({
                'node_id': node_id,
                'node_type': node_type,
                'status': 'skipped',
                'execution_time': 0.0
            })
            current_input = result['output']
            continue
        
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
            elif node_type == 'markdown':
                config = node_data.get('config', {})
                result = await execute_markdown_viewer(config, input_data)
            elif node_type == 'html':
                config = node_data.get('config', {})
                result = await execute_html_viewer(config, input_data)
            elif node_type == 'json':
                config = node_data.get('config', {})
                result = await execute_json_viewer(config, input_data)
            elif node_type == 'embedding':
                config = node_data.get('config', {})
                result = await execute_embedding_node(config, input_data)
            elif node_type == 'endloop':
                # EndLoop node: just passes through the input (aggregation happens in ForEach)
                # This node exists to mark the end of a ForEach sub-workflow
                result = {
                    'status': 'success',
                    'output': input_data,  # Pass through input (will be replaced by ForEach aggregation)
                    'stdout': 'EndLoop node reached',
                    'stderr': '',
                    'execution_time': 0.0
                }
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
            
            # Preserve _workflow_context and route/action/priority through all nodes
            output = result['output']
            if isinstance(output, dict) and isinstance(input_data, dict):
                # Preserve workflow context
                if '_workflow_context' in input_data:
                    output = {
                        **output,
                        '_workflow_context': input_data['_workflow_context']
                    }
                # Preserve route/action/priority from condition router (workflow-level metadata)
                for key in ['route', 'action', 'priority']:
                    if key in input_data and key not in output:
                        output[key] = input_data[key]
            
            local_outputs[node_id] = output
            current_input = output
            
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
    
    # Debug logging
    print(f"ForEach loop - input_data type: {type(input_data)}")
    print(f"ForEach loop - input_data: {json.dumps(input_data, indent=2) if isinstance(input_data, (dict, list)) else str(input_data)[:200]}")
    
    # Extract array to iterate over
    items = []
    items_key = config.get('items_key', 'items')
    print(f"ForEach loop - items_key: {items_key}")
    
    # Check if input_data is an array
    if isinstance(input_data, list):
        items = input_data
        print(f"ForEach loop - input_data is a list, using directly: {len(items)} items")
    # Check if input_data has the specified key
    elif isinstance(input_data, dict) and items_key in input_data:
        items_value = input_data[items_key]
        print(f"ForEach loop - found items_key '{items_key}' in input_data, value type: {type(items_value)}")
        if isinstance(items_value, list):
            items = items_value
            print(f"ForEach loop - extracted {len(items)} items from input_data['{items_key}']")
        else:
            print(f"ForEach loop - items_key '{items_key}' exists but is not a list: {type(items_value)}")
    else:
        print(f"ForEach loop - items_key '{items_key}' not found in input_data. Available keys: {list(input_data.keys()) if isinstance(input_data, dict) else 'N/A'}")
    
    # Fall back to config items
    if not items:
        items = config.get('items', [])
        print(f"ForEach loop - using fallback config items: {len(items)} items")
    
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
    
    # Find downstream nodes (includes EndLoop if present)
    downstream_node_ids = find_downstream_nodes(foreach_node_id, nodes_data, connections_data)
    
    # Find the EndLoop node in downstream nodes
    endloop_node_id = None
    sub_workflow_node_ids = []
    for node_id in downstream_node_ids:
        node_data = nodes_data.get(node_id, {})
        if node_data.get('type') == 'endloop':
            endloop_node_id = node_id
        else:
            sub_workflow_node_ids.append(node_id)
    
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
    
    # Warn if no EndLoop found
    if not endloop_node_id:
        print(f"WARNING: ForEach node {foreach_node_id} has no EndLoop node. Results will be aggregated but may not flow correctly.")
    
    # Execute iterations
    execution_mode = config.get('execution_mode', 'serial')
    results = []
    
    async def execute_iteration(item: Any, index: int) -> Dict[str, Any]:
        """Execute one iteration of the loop"""
        try:
            # Prepare input: item as primary data, but preserve original context
            # This allows downstream nodes to access both the item and original workflow data
            iteration_input = item
            if isinstance(item, dict) and isinstance(input_data, dict):
                # Merge original context into item so downstream nodes can access it
                iteration_input = {
                    **item,
                    '_workflow_context': input_data  # Store original context for reference
                }
            
            # Execute sub-workflow (nodes before EndLoop) with item as primary input
            # If there's an EndLoop, execute only the nodes before it
            nodes_to_execute = sub_workflow_node_ids if endloop_node_id else downstream_node_ids
            
            result = await execute_sub_workflow(
                nodes_to_execute,
                nodes_data,
                connections_data,
                iteration_input,  # Item as primary, but context available via _workflow_context
                {}
            )
            
            # Get the final output from the last node in the sub-workflow (before EndLoop)
            iteration_output = result.get('output')
            
            return {
                'item': item,
                'output': iteration_output,
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
    
    # Aggregate all iteration outputs for EndLoop
    aggregated_outputs = []
    for r in results:
        if r.get('status') == 'success' and r.get('output') is not None:
            aggregated_outputs.append(r.get('output'))
    
    # If EndLoop exists, the ForEach output should be the aggregated data structure
    # that EndLoop will process and pass to the next node
    if endloop_node_id:
        # EndLoop will receive this aggregated structure and output it
        foreach_output = {
            'results': results,
            'total': len(results),
            'successful': successful,
            'failed': failed,
            'aggregated_outputs': aggregated_outputs,  # All successful iteration outputs
            'items': items  # Original items for reference
        }
    else:
        # No EndLoop: return results structure (backward compatibility)
        foreach_output = {
            'results': results,
            'total': len(results),
            'successful': successful,
            'failed': failed
        }
    
    return {
        'status': 'success',
        'output': foreach_output,
        'stdout': f'ForEach loop executed {len(results)} iterations ({successful} successful, {failed} failed)',
        'stderr': '',
        'execution_time': time.time() - start_time,
        'endloop_node_id': endloop_node_id  # Pass EndLoop ID for main execution flow
    }


async def execute_endloop_node(input_data: Any) -> Dict[str, Any]:
    """Execute EndLoop node - aggregates ForEach iteration results"""
    try:
        # Input should be the ForEach output structure
        if isinstance(input_data, dict):
            aggregated_outputs = input_data.get('aggregated_outputs', [])
            results = input_data.get('results', [])
            items = input_data.get('items', [])
            
            # EndLoop outputs the aggregated results in a format the next node can use
            # The aggregated_outputs array contains all successful iteration outputs
            return {
                'status': 'success',
                'output': {
                    'results': results,  # Full results with status, errors, etc.
                    'aggregated_outputs': aggregated_outputs,  # Just the successful outputs
                    'items': items,  # Original items
                    'total': len(results),
                    'successful': len(aggregated_outputs),
                    'failed': len(results) - len(aggregated_outputs)
                },
                'stdout': f'EndLoop aggregated {len(aggregated_outputs)} successful results from {len(results)} iterations',
                'stderr': '',
                'execution_time': 0.0
            }
        else:
            # If input is not a dict (shouldn't happen), return as-is
            return {
                'status': 'success',
                'output': input_data,
                'stdout': 'EndLoop passed through input',
                'stderr': '',
                'execution_time': 0.0
            }
    except Exception as e:
        return {
            'status': 'error',
            'error': f'EndLoop execution failed: {str(e)}',
            'output': None,
            'stdout': '',
            'stderr': str(e),
            'execution_time': 0.0
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
        
        # Topological sort to execute nodes in dependency order
        def topological_sort_nodes(nodes_data: dict, connections_data: dict) -> List[str]:
            """Sort nodes topologically based on connections"""
            # Build graph: node_id -> list of target node_ids
            graph = {node_id: [] for node_id in nodes_data.keys()}
            in_degree = {node_id: 0 for node_id in nodes_data.keys()}
            
            # Build adjacency list and calculate in-degrees
            for conn_id, conn_data in connections_data.items():
                source_id = conn_data.get('source')
                target_id = conn_data.get('target')
                if source_id in nodes_data and target_id in nodes_data:
                    graph[source_id].append(target_id)
                    in_degree[target_id] += 1
            
            # Find nodes with no incoming edges (can execute first)
            queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
            result = []
            
            while queue:
                node_id = queue.pop(0)
                result.append(node_id)
                
                # Remove this node and update in-degrees of its targets
                for target_id in graph[node_id]:
                    in_degree[target_id] -= 1
                    if in_degree[target_id] == 0:
                        queue.append(target_id)
            
            # If we didn't process all nodes, there might be cycles (or isolated nodes)
            # Add any remaining nodes (they might be isolated or part of cycles)
            remaining = set(nodes_data.keys()) - set(result)
            if remaining:
                print(f"Warning: {len(remaining)} nodes not in dependency graph (isolated or cycles): {remaining}")
                result.extend(remaining)
            
            return result
        
        # Get execution order using topological sort
        execution_order = topological_sort_nodes(nodes_data, connections_data)
        print(f"Execution order (topological sort): {execution_order}")
        
        node_results = []
        node_outputs = {}
        
        # Track nodes that are downstream from foreach nodes (they execute inside the foreach)
        nodes_to_skip = set()
        for node_id, node_data in nodes_data.items():
            if node_data.get('type') == 'foreach':
                downstream = find_downstream_nodes(node_id, nodes_data, connections_data)
                nodes_to_skip.update(downstream)
                print(f"ForEach node {node_id} has downstream nodes: {downstream}")
        
        # Execute nodes in topological order
        for node_id in execution_order:
            if node_id not in nodes_data:
                continue
            node_data = nodes_data[node_id]
            # Skip nodes that are downstream from foreach (they execute inside the foreach)
            if node_id in nodes_to_skip:
                print(f"Skipping node {node_id} (executes inside foreach loop)")
                continue
                
            print(f"\n--- Executing node {node_id} ---")
            node_type = node_data.get('type', 'unknown')
            print(f"Node type: {node_type}")
            
            # Find input for this node
            input_data = {}
            # Check all connections to find the source for this node
            # Collect all potential sources
            potential_sources = []
            for conn_id, conn_data in connections_data.items():
                target_id = conn_data.get('target')
                if target_id == node_id:
                    source_id = conn_data.get('source')
                    if source_id in node_outputs:
                        potential_sources.append((source_id, node_outputs[source_id]))
                        print(f"Found connection: {source_id} -> {node_id}")
            
            # If multiple sources, prefer the one that makes sense for the node type
            if len(potential_sources) > 1:
                print(f"Multiple connections to {node_id}, evaluating which to use...")
                # For foreach nodes, prefer sources that have 'items' key
                if node_type == 'foreach':
                    for source_id, source_output in potential_sources:
                        if isinstance(source_output, dict) and 'items' in source_output:
                            input_data = source_output
                            print(f"Using input from {source_id} for {node_id} (has 'items' key)")
                            break
                    # If no source has 'items', use the first one
                    if not input_data:
                        source_id, input_data = potential_sources[0]
                        print(f"Using first available input from {source_id} for {node_id}")
                else:
                    # For other nodes, use the first available source
                    source_id, input_data = potential_sources[0]
                    print(f"Using input from {source_id} for {node_id}")
            elif len(potential_sources) == 1:
                source_id, input_data = potential_sources[0]
                print(f"Using input from {source_id} for {node_id}")
                print(f"Input data type: {type(input_data)}, keys: {list(input_data.keys()) if isinstance(input_data, dict) else 'N/A'}")
            else:
                print(f"No connections found for {node_id}")
            
            if not input_data:
                print(f"Using default empty input for {node_id}")
                input_data = {}
            
            # Check if node should be skipped
            skip_during_execution = node_data.get('skipDuringExecution', False)
            if skip_during_execution:
                # Pass through input to output without executing
                node_title = node_data.get('title', node_id)
                result = {
                    'status': 'success',
                    'output': input_data,
                    'stdout': f'Node "{node_title}" skipped during execution (input passed through)',
                    'stderr': '',
                    'execution_time': 0.0
                }
                node_outputs[node_id] = result['output']
                node_results.append({
                    'id': node_id,
                    'status': 'success',
                    'output': result['output'],
                    'stdout': result['stdout'],
                    'stderr': result['stderr'],
                    'execution_time': result['execution_time'],
                    'error': None
                })
                print(f"Node {node_id} skipped during execution")
                continue
            
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
                
                # If ForEach has an EndLoop node, execute it with aggregated results
                endloop_node_id = result.get('endloop_node_id')
                if endloop_node_id and endloop_node_id in nodes_data:
                    # Execute EndLoop with aggregated data
                    endloop_input = result['output']  # Contains aggregated_outputs, results, etc.
                    print(f"DEBUG: ForEach {node_id} executing EndLoop {endloop_node_id} with input keys: {list(endloop_input.keys()) if isinstance(endloop_input, dict) else 'N/A'}")
                    endloop_result = await execute_endloop_node(endloop_input)
                    
                    # Store EndLoop result in node_outputs so next node can access it
                    node_outputs[endloop_node_id] = endloop_result['output']
                    print(f"DEBUG: EndLoop {endloop_node_id} output stored. Keys: {list(endloop_result['output'].keys()) if isinstance(endloop_result['output'], dict) else 'N/A'}")
                    print(f"DEBUG: EndLoop aggregated_outputs count: {len(endloop_result['output'].get('aggregated_outputs', []))}")
                    
                    # Update result to use EndLoop output
                    result['output'] = endloop_result['output']
                    result['stdout'] += f" | EndLoop aggregated {len(endloop_input.get('aggregated_outputs', []))} results"
                
            elif node_type == 'endloop':
                # EndLoop nodes are handled automatically after ForEach execution
                # Check if it was already executed (stored in node_outputs)
                if node_id in node_outputs:
                    # Use the already-executed result
                    stored_output = node_outputs[node_id]
                    print(f"DEBUG: EndLoop {node_id} using stored output. Keys: {list(stored_output.keys()) if isinstance(stored_output, dict) else 'N/A'}")
                    result = {
                        'status': 'success',
                        'output': stored_output,
                        'stdout': 'EndLoop already executed by ForEach',
                        'stderr': '',
                        'execution_time': 0.0
                    }
                else:
                    # If we reach here, EndLoop is not connected to a ForEach (error case)
                    result = {
                        'status': 'error',
                        'error': 'EndLoop node must be connected from a ForEach loop',
                        'output': None,
                        'stdout': '',
                        'stderr': 'EndLoop node executed outside of ForEach context',
                        'execution_time': 0.0
                    }
                
            elif node_type == 'markdown':
                config = node_data.get('config', {})
                result = await execute_markdown_viewer(config, input_data)
                
            elif node_type == 'html':
                config = node_data.get('config', {})
                result = await execute_html_viewer(config, input_data)
                
            elif node_type == 'json':
                config = node_data.get('config', {})
                result = await execute_json_viewer(config, input_data)
                
            elif node_type == 'embedding':
                config = node_data.get('config', {})
                result = await execute_embedding_node(config, input_data)
                
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
        
        # Convert bytes to base64 for JSON serialization (both for printing and return)
        def convert_bytes_to_base64(obj):
            import base64
            if isinstance(obj, bytes):
                return base64.b64encode(obj).decode('utf-8')
            elif isinstance(obj, dict):
                return {k: convert_bytes_to_base64(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_bytes_to_base64(item) for item in obj]
            return obj
        
        # Convert bytes to base64 in the actual return value (for FastAPI JSON encoding)
        try:
            serializable_result = convert_bytes_to_base64(final_result)
            print(f"Final result: {json.dumps(serializable_result, indent=2)}")
            return serializable_result
        except Exception as e:
            print(f"Warning: Could not serialize final result: {e}")
            # Fallback: return original but try to handle bytes at top level
            if isinstance(final_result, dict):
                cleaned = {}
                for k, v in final_result.items():
                    if isinstance(v, bytes):
                        import base64
                        cleaned[k] = base64.b64encode(v).decode('utf-8')
                    else:
                        cleaned[k] = v
                return cleaned
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