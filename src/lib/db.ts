import sqlite3 from 'sqlite3'
import path from 'path'
import { promisify } from 'util'

export const dbPath = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'data.db')
  : path.join(process.cwd(), 'data.dev.db')

export const db = new sqlite3.Database(dbPath)

// Promisify database methods with correct error handling
const dbRun = (sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params || [], function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err)
      } else {
        resolve({ lastID: this.lastID, changes: this.changes })
      }
    })
  })
}

const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbAll = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>

// Initialize the database schema
const initializeDatabase = async () => {
  // Enhanced workflows table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      tags TEXT, -- JSON array
      version TEXT DEFAULT '1.0.0',
      data TEXT NOT NULL,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_template BOOLEAN DEFAULT FALSE,
      is_public BOOLEAN DEFAULT FALSE
    )
  `)
  
  // Execution history table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS workflow_executions (
      id INTEGER PRIMARY KEY,
      workflow_id INTEGER REFERENCES workflows(id),
      execution_data TEXT, -- JSON execution results
      status TEXT, -- 'success', 'error', 'timeout'
      duration_seconds REAL,
      started_at DATETIME,
      completed_at DATETIME
    )
  `)
  
  // Node templates table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS node_templates (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      default_config TEXT, -- JSON
      category TEXT,
      is_system BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // LLM usage tracking table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS llm_usage (
      id INTEGER PRIMARY KEY,
      workflow_id INTEGER,
      node_id TEXT,
      provider TEXT,
      model TEXT,
      tokens_input INTEGER,
      tokens_output INTEGER,
      cost_usd REAL,
      execution_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Custom nodes table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS custom_nodes (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Create indexes
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_workflows_id ON workflows(id)`)
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at)`)
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_workflows_template ON workflows(is_template)`)
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions(workflow_id)`)
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_node_templates_type ON node_templates(type)`)
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_custom_nodes_type ON custom_nodes(type)`)
  
  // Migrate existing data if needed
  await migrateExistingData()
}

// Migrate existing workflows to new schema
const migrateExistingData = async () => {
  try {
    // Check if we need to migrate (if description column doesn't exist)
    const tableInfo = await dbAll("PRAGMA table_info(workflows)") as Array<{ name: string }>
    const hasDescription = tableInfo.some(col => col.name === 'description')
    
    if (!hasDescription) {
      console.log('Migrating workflows to new schema...')
      
      // Add new columns with default values
      await dbRun(`ALTER TABLE workflows ADD COLUMN description TEXT`)
      await dbRun(`ALTER TABLE workflows ADD COLUMN tags TEXT DEFAULT '[]'`)
      await dbRun(`ALTER TABLE workflows ADD COLUMN version TEXT DEFAULT '1.0.0'`)
      await dbRun(`ALTER TABLE workflows ADD COLUMN created_by TEXT`)
      await dbRun(`ALTER TABLE workflows ADD COLUMN is_template BOOLEAN DEFAULT FALSE`)
      await dbRun(`ALTER TABLE workflows ADD COLUMN is_public BOOLEAN DEFAULT FALSE`)
      
      console.log('Migration completed successfully')
    }
  } catch (error) {
    console.error('Migration error:', error)
  }
}

export interface Workflow {
  id: number
  name: string
  description?: string
  tags?: string[] // Will be parsed from JSON
  version: string
  data: string
  created_by?: string
  created_at: string
  updated_at: string
  is_template: boolean
  is_public: boolean
}

// Raw database row interface
interface WorkflowRow {
  id: number
  name: string
  description?: string
  tags?: string // JSON string in database
  version: string
  data: string
  created_by?: string
  created_at: string
  updated_at: string
  is_template: boolean
  is_public: boolean
}

export interface WorkflowExecution {
  id: number
  workflow_id: number
  execution_data: string
  status: 'success' | 'error' | 'timeout'
  duration_seconds: number
  started_at: string
  completed_at: string
}

export interface NodeTemplate {
  id: number
  type: string
  name: string
  description?: string
  default_config: string
  category: string
  is_system: boolean
  created_at: string
}

