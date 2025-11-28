# How to Code TypeScript Workflow Nodes

This guide explains how to write TypeScript code for nodes in the visual workflow builder.

> **📋 For Configuration-Based Nodes**: If you're looking for information about HTTP API Calls, File Operations, Conditional Logic, or Database Query nodes, see **[HOW_TO_CONFIGURE_NODES.md](HOW_TO_CONFIGURE_NODES.md)**.

## 📚 Available Node Types

### Code-Based Nodes
- 🐍 **Python Nodes** ([Python Guide](HOW_TO_CODE_NODES.md)) - Execute Python scripts
- 🟦 **TypeScript Nodes** (This Guide) - Execute TypeScript/JavaScript with async support

### Configuration-Based Nodes ([Configuration Guide](HOW_TO_CONFIGURE_NODES.md))
- 🌐 **HTTP API Call Nodes** - Make requests to external APIs and web services
- 📁 **File Operation Nodes** - Read, write, and manipulate files
- 🔀 **Conditional Logic Nodes** - Branch workflow based on data conditions
- 🗄️ **Database Query Nodes** - Execute SQLite queries and operations

---

## 🟦 TypeScript Node Structure

### Basic Structure

Every TypeScript node must define an async `run()` function that takes an `input` parameter and returns a Promise:

```typescript
async function run(input: any): Promise<any> {
    // Your code here
    return { result: "your output" };
}
```

### Type Definitions

For better type safety, you can define interfaces for your input and output:

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

## 📊 Data Flow Between Nodes

### ✅ What You Can Access
- **`input` parameter**: Contains the complete output from the previous node
- **Return value**: What you return becomes the input for the next node

### ❌ What You Cannot Access
- Local variables from previous nodes
- Imported modules from previous nodes
- Function definitions from previous nodes

### Example: Basic Data Processing

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

## 🌐 Working with APIs

### Basic HTTP Requests

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

### POST Requests with Data

```typescript
interface PostData {
    title: string;
    body: string;
    userId: number;
}

interface PostResponse {
    id: number;
    title: string;
    body: string;
    userId: number;
}

async function run(input: any): Promise<ApiResponse<PostResponse>> {
    const url = 'https://jsonplaceholder.typicode.com/posts';
    const postData: PostData = {
        title: input.title || 'Default Title',
        body: input.body || 'Default body content',
        userId: input.userId || 1
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json() as PostResponse;
        
        return {
            success: true,
            data: result,
            statusCode: response.status
        };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
```

## 🔄 Data Processing and Transformation

### Array Processing

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
        average: Math.round(average * 100) / 100, // Round to 2 decimal places
        min,
        max,
        count: numbers.length,
        median,
        evenCount,
        oddCount
    };
}
```

### String Processing

```typescript
interface TextAnalysis {
    originalText: string;
    wordCount: number;
    characterCount: number;
    characterCountNoSpaces: number;
    sentenceCount: number;
    averageWordsPerSentence: number;
    longestWord: string;
    mostCommonWord: string;
    uppercaseText: string;
    lowercaseText: string;
    titleCaseText: string;
    reversedText: string;
}

async function run(input: any): Promise<TextAnalysis> {
    const text = input.text || input.message || 'Hello world! This is a sample text.';
    
    // Basic counts
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find longest word
    const longestWord = words.reduce((longest, current) => 
        current.length > longest.length ? current : longest, '');
    
    // Find most common word
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
        const clean = word.toLowerCase().replace(/[^\w]/g, '');
        wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    });
    
    const mostCommonWord = Object.entries(wordFreq)
        .reduce((most, [word, count]) => 
            count > most.count ? { word, count } : most, 
            { word: '', count: 0 })
        .word;
    
    // Title case transformation
    const titleCase = text.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    
    return {
        originalText: text,
        wordCount: words.length,
        characterCount: text.length,
        characterCountNoSpaces: text.replace(/\s/g, '').length,
        sentenceCount: sentences.length,
        averageWordsPerSentence: sentences.length > 0 
            ? Math.round((words.length / sentences.length) * 100) / 100 
            : 0,
        longestWord,
        mostCommonWord,
        uppercaseText: text.toUpperCase(),
        lowercaseText: text.toLowerCase(),
        titleCaseText: titleCase,
        reversedText: text.split('').reverse().join('')
    };
}
```

## 🕒 Working with Dates and Times

### Date Processing

```typescript
interface DateInfo {
    inputDate: string;
    timestamp: number;
    iso: string;
    formatted: string;
    dayOfWeek: string;
    dayOfYear: number;
    weekOfYear: number;
    quarter: number;
    timezone: string;
    isWeekend: boolean;
    age: string;
    relativeTime: string;
}

