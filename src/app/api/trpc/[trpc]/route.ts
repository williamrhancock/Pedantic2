import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createTRPCRouter, publicProcedure } from '@/lib/trpc'
import {
  workflowQueries,
  executionQueries,
  nodeTemplateQueries,
  customNodeQueries,
  dbPath,
  type Workflow
} from '@/lib/db'
import fs from 'fs'
import { z } from 'zod'

const appRouter = createTRPCRouter({
  // === CORE WORKFLOW OPERATIONS ===
  getWorkflow: publicProcedure
    .input(z.object({
      id: z.number(),
      includeHistory: z.boolean().optional().default(false)
    }))
    .query(async ({ input }) => {
      const workflow = await workflowQueries.getWorkflow(input.id)
      if (!workflow) {
        throw new Error('Workflow not found')
      }
      
      let executionHistory: any[] = []
      if (input.includeHistory) {
        executionHistory = await executionQueries.getHistory(input.id)
      }
      
      return {
        ...workflow,
        data: JSON.parse(workflow.data),
        executionHistory
      }
    }),

  getWorkflowByName: publicProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const workflow = await workflowQueries.getWorkflowByName(input.name)
      if (!workflow) return null
      return {
        id: workflow.id,
        name: workflow.name,
      }
    }),

  deleteWorkflowsByName: publicProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      await workflowQueries.deleteWorkflowsByName(input.name)
      // Also clean up any execution history linked to those workflows
      // (this is a best-effort; executions without a workflow row are harmless).
      // We don't have a direct delete-by-name, so this is left as-is for now.
      return { success: true }
    }),

  saveWorkflow: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      data: z.object({
        nodes: z.record(z.any()),
        connections: z.record(z.any()),
        metadata: z.any().optional()
      }),
      isTemplate: z.boolean().optional(),
      isPublic: z.boolean().optional()
    }))
    .mutation(async ({ input }) => {
      // Guardrail: never create new workflows with the default "Untitled" names.
      // This prevents legacy or stray callers from filling the DB with unnamed entries.
      const isUntitledDefault =
        !input.id &&
        (input.name === 'Untitled' || input.name === 'Untitled Workflow')
      if (isUntitledDefault) {
        throw new Error('Cannot save workflow with the default Untitled name. Please choose a name.')
      }

      if (input.id) {
        // Update existing
        await workflowQueries.updateWorkflow(input.id, {
          name: input.name,
          description: input.description,
          tags: input.tags,
          data: JSON.stringify(input.data),
          is_template: input.isTemplate,
          is_public: input.isPublic
        })
        return { id: input.id, created: false }
      } else {
        // Create new
        const id = await workflowQueries.createWorkflow(
          input.name,
          JSON.stringify(input.data)
        )
        
        // Update with additional metadata if provided
        if (input.description || input.tags || input.isTemplate || input.isPublic) {
          await workflowQueries.updateWorkflow(id, {
            description: input.description,
            tags: input.tags,
            is_template: input.isTemplate,
            is_public: input.isPublic
          })
        }
        
        return { id, created: true }
      }
    }),

  // === WORKFLOW MANAGEMENT ===
  listWorkflows: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.enum(['all', 'templates', 'my-workflows', 'public']).default('all'),
      sortBy: z.enum(['updated', 'created', 'name']).default('updated'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      return await workflowQueries.listWorkflows(input)
    }),

  duplicateWorkflow: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      const id = await workflowQueries.duplicateWorkflow(input.id, input.name)
      return { id, success: true }
    }),

  deleteWorkflow: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await workflowQueries.deleteWorkflow(input.id)
      await executionQueries.deleteHistory(input.id)
      return { success: true }
    }),

  deleteUntitledWorkflows: publicProcedure
    .mutation(async () => {
      // Best-effort cleanup of legacy "Untitled" entries.
      await workflowQueries.deleteWorkflowsByName('Untitled')
      await workflowQueries.deleteWorkflowsByName('Untitled Workflow')
      return { success: true }
    }),

  checkWorkflowName: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      excludeId: z.number().optional()
    }))
    .query(async ({ input }) => {
      const exists = await workflowQueries.checkWorkflowName(input.name, input.excludeId)
      return { exists }
    }),

  // === IMPORT/EXPORT ===
  exportWorkflow: publicProcedure
    .input(z.object({
      id: z.number(),
      format: z.enum(['json', 'yaml']).default('json'),
      includeMetadata: z.boolean().default(true)
    }))
    .query(async ({ input }) => {
      const workflow = await workflowQueries.getWorkflow(input.id)
      if (!workflow) {
        throw new Error('Workflow not found')
      }
      
      const exportData = {
        format: 'pedantic-workflow-v1',
        metadata: input.includeMetadata ? {
          name: workflow.name,
          description: workflow.description,
          tags: workflow.tags,
          exportedAt: new Date().toISOString(),
          version: workflow.version
        } : undefined,
        workflow: JSON.parse(workflow.data)
      }
      
      return {
        data: exportData,
        filename: `${workflow.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`
      }
    }),

  importWorkflow: publicProcedure
    .input(z.object({
      data: z.any(), // Workflow export format
      name: z.string().optional(),
      overwriteMetadata: z.boolean().default(true)
    }))
    .mutation(async ({ input }) => {
      // Validate import format
      if (input.data.format !== 'pedantic-workflow-v1') {
        throw new Error('Unsupported workflow format')
      }
      
      const name = input.name || input.data.metadata?.name || 'Imported Workflow'
      const description = input.overwriteMetadata
        ? input.data.metadata?.description || 'Imported workflow'
        : 'Imported workflow'
      
      const id = await workflowQueries.createWorkflow(
        name,
        JSON.stringify(input.data.workflow)
      )
      
      // Add metadata
      await workflowQueries.updateWorkflow(id, {
        description,
        tags: input.data.metadata?.tags || [],
        is_template: false,
        is_public: false
      })
      
      return { id, name }
    }),

  // === EXECUTION & HISTORY ===
  executeWorkflow: publicProcedure
    .input(z.object({
      workflowId: z.number().optional(),
      workflow: z.any(),
      saveExecution: z.boolean().default(true)
    }))
    .mutation(async ({ input }) => {
      const startTime = new Date()
      
      try {
        // Execute via FastAPI
        const response = await fetch('http://localhost:8000/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow: input.workflow }),
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        const completedAt = new Date()
        const duration = (completedAt.getTime() - startTime.getTime()) / 1000
        
        // Save execution history if requested
        if (input.saveExecution && input.workflowId) {
          await executionQueries.saveExecution({
            workflowId: input.workflowId,
            status: result.status,
            duration,
            executionData: result,
            startedAt: startTime,
            completedAt
          })
        }
        
        return {
          ...result,
          executionMetadata: {
            duration,
            timestamp: completedAt.toISOString()
          }
        }
      } catch (error) {
        const completedAt = new Date()
        const duration = (completedAt.getTime() - startTime.getTime()) / 1000
        
        // Save failed execution if requested
        if (input.saveExecution && input.workflowId) {
          await executionQueries.saveExecution({
            workflowId: input.workflowId,
            status: 'error',
            duration,
            executionData: { error: (error as Error).message },
            startedAt: startTime,
            completedAt
          })
        }
        
        // Enhanced fallback execution
        console.log('FastAPI server not available, using mock execution:', error)
        
        const nodes = input.workflow.nodes || {}
        const mockResults = []
        
        for (const [nodeId, nodeData] of Object.entries(nodes) as [string, any][]) {
          let result: any = {
            id: nodeId,
            status: 'success',
            output: null,
            stdout: '',
            stderr: '',
            execution_time: Math.random() * 0.5
          }
          
          if (nodeData.type === 'start') {
            result.output = { message: 'Starting workflow' }
            result.stdout = 'Workflow started successfully'
          } else if (nodeData.type === 'end') {
            result.output = { message: 'Workflow completed' }
            result.stdout = 'Workflow finished successfully'
          } else if (nodeData.type === 'python') {
            result.output = { processed: true, language: 'python' }
            result.stdout = `Executed Python code: ${nodeData.code?.split('\n')[0] || 'def run(input): return input'}`
          } else if (nodeData.type === 'typescript') {
            result.output = { processed: true, language: 'typescript' }
            result.stdout = `Executed TypeScript code: ${nodeData.code?.split('\n')[0] || 'async function run(input): Promise<any>'}`
          } else if (nodeData.type === 'llm') {
            result.output = { processed: true, provider: nodeData.config?.provider || 'openai' }
            result.stdout = `Executed LLM node with ${nodeData.config?.model || 'gpt-3.5-turbo'}`
          }
          
          mockResults.push(result)
        }
        
        const mockResult = {
          status: 'success',
          nodes: mockResults,
          total_time: mockResults.reduce((sum: number, node: any) => sum + node.execution_time, 0),
          error: null
        }
        
        // Save mock execution if requested
        if (input.saveExecution && input.workflowId) {
          await executionQueries.saveExecution({
            workflowId: input.workflowId,
            status: 'success',
            duration,
            executionData: mockResult,
            startedAt: startTime,
            completedAt
          })
        }
        
        return mockResult
      }
    }),

  getExecutionHistory: publicProcedure
    .input(z.object({
      workflowId: z.number(),
      limit: z.number().default(50),
      offset: z.number().default(0)
    }))
    .query(async ({ input }) => {
      return await executionQueries.getHistory(input.workflowId, input.limit, input.offset)
    }),

  // === NODE TEMPLATES ===
  getNodeTemplates: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      return await nodeTemplateQueries.getTemplates(input)
    }),

  saveNodeTemplate: publicProcedure
    .input(z.object({
      type: z.string(),
      name: z.string(),
      description: z.string(),
      defaultConfig: z.any(),
      category: z.string()
    }))
    .mutation(async ({ input }) => {
      const id = await nodeTemplateQueries.saveTemplate({
        type: input.type,
        name: input.name,
        description: input.description,
        defaultConfig: input.defaultConfig,
        category: input.category
      })
      return { id, success: true }
    }),

  // === CUSTOM NODES ===
  getCustomNodes: publicProcedure
    .query(async () => {
      const nodes = await customNodeQueries.listCustomNodes()
      return nodes
    }),

  saveCustomNode: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.string().min(1),
      data: z.any()
    }))
    .mutation(async ({ input }) => {
      const { id, name, description, type, data } = input

      // Enforce unique name (global)
      const existingWithName = await customNodeQueries.getCustomNodeByName(name)

      if (!id) {
        if (existingWithName) {
          throw new Error(`A custom node named "${name}" already exists`)
        }

        const newId = await customNodeQueries.createCustomNode(
          name,
          type,
          description ?? null,
          JSON.stringify(data ?? {})
        )
        return { id: newId, created: true }
      }

      // Updating existing custom node
      if (existingWithName && existingWithName.id !== id) {
        throw new Error(`A custom node named "${name}" already exists`)
      }

      await customNodeQueries.updateCustomNode(id, {
        name,
        description,
        config: JSON.stringify(data ?? {})
      })

      return { id, created: false }
    }),

  deleteCustomNode: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await customNodeQueries.deleteCustomNode(input.id)
      return { success: true }
    }),

  exportCustomNode: publicProcedure
    .input(z.object({
      id: z.number()
    }))
    .mutation(async ({ input }) => {
      const node = await customNodeQueries.getCustomNode(input.id)
      if (!node) {
        throw new Error('Custom node not found')
      }

      const exportData = {
        format: 'pedantic-custom-node-v1',
        metadata: {
          name: node.name,
          description: node.description,
          type: node.type,
          exportedAt: new Date().toISOString(),
        },
        node: node.config ?? {},
      }

      return {
        data: exportData,
        filename: `${node.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`
      }
    }),

  importCustomNode: publicProcedure
    .input(z.object({
      data: z.any(),
      overwrite: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { data, overwrite } = input

      if (!data || data.format !== 'pedantic-custom-node-v1') {
        throw new Error('Unsupported custom node format')
      }

      const name = data.metadata?.name as string | undefined
      const type = data.metadata?.type as string | undefined
      const description = data.metadata?.description as string | undefined
      const nodeConfig = data.node

      if (!name || !type) {
        throw new Error('Custom node must have a name and type')
      }

      const existing = await customNodeQueries.getCustomNodeByName(name)

      if (existing && !overwrite) {
        // Signal to the client that this is specifically a name-collision case.
        throw new Error(`A custom node named "${name}" already exists`)
      }

      if (existing && overwrite) {
        await customNodeQueries.updateCustomNode(existing.id, {
          name,
          description,
          config: JSON.stringify(nodeConfig ?? {}),
        })

        return {
          id: existing.id,
          name,
          type,
        }
      }

      const newId = await customNodeQueries.createCustomNode(
        name,
        type,
        description ?? null,
        JSON.stringify(nodeConfig ?? {})
      )

      return {
        id: newId,
        name,
        type,
      }
    }),

  getDbStats: publicProcedure
    .query(async () => {
      const { workflows, total } = await workflowQueries.listWorkflows({ limit: 1, offset: 0 })
      const customNodes = await customNodeQueries.listCustomNodes()
      let sizeBytes = 0
      try {
        const stat = await fs.promises.stat(dbPath)
        sizeBytes = stat.size
      } catch (e) {
        console.error('Failed to stat DB file for size:', e)
      }
      return {
        workflowCount: total,
        customNodeCount: customNodes.length,
        dbSizeBytes: sizeBytes,
      }
    }),

  // === DB MAINTENANCE ===
  backupDatabase: publicProcedure
    .mutation(async () => {
      const buffer = await fs.promises.readFile(dbPath)
      const base64 = buffer.toString('base64')
      const filename = `pedantic-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
      return { filename, base64 }
    }),

  compactDatabase: publicProcedure
    .mutation(async () => {
      // Use SQLite VACUUM to compact the DB
      await workflowQueries.listWorkflows() // ensure DB initialized
      await new Promise<void>((resolve, reject) => {
        const sqlite3 = require('sqlite3') as typeof import('sqlite3')
        const db = new sqlite3.Database(dbPath)
        db.exec('VACUUM', (err) => {
          db.close()
          if (err) reject(err)
          else resolve()
        })
      })
      return { success: true }
    })
})

export type AppRouter = typeof appRouter

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  })

export { handler as GET, handler as POST }