export interface LLMUsage {
  id: number
  workflow_id?: number
  node_id: string
  provider: string
  model: string
  tokens_input: number
  tokens_output: number
  cost_usd: number
  execution_time_ms: number
  created_at: string
}

// Helper to map a raw workflow row into the public Workflow shape
const mapWorkflowRow = (workflow: WorkflowRow): Workflow => {
  // Parse tags from JSON string
  let tags: string[] = []
  if (workflow.tags) {
    try {
      tags = JSON.parse(workflow.tags)
    } catch {
      tags = []
    }
  }

  return {
    ...workflow,
    tags,
  }
}

// Enhanced workflow queries
export const workflowQueries = {
  getWorkflow: async (id: number): Promise<Workflow | undefined> => {
    const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [id]) as WorkflowRow | undefined
    if (!workflow) return undefined
    return mapWorkflowRow(workflow)
  },

  getWorkflowByName: async (name: string): Promise<Workflow | undefined> => {
    const workflow = await dbGet(
      'SELECT * FROM workflows WHERE name COLLATE NOCASE = ? ORDER BY updated_at DESC LIMIT 1',
      [name]
    ) as WorkflowRow | undefined
    if (!workflow) return undefined
    return mapWorkflowRow(workflow)
  },
  
  saveWorkflow: async (id: number, name: string, data: string): Promise<void> => {
    await dbRun(`
      INSERT OR REPLACE INTO workflows (id, name, data, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [id, name, data])
  },
  
  createWorkflow: async (name: string, data: string): Promise<number> => {
    // Final safety check at database level - prevent "Untitled" workflows
    const isUntitled = 
      name.toLowerCase() === 'untitled' || 
      name.toLowerCase() === 'untitled workflow'
    
    if (isUntitled) {
      throw new Error('Cannot create workflow with the default Untitled name. Please choose a name.')
    }
    
    const result = await dbRun(`
      INSERT INTO workflows (name, data)
      VALUES (?, ?)
    `, [name, data])
    return (result.lastID ?? 0) as number
  },
  
  updateWorkflow: async (id: number, updates: {
    name?: string
    description?: string
    tags?: string[]
    data?: string
    is_template?: boolean
    is_public?: boolean
  }): Promise<void> => {
    const fields: string[] = []
    const values: any[] = []
    
    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?')
      values.push(JSON.stringify(updates.tags))
    }
    if (updates.data !== undefined) {
      fields.push('data = ?')
      values.push(updates.data)
    }
    if (updates.is_template !== undefined) {
      fields.push('is_template = ?')
      values.push(updates.is_template)
    }
    if (updates.is_public !== undefined) {
      fields.push('is_public = ?')
      values.push(updates.is_public)
    }
    
    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')')
      values.push(id)
      
      await dbRun(`
        UPDATE workflows
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values)
    }
  },
  
  listWorkflows: async (options: {
    search?: string
    tags?: string[]
    category?: 'all' | 'templates' | 'my-workflows' | 'public'
    sortBy?: 'updated' | 'created' | 'name'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
  } = {}): Promise<{ workflows: Workflow[]; total: number }> => {
    const {
      search = '',
      tags = [],
      category = 'all',
      sortBy = 'updated',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = options
    
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    
    // Search filter
    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    // Category filter
    if (category === 'templates') {
      whereClause += ' AND is_template = 1'
    } else if (category === 'public') {
      whereClause += ' AND is_public = 1'
    } else if (category === 'my-workflows') {
      whereClause += ' AND is_template = 0 AND is_public = 0'
    }
    
    // Tags filter
    if (tags.length > 0) {
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' AND ')
      whereClause += ` AND (${tagConditions})`
      tags.forEach(tag => params.push(`%"${tag}"%`))
    }
    
    // Sort order
    let orderClause = 'ORDER BY '
    if (sortBy === 'updated') {
      orderClause += `updated_at ${sortOrder.toUpperCase()}`
    } else if (sortBy === 'created') {
      orderClause += `created_at ${sortOrder.toUpperCase()}`
    } else if (sortBy === 'name') {
      orderClause += `name ${sortOrder.toUpperCase()}`
    }
    
    // Get total count
    const totalResult = await dbGet(
      `SELECT COUNT(*) as count FROM workflows ${whereClause}`,
      params
    ) as { count: number }
    
    // Get paginated results
    const workflows = await dbAll(`
      SELECT * FROM workflows
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]) as WorkflowRow[]
    
    // Parse tags for each workflow
    const parsedWorkflows: Workflow[] = workflows.map(workflow => {
      let tags: string[] = []
      if (workflow.tags) {
        try {
          tags = JSON.parse(workflow.tags)
        } catch {
          tags = []
        }
      }
      return {
        ...workflow,
        tags
      }
    })
    
    return {
      workflows: parsedWorkflows,
      total: totalResult.count
    }
  },
  

  checkWorkflowName: async (name: string, excludeId?: number): Promise<boolean> => {
    const params: any[] = [name]
    let query = 'SELECT COUNT(*) as count FROM workflows WHERE name COLLATE NOCASE = ?'
    
    if (excludeId !== undefined) {
      query += ' AND id != ?'
      params.push(excludeId)
    }
    
    const result = await dbGet(query, params) as { count: number } | undefined
    return (result?.count ?? 0) > 0
  },
  
  deleteWorkflow: async (id: number): Promise<void> => {
    await dbRun('DELETE FROM workflows WHERE id = ?', [id])
  },

  deleteWorkflowsByName: async (name: string): Promise<void> => {
    await dbRun('DELETE FROM workflows WHERE name COLLATE NOCASE = ?', [name])
  },
  
  duplicateWorkflow: async (id: number, newName: string): Promise<number> => {
    // Prevent duplicating with "Untitled" names
    const isUntitled = 
      newName.toLowerCase() === 'untitled' || 
      newName.toLowerCase() === 'untitled workflow'
    
    if (isUntitled) {
      throw new Error('Cannot duplicate workflow with the default Untitled name. Please choose a name.')
    }
    
    const original = await workflowQueries.getWorkflow(id)
    if (!original) {
      throw new Error('Workflow not found')
    }
    
    const result = await dbRun(`
      INSERT INTO workflows (name, description, tags, data, is_template, is_public)
      VALUES (?, ?, ?, ?, 0, 0)
    `, [
      newName,
      original.description ? `Copy of ${original.description}` : null,
      original.tags ? JSON.stringify(original.tags) : '[]',
      original.data
    ])
    
    return (result.lastID ?? 0) as number
  }
}

// Execution history queries
export const executionQueries = {
  saveExecution: async (execution: {
    workflowId: number
    status: string
    duration: number
    executionData: any
    startedAt: Date
    completedAt: Date
  }): Promise<number> => {
    const result = await dbRun(`
      INSERT INTO workflow_executions (
        workflow_id, execution_data, status, duration_seconds, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      execution.workflowId,
      JSON.stringify(execution.executionData),
      execution.status,
      execution.duration,
      execution.startedAt.toISOString(),
      execution.completedAt.toISOString()
    ])
    return (result.lastID ?? 0) as number
  },
  
  getHistory: async (
    workflowId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkflowExecution[]> => {
    return await dbAll(`
      SELECT * FROM workflow_executions
      WHERE workflow_id = ?
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `, [workflowId, limit, offset]) as WorkflowExecution[]
  },
  
  deleteHistory: async (workflowId: number): Promise<void> => {
    await dbRun('DELETE FROM workflow_executions WHERE workflow_id = ?', [workflowId])
  }
}