async function run(input: any): Promise<DateInfo> {
    // Parse input date
    let date: Date;
    const inputDateStr = input.date || input.timestamp || new Date().toISOString();
    
    if (typeof inputDateStr === 'number') {
        date = new Date(inputDateStr);
    } else {
        date = new Date(inputDateStr);
    }
    
    // Validate date
    if (isNaN(date.getTime())) {
        date = new Date(); // Fallback to current date
    }
    
    // Calculate day of year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // Calculate week of year
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekOfYear = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    // Calculate quarter
    const quarter = Math.floor((date.getMonth() / 3)) + 1;
    
    // Calculate age
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    let age: string;
    if (diffDays === 0) {
        age = 'Today';
    } else if (diffDays === 1) {
        age = '1 day ago';
    } else if (diffDays < 30) {
        age = `${diffDays} days ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        age = `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffDays / 365);
        age = `${years} year${years > 1 ? 's' : ''} ago`;
    }
    
    // Relative time
    const relativeTime = diffDays > 0 ? age : 
                        diffDays === 0 ? 'Today' : 
                        `In ${Math.abs(diffDays)} days`;
    
    return {
        inputDate: inputDateStr.toString(),
        timestamp: date.getTime(),
        iso: date.toISOString(),
        formatted: date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfYear,
        weekOfYear,
        quarter,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        age,
        relativeTime
    };
}
```

## 🎯 Advanced Patterns

### Retry Logic with Exponential Backoff

```typescript
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
}

async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
): Promise<T> {
    let lastError: Error | unknown;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            if (attempt === config.maxRetries) {
                break; // Last attempt failed
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
                config.baseDelay * Math.pow(2, attempt),
                config.maxDelay
            );
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

async function run(input: any): Promise<any> {
    const url = input.url || 'https://api.example.com/data';
    
    try {
        const result = await retryWithBackoff(async () => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        });
        
        return {
            success: true,
            data: result,
            retriesUsed: 'Success on retry'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            url
        };
    }
}
```

### Rate Limited API Calls

```typescript
class RateLimiter {
    private lastCall = 0;
    private minInterval: number;
    
    constructor(callsPerSecond: number) {
        this.minInterval = 1000 / callsPerSecond;
    }
    
