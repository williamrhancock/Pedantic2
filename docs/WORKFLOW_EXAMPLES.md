# Workflow Examples Documentation

This document provides comprehensive documentation for all example workflows included in the Pedantic2 project. Each workflow demonstrates different features, patterns, and use cases.

## Table of Contents

1. [Simple RAG Example](#simple-rag-example)
2. [Local RAG Workflow](#local-rag-workflow)
3. [Web RAG Workflow](#web-rag-workflow)
4. [Top Stock Workflow](#top-stock-workflow)
5. [Load Full Documents Example](#load-full-documents-example)
6. [Complete All Nodes Workflow](#complete-all-nodes-workflow)
7. [Mixed Python TypeScript Workflow](#mixed-python-typescript-workflow)

---

## Simple RAG Example

**File**: `Simple_RAG_Example.json`

### Overview

A minimal RAG (Retrieval-Augmented Generation) workflow that demonstrates the core concepts of vector embeddings, semantic search, and LLM-based question answering. This is the simplest RAG implementation, perfect for understanding the basics.

### What It Does

1. **Generates Sample Documents**: Creates a small knowledge base about Pedantic2 and related technologies
2. **Sets Up Vector Database**: Creates SQLite database with vector search extension
3. **Embeds Documents**: Converts text documents into vector embeddings
4. **Stores in Database**: Saves documents and embeddings for semantic search
5. **Processes User Query**: Takes a question and converts it to an embedding
6. **Searches Similar Content**: Finds the most relevant documents using vector similarity
7. **Generates Answer**: Uses LLM to answer the question based on retrieved context

### Workflow Structure

```
Start → Sample Documents → Setup DB → Load Extension → Create Vector Table
  → ForEach Loop → Embed Document → Store in DB → EndLoop
  → User Query → Embed Query → Vector Search → Format Context
  → LLM Generate Answer → Markdown Viewer → End
```

### Key Nodes

- **Sample Documents (Python)**: Generates 5 sample documents about Pedantic2, embeddings, vector DBs, RAG, and SQLite
- **Setup Database**: Creates `simple_rag.db` with a `docs` table
- **Load Extension**: Loads `vec0.dylib` for vector search capabilities
- **Create Vector Table**: Creates virtual table `vec_docs` with 384-dimensional embeddings
- **ForEach Loop**: Processes each document sequentially
- **Embedding Node**: Converts document text to vector embeddings using `all-MiniLM-L6-v2`
- **Database Insert**: Stores both text content and embeddings
- **User Query (Python)**: Defines the question "What is Pedantic2?"
- **Vector Search**: Finds top 2 most similar documents using KNN search
- **Format Context**: Prepares retrieved documents for LLM
- **LLM Answer**: Generates answer using GPT-4o-mini via OpenRouter
- **Markdown Viewer**: Displays the final answer

### Requirements

- `sqlite-vec` extension file (`vec0.dylib` for macOS) in `/tmp/workflow_files/`
- `OPENROUTER_API_KEY` environment variable
- `pysqlite3` installed (see [INSTALL_PYSQLITE3.md](INSTALL_PYSQLITE3.md))

### How to Use

1. Ensure the `vec0.dylib` extension is in `/tmp/workflow_files/`
2. Set `OPENROUTER_API_KEY` in your environment
3. Import the workflow JSON file
4. Execute the workflow
5. Click on the "View Answer" markdown node to see the result

### Expected Output

The workflow answers "What is Pedantic2?" using the sample documents, demonstrating how RAG provides grounded answers from a knowledge base.

### Learning Points

- Basic RAG architecture
- Vector embedding generation
- Semantic search with SQLite
- LLM prompt engineering with context
- ForEach loop for batch processing

---

## Local RAG Workflow

**File**: `Local_RAG_Workflow.json`

### Overview

A more comprehensive RAG workflow similar to Simple RAG but with additional features and better structure. Demonstrates local AI capabilities using sentence-transformers for embeddings and SQLite for vector storage.

### What It Does

Similar to Simple RAG but with:
- More detailed document processing
- Better context formatting with source citations
- Enhanced error handling
- More comprehensive query processing

### Workflow Structure

```
Start → Generate Sample Docs → Create Vector Table → Load Extension
  → Create vec Virtual Table → ForEach Embed → Embed Document
  → Insert Vector → EndLoop → Prepare Query → Embed User Query
  → Vector Search (Top 3) → Format Retrieved Context → LLM Generate Answer
  → View RAG Response → End
```

### Key Differences from Simple RAG

1. **Better Context Formatting**: Includes source IDs and similarity scores
2. **Top 3 Results**: Retrieves 3 documents instead of 2
3. **Source Citations**: LLM is instructed to cite sources with `[Source ID]`
4. **Query Preservation**: Better handling of user query through the workflow

### Requirements

Same as Simple RAG Example.

### Use Cases

- Building a local knowledge base
- Document Q&A systems
- Semantic search applications
- Local AI without cloud dependencies

---

## Web RAG Workflow

**File**: `Web_RAG_Workflow.json`

### Overview

A RAG workflow that fetches content from websites, processes it, and makes it queryable. Demonstrates web scraping, HTML parsing, chunking, and RAG with external data sources.

### What It Does

1. **Fetches Website Content**: Uses HTTP node to get HTML from a URL (default: Wikipedia RAG page)
2. **Parses HTML**: Extracts clean text using BeautifulSoup (`bs4`)
3. **Chunks Content**: Splits large documents into 500-character chunks for better embedding
4. **Stores in Vector DB**: Embeds and stores chunks with source URL tracking
5. **Answers Questions**: Uses RAG to answer questions about the scraped content

### Workflow Structure

```
Start → Set Website URL → Fetch Website → Parse HTML → Setup Database
  → Load Extension → Create Vector Table → ForEach Chunks → Generate Embedding
  → Store in DB → EndLoop → User Query → Embed Query → Vector Search
  → Format Context (with sources) → View Retrieved Context (parallel)
  → Generate Answer (parallel) → View Answer → End
```

### Key Nodes

- **Set Website URL (Python)**: Defines the URL to scrape (default: Wikipedia RAG page)
- **Fetch Website (HTTP)**: Downloads HTML content
- **Parse HTML (Python)**: 
  - Uses `bs4` (BeautifulSoup) to clean HTML
  - Removes scripts, styles, nav, footer, header
  - Extracts text and splits into 500-character chunks
  - Preserves source URL for citation
- **Format Context (Python)**: Creates both plain text (for LLM) and markdown (for display) versions
- **View Retrieved Context (Markdown)**: Shows what was retrieved before LLM processing
- **Generate Answer (LLM)**: Answers based on retrieved chunks

### Requirements

- Same as Simple RAG
- `bs4` (BeautifulSoup) available in Python environment (included in requirements.txt)

### How to Use

1. Import the workflow
2. Optionally modify the URL in "Set Website URL" node
3. Optionally modify the query in "User Query" node
4. Execute the workflow
5. View both the retrieved context and the final answer

### Expected Output

- **Retrieved Context**: Markdown showing the top 3 chunks with similarity scores and source URLs
- **Final Answer**: LLM-generated answer based on the website content

### Learning Points

- Web scraping and HTML parsing
- Document chunking strategies
- Source tracking and citation
- Parallel data flow (context viewer + LLM)
- Real-world RAG with external data

### Customization

- Change the URL to scrape any website
- Adjust chunk size in "Parse HTML" node
- Modify the user query
- Change the number of retrieved documents (currently k=3)

---

## Top Stock Workflow

**File**: `Top_Stock_Workflow.json`

### Overview

A financial data workflow that uses LLM to generate stock tickers, fetches real-time data from Polygon.io, calculates upside potential, and generates a ranked report. Demonstrates LLM integration, API calls, parallel processing, and data analysis.

### What It Does

1. **Generates Stock Tickers**: Uses LLM (Grok) to generate a list of stocks under $9
2. **Parses Tickers**: Extracts valid ticker symbols from LLM response
3. **Fetches Stock Data**: For each ticker, gets historical price data from Polygon.io
4. **Calculates Upside**: Computes 30-day upside potential based on recent price trends
5. **Ranks Results**: Filters and ranks stocks by upside percentage
6. **Generates Report**: Creates CSV file and markdown report

### Workflow Structure

```
Start → Get Stocks (LLM) → Parse Tickers → ForEach Stock
  → Inject API Key → Get Stock Data (HTTP) → Calculate Upside
  → EndLoop → Rank & Filter → Append to CSV (parallel)
  → Generate Markdown Report (parallel) → View Report → End
```

### Key Nodes

- **Get Stocks Under $9 (LLM)**: 
  - Uses Grok 4.1 Fast (free tier) via OpenRouter
  - Prompts for stocks that closed under $9 but traded over $9.25
  - Returns ticker list
- **Parse LLM Response (Python)**: 
  - Extracts ticker symbols using regex
  - Handles various LLM response formats
  - Converts to list of dicts for ForEach processing
- **Inject API Key (Python)**: 
  - Reads `POLYGON_API_KEY` from environment
  - Injects into workflow data for HTTP node template
- **Get Stock Data (HTTP)**: 
  - Calls Polygon.io aggregates endpoint
  - Gets 30 days of daily price data
- **Calculate 30-Day Upside (Python)**: 
  - Filters stocks under $10
  - Calculates target based on recent highs
  - Computes upside percentage
- **Rank & Filter (Python)**: 
  - Filters to valid targets only
  - Sorts by upside descending
  - Generates CSV content
- **Append to CSV (File)**: Saves results to `under_10_stocks_upside_report.csv`
- **Generate Markdown Report (Python)**: Creates formatted report with top 15 stocks
- **View Report (Markdown)**: Displays the final report

### Requirements

- `OPENROUTER_API_KEY` environment variable
- `POLYGON_API_KEY` environment variable (get from [polygon.io](https://polygon.io))
- Polygon.io API access (free tier available)

### How to Use

1. Set both API keys in your environment
2. Import the workflow
3. Optionally modify the LLM prompt in "Get Stocks Under $9" node
4. Optionally adjust date ranges in "Get Stock Data" HTTP node
5. Execute the workflow
6. View the markdown report
7. Check `/tmp/workflow_files/under_10_stocks_upside_report.csv` for full data

### Expected Output

- **Markdown Report**: Table showing top 15 stocks with ticker, price, target, and upside %
- **CSV File**: Full results with timestamps appended to file

### Learning Points

- LLM for data generation (ticker list)
- Environment variable injection
- Parallel ForEach processing (10 concurrent requests)
- Financial data API integration
- Data filtering and ranking
- File operations (append mode)
- Parallel outputs (CSV + Markdown)

### Customization

- Change stock price criteria in LLM prompt
- Adjust date ranges for historical data
- Modify concurrency limit (currently 10)
- Change ranking criteria (currently by upside %)
- Add more analysis (volume, volatility, etc.)

---

## Load Full Documents Example

**File**: `Load_Full_Documents_Example.json`

### Overview

Demonstrates how to load full documents (from files, URLs, or Python) into a vector database. Shows both full document storage and optional chunking strategies for large documents.

### What It Does

1. **Loads Documents**: Reads documents from files in `/tmp/workflow_files/documents/`
2. **Optionally Chunks**: Splits large documents into overlapping chunks
3. **Stores in Vector DB**: Embeds and stores with metadata (filename, chunk index)
4. **Queries**: Performs semantic search and answers questions

### Workflow Structure

```
Start → Load Documents from Files → Chunk Large Documents (Optional)
  → Setup Database → Load Extension → Create Vector Table
  → ForEach Docs → Generate Embedding → Store in DB → EndLoop
  → User Query → Embed Query → Vector Search → Format Context
  → Generate Answer → View Answer → End
```

### Key Nodes

- **Load Documents from Files (Python)**: 
  - Scans `/tmp/workflow_files/documents/` for `.txt` files
  - Reads full content (can handle large files)
  - Includes filename and size metadata
- **Chunk Large Documents (Python)**: 
  - Splits documents > 1000 chars into chunks
  - Uses 200-character overlap between chunks
  - Preserves filename and chunk index
- **Store in DB**: Stores filename, content, size, chunk_index, and embedding
- **Vector Search**: Retrieves top 5 results with filename and chunk info
- **Format Context**: Includes source filename and chunk index in citations

### Requirements

- Same as Simple RAG
- Documents in `/tmp/workflow_files/documents/` directory (optional)

### How to Use

1. **Option 1 - With Files**:
   - Create `/tmp/workflow_files/documents/` directory
   - Add `.txt` files with your documents
   - Execute workflow

2. **Option 2 - Without Files**:
   - The workflow will still run but won't find documents
   - You can modify "Load Documents" node to generate sample docs
   - Or connect an HTTP node before it to fetch documents

3. **Customization**:
   - Modify chunk size (currently 1000 chars)
   - Adjust chunk overlap (currently 200 chars)
   - Change file extensions (currently `.txt`)
   - Add metadata fields

### Expected Output

- Documents loaded and embedded
- Query answered with source citations including filename and chunk number

### Learning Points

- Loading documents from filesystem
- Document chunking strategies
- Metadata preservation (filename, chunk index)
- Handling large documents (SQLite supports up to 1GB per field)
- Source citation with chunk information

### Use Cases

- Building knowledge bases from document collections
- Processing large PDFs or text files
- Creating searchable document archives
- Document Q&A systems with source tracking

---

## Complete All Nodes Workflow

**File**: `Complete_All_Nodes_Workflow.json`

### Overview

A comprehensive demonstration workflow that uses every node type available in Pedantic2. Perfect for understanding how all nodes work together and testing the complete feature set.

### What It Does

Demonstrates all node types in a realistic workflow:
1. Generates sample product data
2. Enhances data with TypeScript
3. Fetches external data via HTTP
4. Processes items in a ForEach loop
5. Uses LLM to analyze products
6. Saves analysis to file
7. Routes data with conditional logic
8. Logs to database
9. Generates final markdown report

### Workflow Structure

```
Start → Python Data Generator → TypeScript Enhancer
  ├→ HTTP External Data → Condition Router
  └→ ForEach Processor → LLM Analyzer → File Save Analysis → Condition Router
      → Database Logger → Database Insert → Python Final Processor
      → TypeScript Formatter → File Save Report → Markdown Viewer → End
```

### Node Types Demonstrated

1. **Start Node**: Workflow initiation
2. **Python Node (2x)**: 
   - Data generation (products, prices, categories)
   - Final processing (summary generation)
3. **TypeScript Node (2x)**: 
   - Data enhancement (analytics, metadata)
   - Report formatting (markdown generation)
4. **HTTP Node**: External API data fetching (JSONPlaceholder)
5. **ForEach Loop**: Iterative processing of product items
6. **LLM Node**: AI-powered product analysis
7. **File Node (2x)**: 
   - Append mode (product analyses)
   - Write mode (final report)
8. **Condition Node**: Logic routing based on price thresholds
9. **Database Node (2x)**: 
   - Table creation
   - Data insertion
10. **Markdown Viewer**: Report display
11. **End Node**: Workflow completion

### Key Features

- **Parallel Data Flow**: TypeScript enhancer feeds both HTTP and ForEach
- **Conditional Routing**: Routes based on price (high/medium/low value)
- **Database Logging**: Tracks workflow execution
- **File Operations**: Both append and write modes
- **LLM Integration**: Product analysis with context
- **Comprehensive Reporting**: Final markdown report with all details

### Requirements

- `OPENROUTER_API_KEY` environment variable (for LLM node)
- Internet connection (for HTTP node)

### How to Use

1. Set `OPENROUTER_API_KEY` in environment
2. Import the workflow
3. Execute
4. View the markdown report
5. Check execution timeline to see all nodes in action

### Expected Output

- **Markdown Report**: Comprehensive report showing:
  - Workflow ID and status
  - Route taken (high/medium/low value)
  - Statistics (total value, items processed)
  - List of all node types used
- **Files Created**:
  - `product_analyses.txt`: LLM analyses of each product
  - `workflow_report.md`: Final markdown report
- **Database**: `workflow_logs.db` with execution records

### Learning Points

- All node types in one workflow
- Parallel data flows
- Conditional logic routing
- Database operations
- File operations (append vs write)
- LLM integration patterns
- TypeScript and Python interoperability
- ForEach loop processing
- Comprehensive reporting

### Use Cases

- Testing all features
- Learning workflow patterns
- Template for complex workflows
- Demonstrating capabilities
- Integration testing

---

## Mixed Python TypeScript Workflow

**File**: `Mixed_Python_TypeScript_Workflow.json`

### Overview

Demonstrates seamless interoperability between Python and TypeScript nodes. Shows how data flows between different language environments and how each language's strengths can be leveraged.

### What It Does

1. **Python Generates Data**: Creates sample e-commerce order data
2. **TypeScript Processes**: Calculates analytics (revenue, averages, top products)
3. **Python Reports**: Generates formatted text report
4. **TypeScript Finalizes**: Converts to HTML and adds metadata

### Workflow Structure

```
Start → Python Data Generator → TypeScript Processor
  → Python Reporter → TypeScript Finalizer → End
```

### Key Nodes

- **Python Data Generator**: 
  - Generates 5 random orders
  - Includes product, quantity, price, customer_id, timestamp
  - Uses Python's `random` and `datetime` modules
- **TypeScript Processor**: 
  - Calculates total revenue
  - Computes average order value
  - Finds top product by quantity
  - Counts unique customers
  - Uses TypeScript's type system and array methods
- **Python Reporter**: 
  - Formats analytics as text report
  - Sorts orders by revenue
  - Uses Python string formatting
- **TypeScript Finalizer**: 
  - Converts text report to HTML
  - Adds metadata
  - Uses TypeScript string manipulation

### Requirements

None (no external APIs or dependencies)

### How to Use

1. Import the workflow
2. Execute
3. View final output in the end node

### Expected Output

- **Final Report**: Contains:
  - Text report (formatted by Python)
  - HTML report (converted by TypeScript)
  - Metadata (processing chain, languages used)

### Learning Points

- Python ↔ TypeScript data flow
- Type safety in TypeScript
- Python's data manipulation strengths
- TypeScript's string/array methods
- Seamless JSON serialization between languages
- When to use Python vs TypeScript

### Use Cases

- Leveraging language strengths (Python for data, TS for logic)
- Learning interoperability
- Building workflows that need both languages
- Demonstrating type safety benefits

### Customization

- Add more Python nodes for data processing
- Add more TypeScript nodes for type-safe transformations
- Mix and match based on task requirements

---

## General Workflow Tips

### Importing Workflows

1. Click "Open Workflow" in the top navigation
2. Select "Import from File"
3. Choose the JSON file from `docs/` folder
4. The workflow will load with all nodes and connections

### Modifying Workflows

- **Change API Keys**: Update environment variables or node configs
- **Adjust Parameters**: Edit node configs (URLs, queries, thresholds)
- **Add Nodes**: Insert new nodes between existing ones
- **Modify Code**: Edit Python/TypeScript code in node editors

### Debugging

- Use "Skip During Execution" to bypass problematic nodes
- Check execution timeline for detailed logs
- View node outputs by clicking on nodes after execution
- Use Python nodes to print debug information

### Best Practices

1. **Start Simple**: Begin with Simple RAG before trying Web RAG
2. **Test Incrementally**: Test each section before connecting everything
3. **Use Environment Variables**: Never hardcode API keys
4. **Handle Errors**: Add error handling in Python/TypeScript nodes
5. **Document Changes**: Add comments in code nodes explaining logic
6. **Version Control**: Export workflows to JSON for version control

### Common Issues

- **Extension Not Found**: Ensure `vec0.dylib` is in `/tmp/workflow_files/`
- **API Key Missing**: Check environment variables are set
- **Import Errors**: Ensure all Python modules are in `requirements.txt`
- **Data Loss**: Use EndLoop nodes properly in ForEach loops
- **Timeout Errors**: Increase timeout values in HTTP nodes

---

## Next Steps

- Explore each workflow's code to understand patterns
- Modify workflows to suit your needs
- Combine patterns from different workflows
- Create your own workflows using these as templates
- Refer to [WORKFLOW_NODES_GUIDE.md](WORKFLOW_NODES_GUIDE.md) for detailed node documentation

For more information, see:
- [WORKFLOW_NODES_GUIDE.md](WORKFLOW_NODES_GUIDE.md) - Complete node reference
- [LLM_WORKFLOW_GENERATION_GUIDE.md](LLM_WORKFLOW_GENERATION_GUIDE.md) - LLM workflow generation guide
- [INSTALL_PYSQLITE3.md](INSTALL_PYSQLITE3.md) - Vector database setup
- [README.md](../README.md) - Project overview