// Node template queries
export const nodeTemplateQueries = {
  getTemplates: async (options: {
    category?: string
    search?: string
  } = {}): Promise<NodeTemplate[]> => {
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    
    if (options.category) {
      whereClause += ' AND category = ?'
      params.push(options.category)
    }
    
    if (options.search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)'
      params.push(`%${options.search}%`, `%${options.search}%`)
    }
    
    return await dbAll(`
      SELECT * FROM node_templates
      ${whereClause}
      ORDER BY name ASC
    `, params) as NodeTemplate[]
  },
  
  saveTemplate: async (template: {
    type: string
    name: string
    description: string
    defaultConfig: any
    category: string
  }): Promise<number> => {
    const result = await dbRun(`
      INSERT INTO node_templates (type, name, description, default_config, category)
      VALUES (?, ?, ?, ?, ?)
    `, [
      template.type,
      template.name,
      template.description,
      JSON.stringify(template.defaultConfig),
      template.category
    ])
    return (result.lastID ?? 0) as number
  }
}

// LLM usage tracking
export const llmUsageQueries = {
  trackUsage: async (usage: {
    workflowId?: number
    nodeId: string
    provider: string
    model: string
    tokensInput: number
    tokensOutput: number
    costUsd: number
    executionTimeMs: number
  }): Promise<number> => {
    const result = await dbRun(`
      INSERT INTO llm_usage (
        workflow_id, node_id, provider, model,
        tokens_input, tokens_output, cost_usd, execution_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      usage.workflowId || null,
      usage.nodeId,
      usage.provider,
      usage.model,
      usage.tokensInput,
      usage.tokensOutput,
      usage.costUsd,
      usage.executionTimeMs
    ])
    return (result.lastID ?? 0) as number
  },
  
  getUsage: async (workflowId?: number): Promise<LLMUsage[]> => {
    if (workflowId) {
      return await dbAll(`
        SELECT * FROM llm_usage
        WHERE workflow_id = ?
        ORDER BY created_at DESC
      `, [workflowId]) as LLMUsage[]
    } else {
      return await dbAll(`
        SELECT * FROM llm_usage
        ORDER BY created_at DESC
        LIMIT 100
      `) as LLMUsage[]
    }
  }
}



// Custom node queries
export const customNodeQueries = {
  createCustomNode: async (name: string, type: string, description: string | null, config: string): Promise<number> => {
    const result = await dbRun(`
      INSERT INTO custom_nodes (name, type, description, config)
      VALUES (?, ?, ?, ?)
    `, [name, type, description, config])
    return (result.lastID ?? 0) as number
  },

  getCustomNodeByName: async (name: string): Promise<any | undefined> => {
    const node = await dbGet('SELECT * FROM custom_nodes WHERE name = ?', [name])
    if (!node) return undefined
    return {
      ...node,
      config: JSON.parse(node.config)
    }
  },
  
  getCustomNode: async (id: number): Promise<any | undefined> => {
    const node = await dbGet('SELECT * FROM custom_nodes WHERE id = ?', [id])
    if (!node) return undefined
    return {
      ...node,
      config: JSON.parse(node.config)
    }
  },
  
  listCustomNodes: async (): Promise<any[]> => {
    const nodes = await dbAll('SELECT * FROM custom_nodes ORDER BY created_at DESC') as any[]
    return nodes.map(node => ({
      ...node,
      config: JSON.parse(node.config)
    }))
  },
  
  deleteCustomNode: async (id: number): Promise<void> => {
    await dbRun('DELETE FROM custom_nodes WHERE id = ?', [id])
  },
  
  updateCustomNode: async (id: number, updates: {
    name?: string
    description?: string
    config?: string
  }): Promise<void> => {
    const fields: string[] = []
    const values: any[] = []
    
    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.config !== undefined) {
      fields.push('config = ?')
      values.push(updates.config)
    }
    
    if (fields.length > 0) {
      values.push(id)
      await dbRun(`
        UPDATE custom_nodes
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values)
    }
  }
}

// Ensure we have at least one workflow
// NOTE: This function is disabled to prevent creating "Untitled" workflows.
// Users should create workflows explicitly via the UI.
export async function ensureDefaultWorkflow() {
  // Disabled - no longer creating default "Untitled" workflows
  // The app should start with an empty state, and users create workflows via Save As
  return
}

// Initialize database and default workflow on startup
initializeDatabase().then(() => {
  ensureDefaultWorkflow().catch(console.error)
}).catch(console.error)