    async throttle(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastCall;
        
        if (elapsed < this.minInterval) {
            const waitTime = this.minInterval - elapsed;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastCall = Date.now();
    }
}

const rateLimiter = new RateLimiter(2); // 2 calls per second

async function run(input: any): Promise<any> {
    const urls = input.urls || ['https://api.example.com/data1', 'https://api.example.com/data2'];
    const results: any[] = [];
    
    for (const url of urls) {
        await rateLimiter.throttle();
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            results.push({
                url,
                success: true,
                data
            });
        } catch (error) {
            results.push({
                url,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    
    return {
        totalRequests: urls.length,
        successfulRequests: results.filter(r => r.success).length,
        results
    };
}
```

### Parallel Processing with Promise.all

```typescript
interface BatchResult<T> {
    successful: T[];
    failed: Array<{ error: string; input: any }>;
    totalCount: number;
    successCount: number;
    failureCount: number;
}

async function processBatch<T, U>(
    items: T[],
    processor: (item: T) => Promise<U>,
    concurrency: number = 3
): Promise<BatchResult<U>> {
    const results: U[] = [];
    const failures: Array<{ error: string; input: T }> = [];
    
    // Process in batches to limit concurrency
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        
        const batchPromises = batch.map(async (item) => {
            try {
                const result = await processor(item);
                return { success: true, result, input: item };
            } catch (error) {
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error',
                    input: item 
                };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
            if (result.success) {
                results.push(result.result);
            } else {
                failures.push({ error: result.error, input: result.input });
            }
        });
    }
    
    return {
        successful: results,
        failed: failures,
        totalCount: items.length,
        successCount: results.length,
        failureCount: failures.length
    };
}

async function run(input: any): Promise<any> {
    const urls = input.urls || [
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://jsonplaceholder.typicode.com/posts/2',
        'https://jsonplaceholder.typicode.com/posts/3'
    ];
    
    const result = await processBatch(
        urls,
        async (url) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        },
        2 // Process 2 URLs concurrently
    );
    
    return {
        ...result,
        processedAt: new Date().toISOString()
    };
}
```

## 🛠️ Utility Functions and Helpers

### Data Validation

```typescript
function isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function isPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    validatedData: any;
}

async function run(input: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const validatedData: any = {};
    
    // Validate email
    if (input.email) {
        if (isEmail(input.email)) {
            validatedData.email = input.email.toLowerCase().trim();
        } else {
            errors.push('Invalid email format');
        }
    } else {
        errors.push('Email is required');
    }
    
    // Validate age
    if (input.age !== undefined) {
        const age = parseInt(input.age);
        if (isNaN(age) || age < 0 || age > 150) {
            errors.push('Age must be a number between 0 and 150');
        } else {
            validatedData.age = age;
        }
    }
    
    // Validate URL
    if (input.website) {
        if (isUrl(input.website)) {
            validatedData.website = input.website;
        } else {
            errors.push('Invalid website URL');
        }
    }
    
    // Validate phone
    if (input.phone) {
        if (isPhoneNumber(input.phone)) {
            validatedData.phone = input.phone;
        } else {
            errors.push('Invalid phone number format');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        validatedData
    };
}
```

## 🚫 Common Pitfalls and Solutions

### 1. Async/Await Best Practices

```typescript
// ❌ Forgetting to await async operations
async function run(input: any): Promise<any> {
    const response = fetch('https://api.example.com'); // Missing await!
    return response; // Returns a Promise, not the actual data
}

// ✅ Proper async/await usage
async function run(input: any): Promise<any> {
    const response = await fetch('https://api.example.com');
    const data = await response.json();
    return data;
}
```

### 2. Error Handling

```typescript
// ❌ Poor error handling
async function run(input: any): Promise<any> {
    const response = await fetch(input.url);
    return response.json(); // Might fail if response is not JSON
}

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
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON');
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

### 3. Type Safety

```typescript
// ❌ Using 'any' everywhere
async function run(input: any): Promise<any> {
    return input.data.map((item: any) => item.value);
}

// ✅ Proper type definitions
interface InputItem {
    value: number;
    name?: string;
}

interface InputData {
    data: InputItem[];
}

interface OutputData {
    values: number[];
    count: number;
}

async function run(input: InputData): Promise<OutputData> {
    if (!Array.isArray(input.data)) {
        throw new Error('Input data must be an array');
    }
    
    const values = input.data
        .filter(item => typeof item.value === 'number')
        .map(item => item.value);
    
    return {
        values,
        count: values.length
    };
}
```

## 🎯 Complete Example: Multi-Step Data Pipeline

### Node 1: Data Fetcher
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

### Node 2: Data Processor
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

### Node 3: Report Generator
```typescript
interface GeneratorInput {
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

interface ReportOutput {
    report: {
        summary: {
            totalItems: number;
            averageWordCount: number;
            averageTitleLength: number;
            generatedAt: string;
        };
        topItems: ProcessedItem[];
        insights: string[];
        exportData: {
            csv: string;
            json: string;
        };
    };
    success: boolean;
    error?: string;
}

async function run(input: GeneratorInput): Promise<ReportOutput> {
    if (!input.success || !input.processedData) {
        return {
            success: false,
            error: input.error || 'No processed data available',
            report: {
                summary: {
                    totalItems: 0,
                    averageWordCount: 0,
                    averageTitleLength: 0,
                    generatedAt: new Date().toISOString()
                },
                topItems: [],
                insights: ['No data available for analysis'],
                exportData: {
                    csv: '',
                    json: '{}'
                }
            }
        };
    }
    
    try {
        const data = input.processedData;
        const stats = input.statistics;
        
        // Get top 5 items by word count
        const topItems = [...data]
            .sort((a, b) => b.wordCount - a.wordCount)
            .slice(0, 5);
        
        // Generate insights
        const insights: string[] = [];
        
        if (stats.averageWordCount > 50) {
            insights.push('Content is generally detailed with high word count');
        } else if (stats.averageWordCount < 10) {
            insights.push('Content is brief with low word count');
        }
        
        if (stats.averageTitleLength > 50) {
            insights.push('Titles are generally long and descriptive');
        } else if (stats.averageTitleLength < 20) {
            insights.push('Titles are concise and short');
        }
        
        const longTitles = data.filter(item => item.titleLength > stats.averageTitleLength).length;
        const percentage = Math.round((longTitles / data.length) * 100);
        insights.push(`${percentage}% of items have above-average title length`);
        
        // Generate CSV export
        const csvHeaders = 'ID,Title,Word Count,Title Length,Created At';
        const csvRows = data.map(item => 
            `${item.id},"${item.title.replace(/"/g, '""')}",${item.wordCount},${item.titleLength},${item.createdAt}`
        );
        const csv = [csvHeaders, ...csvRows].join('\n');
        
        // Generate JSON export
        const json = JSON.stringify(data, null, 2);
        
        return {
            success: true,
            report: {
                summary: {
                    totalItems: stats.totalItems,
                    averageWordCount: stats.averageWordCount,
                    averageTitleLength: stats.averageTitleLength,
                    generatedAt: new Date().toISOString()
                },
                topItems: topItems,
                insights: insights,
                exportData: {
                    csv: csv,
                    json: json
                }
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Report generation failed',
            report: {
                summary: input.statistics,
                topItems: [],
                insights: ['Error occurred during analysis'],
                exportData: {
                    csv: '',
                    json: '{}'
                }
            }
        };
    }
}
```

## 🎖️ Best Practices Summary

1. **Always use TypeScript types** for better development experience
2. **Handle errors gracefully** with try-catch blocks
3. **Validate inputs** before processing
4. **Use async/await** properly for asynchronous operations
5. **Structure return objects** with consistent schemas
6. **Add meaningful comments** to explain complex logic
7. **Use interfaces** to define data contracts
8. **Implement proper error messages** for debugging
9. **Consider performance** for large data processing
10. **Test edge cases** like empty arrays, null values, etc.

This comprehensive guide should help you create robust, type-safe TypeScript nodes for your workflow system!