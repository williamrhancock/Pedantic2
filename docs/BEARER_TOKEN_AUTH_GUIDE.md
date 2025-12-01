# Bearer Token Authentication Workflow Guide

This guide demonstrates how to authenticate with an API using credentials and use the returned bearer token for subsequent authenticated requests.

## Overview

The workflow performs the following steps:

1. **Prepare Credentials** - Sets up username/password or API credentials
2. **Authenticate** - Sends credentials to the authentication endpoint
3. **Extract Token** - Parses the bearer token from the response
4. **View Token** - Displays token information (optional)
5. **Prepare API Request** - Sets up an authenticated API request
6. **Make Authenticated Request** - Uses the bearer token to call a protected endpoint
7. **View Response** - Displays the API response

## Workflow Structure

```
Start → Prepare Credentials → Authenticate → Extract Token → View Token
                                                      ↓
                                    Prepare API Request → Authenticated Request → View Response → End
```

## Step-by-Step Configuration

### 1. Prepare Credentials Node

This Python node sets up your authentication credentials. You can modify it to:

- Use environment variables: `os.getenv('API_USERNAME')`
- Read from a config file
- Use different credential types (username/password, client_id/client_secret, API key)

**Example for OAuth2 Client Credentials:**
```python
def run(input):
    credentials = {
        'client_id': os.getenv('CLIENT_ID'),
        'client_secret': os.getenv('CLIENT_SECRET'),
        'grant_type': 'client_credentials'
    }
    return {
        'credentials': credentials,
        'auth_url': 'https://api.example.com/oauth/token'
    }
```

### 2. Authenticate HTTP Node

This HTTP node sends the credentials to your authentication endpoint.

**Configuration:**
- **Method**: `POST` (most common) or `GET`
- **URL**: `{auth_url}` (from previous node)
- **Headers**: 
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Body**: 
  ```json
  {
    "username": "{credentials.username}",
    "password": "{credentials.password}"
  }
  ```

**For OAuth2 Client Credentials:**
```json
{
  "client_id": "{credentials.client_id}",
  "client_secret": "{credentials.client_secret}",
  "grant_type": "{credentials.grant_type}"
}
```

**For Basic Auth (alternative approach):**
- **Headers**: 
  ```json
  {
    "Authorization": "Basic {base64_encoded_credentials}"
  }
  ```

### 3. Extract Bearer Token Node

This Python node extracts the token from the authentication response. Different APIs return tokens in different fields:

- `access_token` (OAuth2 standard)
- `token` (some APIs)
- `authToken` (others)
- `data.token` (nested responses)

The node handles multiple field names and creates a ready-to-use `Authorization` header.

**Response formats handled:**
```json
// OAuth2 format
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}

// Simple format
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

// Nested format
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 4. View Token Info (Optional)

This JSON viewer node displays the extracted token information. Configure the `content_key` to show specific fields:

- `token` - The bearer token
- `token_type` - Usually "Bearer"
- `expires_in` - Token expiration time in seconds

### 5. Prepare API Request Node

This Python node sets up your authenticated API request with the bearer token.

**Configuration:**
```python
def run(input):
    authorization_header = input.get('authorization_header', '')
    
    return {
        'api_url': 'https://api.example.com/v1/users',
        'authorization_header': authorization_header,
        'method': 'GET'
    }
```

### 6. Authenticated API Request Node

This HTTP node makes the actual authenticated request using the bearer token.

**Configuration:**
- **Method**: `{method}` (from previous node)
- **URL**: `{api_url}` (from previous node)
- **Headers**:
  ```json
  {
    "Authorization": "{authorization_header}",
    "Content-Type": "application/json"
  }
  ```

The `Authorization` header will be formatted as: `Bearer eyJhbGciOiJIUzI1NiIs...`

### 7. View API Response

This JSON viewer node displays the response from your authenticated API call.

## Common Authentication Patterns

### Pattern 1: Username/Password

```python
# Prepare Credentials
credentials = {
    'username': 'user@example.com',
    'password': 'secure_password'
}

# Auth Request Body
{
    "username": "{credentials.username}",
    "password": "{credentials.password}"
}
```

### Pattern 2: OAuth2 Client Credentials

```python
# Prepare Credentials
credentials = {
    'client_id': 'your_client_id',
    'client_secret': 'your_client_secret',
    'grant_type': 'client_credentials'
}

# Auth Request Body
{
    "client_id": "{credentials.client_id}",
    "client_secret": "{credentials.client_secret}",
    "grant_type": "{credentials.grant_type}"
}
```

### Pattern 3: API Key Exchange

```python
# Prepare Credentials
credentials = {
    'api_key': 'your_api_key',
    'api_secret': 'your_api_secret'
}

# Auth Request Body
{
    "api_key": "{credentials.api_key}",
    "api_secret": "{credentials.api_secret}"
}
```

## Security Best Practices

1. **Never hardcode credentials** - Use environment variables:
   ```python
   import os
   username = os.getenv('API_USERNAME')
   password = os.getenv('API_PASSWORD')
   ```

2. **Store tokens securely** - If you need to reuse tokens, consider:
   - Storing in a secure database
   - Using token refresh mechanisms
   - Implementing token expiration checks

3. **Use HTTPS** - Always use HTTPS endpoints for authentication

4. **Handle token expiration** - Implement token refresh logic if tokens expire

## Token Refresh Pattern

If your API supports token refresh, you can add a refresh flow:

```python
# Check if token is expired
def run(input):
    token_data = input.get('token_data', {})
    expires_at = token_data.get('expires_at')
    
    if expires_at and time.time() > expires_at:
        # Token expired, need to refresh
        return {
            'needs_refresh': True,
            'refresh_token': token_data.get('refresh_token')
        }
    else:
        # Token still valid
        return {
            'needs_refresh': False,
            'authorization_header': token_data.get('authorization_header')
        }
```

## Error Handling

The workflow should handle common errors:

1. **Invalid credentials** - HTTP 401 Unauthorized
2. **Token not found** - Missing token in response
3. **Token expired** - HTTP 401 with expired token
4. **Network errors** - Connection timeouts, DNS failures

Add error handling nodes to check response status codes and handle failures gracefully.

## Example: Real-World API

Here's an example for a hypothetical API:

```python
# Prepare Credentials
def run(input):
    return {
        'credentials': {
            'client_id': os.getenv('MY_API_CLIENT_ID'),
            'client_secret': os.getenv('MY_API_CLIENT_SECRET')
        },
        'auth_url': 'https://api.mycompany.com/oauth2/token'
    }

# Extract Token (handles this response format)
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "read write"
}
```

## Testing the Workflow

1. **Update credentials** in the "Prepare Credentials" node
2. **Update auth URL** to match your API's authentication endpoint
3. **Update API URL** in "Prepare API Request" node
4. **Run the workflow** and check each step:
   - Verify credentials are prepared correctly
   - Check authentication response
   - Confirm token is extracted
   - Validate authenticated request works

## Troubleshooting

**Token not found:**
- Check the authentication response format
- Update the "Extract Token" node to match your API's response structure
- Use the JSON viewer to inspect the raw response

**401 Unauthorized:**
- Verify credentials are correct
- Check token format in Authorization header
- Ensure token hasn't expired

**403 Forbidden:**
- Token might not have required permissions/scopes
- Check API endpoint permissions

## Next Steps

- Add token caching to avoid re-authenticating on every run
- Implement token refresh for long-running workflows
- Add retry logic for failed requests
- Create reusable custom nodes for common authentication patterns

