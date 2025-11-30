'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { WorkflowCanvasRef } from '@/components/canvas/WorkflowCanvas'
import { trpc } from '@/lib/trpc-provider'
import { WorkflowCanvas } from '@/components/canvas'
import { ModernToolbar } from '@/components/toolbar/ModernToolbar'
import { ExecutionTimeline, TimelineEntry } from '@/components/timeline/ExecutionTimeline'
import { NodeEditorModal } from '@/components/editor/NodeEditorModal'
import { SaveAsDialog } from '@/components/dialogs/SaveAsDialog'
import { DbMaintenanceModal } from '@/components/dialogs/DbMaintenanceModal'
import { LlmNodeDialog } from '@/components/dialogs/LlmNodeDialog'
import { HttpNodeDialog } from '@/components/dialogs/HttpNodeDialog'
import { MarkdownViewerModal } from '@/components/dialogs/MarkdownViewerModal'
import { HtmlViewerModal } from '@/components/dialogs/HtmlViewerModal'
import { JsonViewerModal } from '@/components/dialogs/JsonViewerModal'
import { useTheme } from '@/contexts/ThemeContext'
import type { NodeType } from '@/components/toolbar/ModernToolbar'
import { workflowNodeToCustomData } from '@/lib/custom-nodes'
import { createDefaultLlmConfig, normalizeLlmConfig, type LlmConfig } from '@/lib/llm'
import type { HttpConfig } from '@/components/dialogs/HttpNodeDialog'

interface WorkflowNode {
  id: string
  type: 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'foreach' | 'endloop' | 'markdown' | 'html' | 'json' | 'embedding'
  title: string
  description?: string
  code?: string
  config?: any
  position: { x: number; y: number }
  isExecuting?: boolean
  executionStatus?: 'success' | 'error' | 'running'
  customNodeId?: number
  customNodeName?: string
  skipDuringExecution?: boolean
}

interface Connection {
  from: string
  to: string
}

interface WorkflowMetadata {
  id?: number
  name: string
  description?: string
  tags: string[]
  isTemplate: boolean
  lastSaved?: Date
}

interface WorkflowBrowserProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (workflowData: any) => void
}

function WorkflowBrowser({ isOpen, onClose, onSelect }: WorkflowBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { isDark } = useTheme()
  const [workflowToDelete, setWorkflowToDelete] = useState<any | null>(null)

  const { data: workflowsData, isLoading, refetch } = trpc.listWorkflows.useQuery({
    search: searchTerm,
    category: 'my-workflows',
    limit: 20,
    offset: 0
  })

  const deleteWorkflowMutation = trpc.deleteWorkflow.useMutation({
    onSuccess: () => {
      refetch()
    }
  })

  const duplicateWorkflowMutation = trpc.duplicateWorkflow.useMutation({
    onSuccess: () => {
      refetch()
    }
  })

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">Open Workflow</h2>
          <button
            onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflowsData?.workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="glass-card p-4 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 transition-all"
                  onClick={() => onSelect(workflow)}
                >
                  <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-foreground truncate">{workflow.name}</h3>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateWorkflowMutation.mutate({
                            id: workflow.id,
                            name: `Copy of ${workflow.name}`
                          })
                        }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setWorkflowToDelete(workflow)
                        }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {workflow.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{workflow.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {workflow.tags?.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-white/10 text-muted-foreground rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
            <div className="text-xs text-muted-foreground">
              Updated:{' '}
              {workflow.updated_at
                ? new Date(`${workflow.updated_at}Z`).toLocaleString()
                : 'unknown'}
            </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Workflow Delete Confirmation Dialog (browser) */}
      {workflowToDelete && (
        <>
          <div
            className="fixed inset-0 z-[60] backdrop-blur-md bg-black/60"
            onClick={() => setWorkflowToDelete(null)}
          />
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Delete Workflow?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete &quot;{workflowToDelete.name}&quot;? This action
                cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setWorkflowToDelete(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteWorkflowMutation.mutate({ id: workflowToDelete.id })
                    setWorkflowToDelete(null)
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function SimpleWorkflowBuilder() {
  const { isDark } = useTheme()
  
  // Current workflow metadata
  const [workflowMetadata, setWorkflowMetadata] = useState<WorkflowMetadata>({
    name: 'Untitled Workflow',
    description: '',
    tags: [],
    isTemplate: false
  })

  // Workflow state
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'start',
      type: 'start',
      title: 'Start',
      position: { x: 100, y: 100 }
    },
    {
      id: 'end',
      type: 'end',
      title: 'End',
      position: { x: 400, y: 100 }
    }
  ])

  // Auto-save and UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [showWorkflowBrowser, setShowWorkflowBrowser] = useState(false)
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false)
  const [pendingImportCustomNode, setPendingImportCustomNode] = useState<any | null>(null)
  const [pendingImportCustomNodeName, setPendingImportCustomNodeName] = useState<string | null>(null)
  const [showImportOverwriteDialog, setShowImportOverwriteDialog] = useState(false)
  const [showUnsavedConfirmDialog, setShowUnsavedConfirmDialog] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<any | null>(null)
  const [showDbMaintenance, setShowDbMaintenance] = useState(false)
  const [activeNodeType, setActiveNodeType] = useState<NodeType | null>(null)

  // Generate connections based on node order
  // Only create valid connections: skip if source is "end" or target is "start"
  const generateConnections = (nodeList: WorkflowNode[]): Connection[] => {
    const connections: Connection[] = []
    for (let i = 0; i < nodeList.length - 1; i++) {
      const sourceNode = nodeList[i]
      const targetNode = nodeList[i + 1]
      
      // Skip invalid connections:
      // - Can't connect FROM an "end" node (no output handle)
      // - Can't connect TO a "start" node (no input handle)
      if (sourceNode.type === 'end' || targetNode.type === 'start') {
        continue
      }
      
      connections.push({
        from: sourceNode.id,
        to: targetNode.id
      })
    }
    return connections
  }

  const [connections, setConnections] = useState<Connection[]>(generateConnections(nodes))

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([])
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [showMarkdownViewer, setShowMarkdownViewer] = useState(false)
  const [markdownContent, setMarkdownContent] = useState('')
  const [markdownTitle, setMarkdownTitle] = useState('')
  const [showHtmlViewer, setShowHtmlViewer] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')
  const [htmlTitle, setHtmlTitle] = useState('')
  const [showJsonViewer, setShowJsonViewer] = useState(false)
  const [jsonContent, setJsonContent] = useState('')
  const [jsonTitle, setJsonTitle] = useState('')
  const [executionResults, setExecutionResults] = useState<Map<string, any>>(new Map())
  const canvasRef = useRef<WorkflowCanvasRef>(null)

  // tRPC mutations
  const executeWorkflowMutation = trpc.executeWorkflow.useMutation()
  const saveCustomNodeMutation = trpc.saveCustomNode.useMutation()
  const { data: customNodesRaw = [], refetch: refetchCustomNodes } = trpc.getCustomNodes.useQuery()
  const exportCustomNodeMutation = trpc.exportCustomNode.useMutation()
  const importCustomNodeMutation = trpc.importCustomNode.useMutation()
  const getWorkflowByNameQuery = trpc.getWorkflowByName.useQuery(
    { name: workflowMetadata.name },
    { enabled: false }
  )
  const saveWorkflowMutation = trpc.saveWorkflow.useMutation({
    onMutate: () => setIsAutoSaving(true),
    onSuccess: (data, variables) => {
      // Double-check: never update metadata if name is "Untitled"
      const isUntitled = 
        variables.name.toLowerCase() === 'untitled' || 
        variables.name.toLowerCase() === 'untitled workflow'
      
      if (!isUntitled) {
        setWorkflowMetadata(prev => ({
          ...prev,
          id: data.id,
          name: variables.name, // Update with the actual saved name
          lastSaved: new Date()
        }))
        setHasUnsavedChanges(false)
      }
    },
    onError: (error) => {
      // If error is about Untitled name, log it (user will see error in dialog)
      if (error.message.includes('Untitled')) {
        console.error('Cannot save Untitled workflow:', error.message)
      }
    },
    onSettled: () => setIsAutoSaving(false)
  })

  // Auto-save functionality
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  // Save/Load functions
  const createWorkflowData = useCallback(() => ({
    nodes: nodes.reduce((acc, node) => {
      acc[node.id] = {
        type: node.type,
        title: node.title,
        description: node.description,
        code: node.code,
        config: node.config,
        position: node.position,
        customNodeId: node.customNodeId,
        customNodeName: node.customNodeName,
        skipDuringExecution: node.skipDuringExecution || false,
      }
      return acc
    }, {} as any),
    connections: connections.reduce((acc, conn) => {
      acc[`${conn.from}_${conn.to}`] = {
        source: conn.from,
        target: conn.to,
        sourceOutput: 'output',
        targetInput: 'input'
      }
      return acc
    }, {} as any),
    metadata: {
      nodeCount: nodes.length,
      lastModified: new Date().toISOString()
    }
  }), [nodes, connections])

  const handleSave = useCallback(async () => {
    try {
      // NEVER save workflows with "Untitled" names - user must name it first via Save As
      const isUntitled =
        workflowMetadata.name.toLowerCase() === 'untitled workflow' ||
        workflowMetadata.name.toLowerCase() === 'untitled'

      if (isUntitled) {
        // Skip saving entirely - backend will also reject, but prevent the call
        return
      }

      // Only save if workflow has an ID (already named) or if explicitly saving
      if (!workflowMetadata.id) {
        // No ID means it's a new workflow - user must use Save As to name it
        return
      }

      await saveWorkflowMutation.mutateAsync({
        id: workflowMetadata.id,
        name: workflowMetadata.name,
        description: workflowMetadata.description,
        tags: workflowMetadata.tags,
        data: createWorkflowData(),
        isTemplate: workflowMetadata.isTemplate
      })
    } catch (error) {
      console.error('Failed to save workflow:', error)
      // Surface error; SaveAsDialog / caller is responsible for UI feedback.
      throw error
    }
  }, [workflowMetadata, saveWorkflowMutation, createWorkflowData])

  const handleSaveAs = async (name: string, shouldUpdateCurrent: boolean) => {
    try {
      // Validate name - prevent "Untitled" names
      const trimmedName = name.trim()
      const isUntitled = 
        trimmedName.toLowerCase() === 'untitled' || 
        trimmedName.toLowerCase() === 'untitled workflow'
      
      if (isUntitled || !trimmedName) {
        throw new Error('Cannot save workflow with the default Untitled name. Please choose a name.')
      }

      // Determine if we should update the current workflow or create a new one:
      // - If same name (shouldUpdateCurrent), always update current workflow
      // - If different name but current workflow has ID, update current workflow with new name
      // - If different name and no current ID, create new workflow
      const workflowId = (shouldUpdateCurrent || workflowMetadata.id) ? workflowMetadata.id : undefined
      
      const result = await saveWorkflowMutation.mutateAsync({
        id: workflowId,
        name: trimmedName,
        description: workflowMetadata.description,
        tags: workflowMetadata.tags,
        data: createWorkflowData(),
        isTemplate: workflowMetadata.isTemplate
      })
      
      setWorkflowMetadata(prev => ({
        ...prev,
        name: trimmedName,
        id: result.id,
        lastSaved: new Date()
      }))
      setHasUnsavedChanges(false)
      setShowSaveAsDialog(false)
    } catch (error) {
      console.error('Failed to save workflow:', error)
      throw error // Re-throw so dialog can handle it
    }
  }

  const handleLoadWorkflow = async (workflow: any) => {
    try {
      const workflowData = typeof workflow.data === 'string'
        ? JSON.parse(workflow.data)
        : workflow.data

      // Load nodes
      const loadedNodes: WorkflowNode[] = Object.entries(workflowData.nodes || {}).map(([id, nodeData]: [string, any]) => {
        const type = nodeData.type as WorkflowNode['type']
        const rawConfig = nodeData.config
        const config =
          type === 'llm'
            ? normalizeLlmConfig(rawConfig as LlmConfig | undefined)
            : rawConfig

        return {
          id,
          type,
          title: nodeData.title,
          description: nodeData.description,
          code: nodeData.code,
          config,
          position: nodeData.position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
          customNodeId: nodeData.customNodeId,
          customNodeName: nodeData.customNodeName,
          skipDuringExecution: nodeData.skipDuringExecution || false,
        }
      })

      // Load connections
      const loadedConnections: Connection[] = Object.values(workflowData.connections || {}).map((conn: any) => ({
        from: conn.source,
        to: conn.target
      }))

      setNodes(loadedNodes)
      setConnections(loadedConnections)
      
      // If loaded workflow has "Untitled" name, force user to rename it
      const loadedName = workflow.name
      const isUntitled = 
        loadedName.toLowerCase() === 'untitled' || 
        loadedName.toLowerCase() === 'untitled workflow'
      
      setWorkflowMetadata({
        id: workflow.id,
        name: isUntitled ? 'Untitled Workflow' : workflow.name, // Keep UI name but mark for rename
        description: workflow.description || '',
        tags: workflow.tags || [],
        isTemplate: workflow.is_template || false,
        lastSaved: new Date(workflow.updated_at)
      })
      setHasUnsavedChanges(false)
      setShowWorkflowBrowser(false)
      
      // If loaded workflow is "Untitled", prompt user to rename it
      if (isUntitled) {
        // Open Save As dialog to force rename
        setTimeout(() => {
          setShowSaveAsDialog(true)
        }, 100)
      }
    } catch (error) {
      console.error('Failed to load workflow:', error)
      // TODO: show a dedicated app dialog for workflow load failures.
    }
  }

  const handleNewWorkflow = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirmDialog(true)
      return
    }

    setNodes([
      {
        id: 'start',
        type: 'start',
        title: 'Start',
        position: { x: 100, y: 100 }
      },
      {
        id: 'end',
        type: 'end',
        title: 'End',
        position: { x: 400, y: 100 }
      }
    ])
    setConnections([{ from: 'start', to: 'end' }])
    setWorkflowMetadata({
      name: 'Untitled Workflow',
      description: '',
      tags: [],
      isTemplate: false
    })
    setHasUnsavedChanges(false)
    setSelectedNode(null)
  }

  const handleExport = () => {
    const exportData = {
      format: 'pedantic-workflow-v1',
      metadata: {
        name: workflowMetadata.name,
        description: workflowMetadata.description,
        tags: workflowMetadata.tags,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      workflow: createWorkflowData()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowMetadata.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const importData = JSON.parse(text)

        const result = await importWorkflowMutation.mutateAsync({
          data: importData,
          overwriteMetadata: true
        })

        const response = await fetch(`/api/trpc/getWorkflow?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { id: result.id } }))}`)
        const importedData = await response.json()
        
        if (importedData?.[0]?.result?.data) {
          await handleLoadWorkflow(importedData[0].result.data)
          // TODO: show a non-blocking toast/snackbar for successful import.
        }
      } catch (error) {
        console.error('Failed to import workflow:', error)
        // TODO: show an app-styled error dialog/toast for import failures.
      }
    }
    input.click()
  }

  const importWorkflowMutation = trpc.importWorkflow.useMutation()

  // Update nodes and mark as changed
  const updateNodes = useCallback((newNodes: WorkflowNode[]) => {
    setNodes(newNodes)
    setConnections(generateConnections(newNodes))
    markAsChanged()
  }, [markAsChanged])

  const executeWorkflow = async () => {
    setIsExecuting(true)
    setTimelineEntries([])

    // Reset node execution states
    setNodes(prev => prev.map(node => ({
      ...node,
      isExecuting: false,
      executionStatus: undefined
    })))

    try {
      const workflowData = {
        nodes: nodes.reduce((acc, node) => {
          acc[node.id] = {
            type: node.type,
            title: node.title,
            code: node.code,
            config: node.config
          }
          return acc
        }, {} as any),
        connections: connections.reduce((acc, conn) => {
          acc[`${conn.from}_${conn.to}`] = {
            source: conn.from,
            target: conn.to,
            sourceOutput: 'output',
            targetInput: 'input'
          }
          return acc
        }, {} as any)
      }

      // Clear previous execution timeline
      const workflowStartTime = Date.now()
      setTimelineEntries([])

      const result = await executeWorkflowMutation.mutateAsync({
        workflow: workflowData
      })

      // Store execution results for later access (e.g., markdown viewer)
      const resultsMap = new Map<string, any>()
      if (result.nodes && Array.isArray(result.nodes)) {
        result.nodes.forEach((nodeResult: any) => {
          resultsMap.set(nodeResult.id, nodeResult)
        })
      }
      setExecutionResults(resultsMap)

      // Process results sequentially to show real-time status
      let allSuccess = true
      let cumulativeExecutionTime = 0 // Track cumulative execution time in seconds

      for (let index = 0; index < result.nodes.length; index++) {
        const nodeResult = result.nodes[index]
        const status: 'success' | 'error' | 'done' = nodeResult.error ? 'error' : 'done'
        if (nodeResult.error) allSuccess = false

        const node = nodes.find(n => n.id === nodeResult.id)
        const nodeTitle = node?.title || nodeResult.id
        const nodeType = node?.type || ''
        const isForEachNode = node?.type === 'foreach'
        
        // Skip Start and End nodes - they're control nodes, not executable
        if (nodeType === 'start' || nodeType === 'end') {
          // Still update node outputs for data flow, but don't show in timeline
          continue
        }

        // Mark node as running
        setNodes(prev => prev.map(n => 
          n.id === nodeResult.id
            ? { ...n, isExecuting: true, executionStatus: 'running' }
            : { ...n, isExecuting: false }
        ))

        // Create timeline entry showing this node as running
        const runningTimestamp = new Date(workflowStartTime + (cumulativeExecutionTime * 1000))
        const runningEntry: TimelineEntry = {
          id: `running-${nodeResult.id}-${Date.now()}`,
          nodeId: nodeResult.id,
          nodeTitle: nodeTitle,
          status: 'running',
          timestamp: runningTimestamp,
        }
        setTimelineEntries(prev => {
          // Remove any existing entry for this node and add running entry
          const withoutThis = prev.filter(e => e.nodeId !== nodeResult.id || e.isForEachResult)
          return [...withoutThis, runningEntry]
        })

        // Delay to show running state - longer delay so user can see progression
        await new Promise(resolve => setTimeout(resolve, 300))

        // Check if this is a for-each node with results
        if (isForEachNode && nodeResult.output && nodeResult.output.results && Array.isArray(nodeResult.output.results)) {
          // Update main for-each entry from running to done
          const finalStatus: 'success' | 'error' | 'running' | 'waiting' | 'done' = status === 'error' ? 'error' : 'done'
          const forEachEndTimestamp = new Date(workflowStartTime + (cumulativeExecutionTime + (nodeResult.execution_time || 0)) * 1000)
          setTimelineEntries(prev => prev.map(entry => 
            entry.nodeId === nodeResult.id && !entry.isForEachResult
              ? {
                  ...entry,
                  status: finalStatus,
                  nodeTitle: `${nodeTitle} (${nodeResult.output.total} iterations)`,
                  output: nodeResult.output,
                  error: nodeResult.error,
                  stdout: nodeResult.stdout,
                  stderr: nodeResult.stderr,
                  executionTime: nodeResult.execution_time,
                  timestamp: forEachEndTimestamp,
                }
              : entry
          ))

          // Process iterations sequentially in real-time
          // Calculate when for-each started (after previous nodes)
          const forEachStartTime = workflowStartTime + (cumulativeExecutionTime * 1000)
          let iterationCumulativeTime = 0 // Time within the for-each loop

          for (let iterIndex = 0; iterIndex < nodeResult.output.results.length; iterIndex++) {
            const iterationResult = nodeResult.output.results[iterIndex]
            const iterStatus: 'success' | 'error' = iterationResult.status === 'success' ? 'success' : 'error'
            if (iterStatus === 'error') allSuccess = false

            // Calculate timestamp based on execution order within the for-each
            const iterationTimestamp = new Date(forEachStartTime + iterationCumulativeTime)

            // Add entry for the iteration itself
            const iterationEntry: TimelineEntry = {
              id: `entry-${nodeResult.id}-iter-${iterIndex}-${Date.now()}`,
              nodeId: nodeResult.id,
              nodeTitle: `${nodeTitle} → Iteration ${iterIndex + 1}`,
              status: iterStatus,
              output: iterationResult.output,
              error: iterationResult.error || undefined,
              stdout: undefined,
              stderr: undefined,
              executionTime: undefined,
              timestamp: iterationTimestamp,
              isForEachResult: true,
              forEachIteration: iterIndex,
              forEachItem: iterationResult.item,
            }

            // Add iteration entry immediately
            setTimelineEntries(prev => {
              const withoutIter = prev.filter(e => 
                !(e.isForEachResult && e.forEachIteration === iterIndex && e.nodeId === nodeResult.id && e.nodeTitle.includes('→ Iteration'))
              )
              return [...withoutIter, iterationEntry]
            })

            // Process nodes within this iteration sequentially
            if (iterationResult.node_executions && Array.isArray(iterationResult.node_executions)) {
              for (let nodeIndex = 0; nodeIndex < iterationResult.node_executions.length; nodeIndex++) {
                const nodeExec = iterationResult.node_executions[nodeIndex]
                const nodeExecStatus: 'success' | 'error' = nodeExec.status === 'success' ? 'success' : 'error'
                if (nodeExecStatus === 'error') allSuccess = false

                // Calculate timestamp for this node within the iteration
                const nodeExecTime = nodeExec.execution_time || 0
                const nodeTimestamp = new Date(forEachStartTime + iterationCumulativeTime)

                // Show node as running first
                const runningNodeEntry: TimelineEntry = {
                  id: `entry-${nodeResult.id}-iter-${iterIndex}-node-${nodeExec.node_id}-running-${Date.now()}`,
                  nodeId: nodeExec.node_id,
                  nodeTitle: `${nodeExec.node_title || nodeExec.node_id} [Iteration ${iterIndex + 1}]`,
                  status: 'running',
                  output: undefined,
                  error: undefined,
                  stdout: undefined,
                  stderr: undefined,
                  executionTime: undefined,
                  timestamp: nodeTimestamp,
                  isForEachResult: true,
                  forEachIteration: iterIndex,
                  forEachItem: iterationResult.item,
                }

                setTimelineEntries(prev => {
                  const withoutThisNode = prev.filter(e => 
                    !(e.isForEachResult && e.forEachIteration === iterIndex && e.nodeId === nodeExec.node_id)
                  )
                  return [...withoutThisNode, runningNodeEntry]
                })

                // Wait a bit to show running state
                await new Promise(resolve => setTimeout(resolve, 100))

                // Update to done/error with actual results
                const finalNodeEntry: TimelineEntry = {
                  id: `entry-${nodeResult.id}-iter-${iterIndex}-node-${nodeExec.node_id}-${Date.now()}`,
                  nodeId: nodeExec.node_id,
                  nodeTitle: `${nodeExec.node_title || nodeExec.node_id} [Iteration ${iterIndex + 1}]`,
                  status: nodeExecStatus,
                  output: nodeExec.output,
                  error: nodeExec.error || undefined,
                  stdout: nodeExec.stdout || undefined,
                  stderr: nodeExec.stderr || undefined,
                  executionTime: nodeExecTime,
                  timestamp: nodeTimestamp,
                  isForEachResult: true,
                  forEachIteration: iterIndex,
                  forEachItem: iterationResult.item,
                }

                setTimelineEntries(prev => {
                  const withoutThisNode = prev.filter(e => 
                    !(e.isForEachResult && e.forEachIteration === iterIndex && e.nodeId === nodeExec.node_id)
                  )
                  return [...withoutThisNode, finalNodeEntry]
                })

                // Add this node's execution time to iteration cumulative (in milliseconds)
                iterationCumulativeTime += nodeExecTime * 1000
              }
            }

            // Small delay between iterations to show progression (but use actual execution time for timestamp)
            await new Promise(resolve => setTimeout(resolve, 200))
          }

          // Add the for-each total execution time to cumulative
          cumulativeExecutionTime += nodeResult.execution_time || 0

          // Find and mark downstream nodes as done (they executed inside the foreach)
          const findDownstreamNodes = (foreachNodeId: string): string[] => {
            const downstream: string[] = []
            const visited = new Set<string>()
            const queue = [foreachNodeId]
            
            while (queue.length > 0) {
              const currentId = queue.shift()!
              if (visited.has(currentId)) continue
              visited.add(currentId)
              
              // Find all nodes connected from this node
              connections.forEach(conn => {
                if (conn.from === currentId) {
                  const targetId = conn.to
                  if (targetId && !visited.has(targetId)) {
                    const targetNode = nodes.find(n => n.id === targetId)
                    const targetType = targetNode?.type || ''
                    
                    // Stop at 'end' or another 'foreach' node
                    if (targetType === 'end' || targetType === 'foreach') {
                      return
                    }
                    
                    downstream.push(targetId)
                    queue.push(targetId)
                  }
                }
              })
            }
            
            return downstream
          }

          const downstreamNodeIds = findDownstreamNodes(nodeResult.id)
          
          // Mark downstream nodes as done in canvas
          setNodes(prev => prev.map(n => 
            downstreamNodeIds.includes(n.id)
              ? { ...n, isExecuting: false, executionStatus: 'success' }
              : n
          ))

          // Create timeline entries for downstream nodes showing "Done" (they executed inside foreach)
          const forEachEndTime = forEachStartTime + (nodeResult.execution_time || 0) * 1000
          const downstreamEntries: TimelineEntry[] = downstreamNodeIds.map(nodeId => {
            const downstreamNode = nodes.find(n => n.id === nodeId)
            return {
              id: `downstream-${nodeId}-${Date.now()}`,
              nodeId: nodeId,
              nodeTitle: downstreamNode?.title || nodeId,
              status: 'done' as const,
              timestamp: new Date(forEachEndTime),
            }
          })
          setTimelineEntries(prev => {
            // Remove any existing entries for downstream nodes and add done entries
            const withoutDownstream = prev.filter(e => !downstreamNodeIds.includes(e.nodeId) || e.isForEachResult)
            return [...withoutDownstream, ...downstreamEntries]
          })
        } else {
          // Regular node entry - update from running to done
          const finalStatus: 'success' | 'error' | 'running' | 'waiting' | 'done' = status === 'error' ? 'error' : 'done'
          const nodeEndTimestamp = new Date(workflowStartTime + (cumulativeExecutionTime + (nodeResult.execution_time || 0)) * 1000)
          
          setTimelineEntries(prev => prev.map(entry => 
            entry.nodeId === nodeResult.id && !entry.isForEachResult
              ? {
                  ...entry,
                  status: finalStatus,
                  output: nodeResult.output,
                  error: nodeResult.error,
                  stdout: nodeResult.stdout,
                  stderr: nodeResult.stderr,
                  executionTime: nodeResult.execution_time,
                  timestamp: nodeEndTimestamp,
                }
              : entry
          ))

          // Add this node's execution time to cumulative
          cumulativeExecutionTime += nodeResult.execution_time || 0
        }

        // Update node execution status to done
        setNodes(prev => prev.map(n => 
          n.id === nodeResult.id
            ? { ...n, isExecuting: false, executionStatus: status === 'error' ? 'error' : 'success' }
            : n
        ))

        // Additional delay after completion to make it visible
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Add summary entry at the end (only if there are results)
      if (result.nodes && result.nodes.length > 0) {
        const totalTime = result.nodes.reduce((sum: number, node: any) => sum + (node.execution_time || 0), 0)
        const summaryEntry: TimelineEntry = {
          id: `summary-${Date.now()}`,
          nodeId: 'summary',
          nodeTitle: `Execution Complete - Total Time: ${totalTime.toFixed(2)}s`,
          status: allSuccess ? 'done' : 'error',
          timestamp: new Date(workflowStartTime + (totalTime * 1000)),
          executionTime: totalTime,
        }
        
        setTimelineEntries(prev => [...prev, summaryEntry])
      }

      // Confetti on success
      if (allSuccess) {
        // Dynamically import confetti to avoid SSR issues
        import('canvas-confetti').then((confettiModule) => {
          const confetti = confettiModule.default
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8, x: 0.9 },
            colors: ['#8b5cf6', '#14b8a6', '#a78bfa'],
          })
        }).catch(() => {
          // Silently fail if confetti can't be loaded
        })
      }
    } catch (error) {
      setTimelineEntries([{
        id: `error-${Date.now()}`,
        nodeId: 'workflow',
        nodeTitle: 'Workflow Execution',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      }])
    } finally {
      setIsExecuting(false)
    }
  }

  const addNode = (type: NodeType) => {
    // Get viewport center to position new node
    const viewportCenter = canvasRef.current?.getViewportCenter()
    const defaultPosition = viewportCenter || { x: 400, y: 300 }
    
    const newNode: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      title: getNodeTitle(type),
      position: {
        x: defaultPosition.x,
        y: defaultPosition.y,
      }
    }

    if (type === 'python') {
      newNode.code = 'def run(input):\n    return input'
    } else if (type === 'typescript') {
      newNode.code = 'async function run(input: any): Promise<any> {\n    return input;\n}'
    } else if (type === 'http') {
      newNode.config = {
        method: 'GET',
        url: 'https://api.example.com/data',
        headers: {},
        params: {},
        body: {},
        timeout: 30
      }
    } else if (type === 'file') {
      newNode.config = {
        operation: 'read',
        path: 'example.txt',
        content: '',
        encoding: 'utf-8'
      }
    } else if (type === 'condition') {
      newNode.config = {
        type: 'if',
        conditions: [
          {
            condition: {
              field: 'status',
              operator: '==',
              value: 'success'
            },
            output: { result: 'success' }
          }
        ],
        default: { result: 'default' }
      }
    } else if (type === 'database') {
      newNode.config = {
        operation: 'select',
        database: 'workflow.db',
        query: 'SELECT * FROM table WHERE id = ?',
        params: []
      }
    } else if (type === 'llm') {
      newNode.config = createDefaultLlmConfig()
    } else if (type === 'foreach') {
      newNode.config = {
        items: [],
        execution_mode: 'serial',
        max_concurrency: 5,
        items_key: 'items'
      }
    } else if (type === 'markdown') {
      newNode.config = {
        content_key: 'content'
      }
    } else if (type === 'html') {
      newNode.config = {
        content_key: 'content'
      }
    } else if (type === 'json') {
      newNode.config = {
        content_key: 'content'
      }
    } else if (type === 'embedding') {
      newNode.config = {
        model: 'all-MiniLM-L6-v2',
        input_field: 'content',
        output_field: 'embedding',
        format: 'blob'
      }
    }

    const newNodes = [...nodes, newNode]
    updateNodes(newNodes)
    setActiveNodeType(null)
  }

  const getNodeTitle = (type: string): string => {
    switch (type) {
      case 'python': return 'Python Code'
      case 'typescript': return 'TypeScript Code'
      case 'http': return 'HTTP API Call'
      case 'file': return 'File Operation'
      case 'condition': return 'Conditional Logic'
      case 'database': return 'Database Query'
      case 'llm': return 'LLM AI Assistant'
      case 'foreach': return 'For Each Loop'
      case 'endloop': return 'End Loop'
      case 'embedding': return 'Embedding'
      case 'markdown': return 'Markdown Viewer'
      case 'html': return 'HTML Viewer'
      case 'json': return 'JSON Viewer'
      default: return 'Unknown Node'
    }
  }

  const updateNodeCode = (nodeId: string, code: string) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, code } : node
    )
    setNodes(updatedNodes)
    markAsChanged()
  }

  const updateNodeConfig = (nodeId: string, config: any) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, config } : node
    )
    setNodes(updatedNodes)
    markAsChanged()
  }

  const updateNodeSkipDuringExecution = (nodeId: string, skip: boolean) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, skipDuringExecution: skip } : node
    )
    setNodes(updatedNodes)
    markAsChanged()
  }

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedNode(nodeId)
      // If it's a markdown node, show markdown viewer instead of editor
      if (node.type === 'markdown') {
        // Try to find markdown content from node's execution output
        let nodeResult = executionResults.get(nodeId)
        
        // Debug logging
        console.log('Markdown viewer clicked:', {
          nodeId,
          nodeResult,
          executionResultsSize: executionResults.size,
          executionResultsKeys: Array.from(executionResults.keys()),
          timelineEntriesCount: timelineEntries.length
        })
        
        // If not found in executionResults, try to find it in timeline entries (for nodes outside for-each)
        if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
          // First try non-forEach timeline entries
          let timelineEntry = timelineEntries
            .filter(e => e.nodeId === nodeId && !e.isForEachResult && e.output)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
          
          // If still not found, check all entries (including forEach results) but prefer the latest
          if (!timelineEntry || !timelineEntry.output || !timelineEntry.output.content) {
            timelineEntry = timelineEntries
              .filter(e => e.nodeId === nodeId && e.output && e.output.content)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
          }
          
          console.log('Checking timeline entry:', timelineEntry)
          if (timelineEntry && timelineEntry.output && timelineEntry.output.content) {
            nodeResult = {
              output: timelineEntry.output
            }
          }
        }
        
        // If still not found, check if we can get it from the last iteration of a for-each loop
        if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
          // Look for the markdown viewer in the last for-each iteration
          const forEachResults = timelineEntries
            .filter(e => e.isForEachResult && e.nodeId === nodeId && e.output && e.output.content)
            .sort((a, b) => (b.forEachIteration ?? 0) - (a.forEachIteration ?? 0))
          
          if (forEachResults.length > 0) {
            const lastIteration = forEachResults[0]
            console.log('Found in for-each iteration:', lastIteration)
            if (lastIteration.output && lastIteration.output.content) {
              nodeResult = {
                output: lastIteration.output
              }
            }
          }
          
          // Also check executionResults for for-each nodes and extract from their results
          if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
            Array.from(executionResults.entries()).forEach(([resultNodeId, result]) => {
              // Check if this is a for-each node result
              if (result.output && result.output.results && Array.isArray(result.output.results)) {
                // Find the last successful iteration that has node_executions
                for (let i = result.output.results.length - 1; i >= 0; i--) {
                  const iteration = result.output.results[i]
                  if (iteration.node_executions && Array.isArray(iteration.node_executions)) {
                    // Find the markdown viewer in this iteration
                    const markdownExec = iteration.node_executions.find(
                      (exec: any) => exec.node_id === nodeId && exec.output && exec.output.content
                    )
                    if (markdownExec) {
                      console.log('Found markdown in for-each iteration result:', markdownExec)
                      nodeResult = {
                        output: markdownExec.output
                      }
                      return
                    }
                  }
                }
              }
            })
          }
        }
        
        if (nodeResult && nodeResult.output && nodeResult.output.content) {
          // Display the detected markdown content
          console.log('Found markdown content:', nodeResult.output.content.substring(0, 100))
          setMarkdownContent(nodeResult.output.content)
          const detectedKey = nodeResult.output.detected_key || 'auto-detected'
          setMarkdownTitle(`${node.title} (from ${detectedKey})`)
        } else {
          // Show helpful message if no execution results yet
          console.log('No markdown content found, showing placeholder')
          setMarkdownContent('# Markdown Viewer\n\nMarkdown content will appear here after workflow execution.\n\nThe markdown node automatically detects markdown content in any variable passed from upstream nodes.\n\n**Supported markdown patterns:**\n- Headers (#, ##, ###)\n- Bold (**text**) and italic (*text*)\n- Links [text](url)\n- Code blocks (```)\n- Lists (-, *, numbered)\n- Blockquotes (>)\n- Tables\n\n**How it works:**\n1. The node scans all variables from upstream\n2. Detects markdown patterns automatically\n3. Displays the first variable containing markdown')
          setMarkdownTitle(node.title)
        }
        setShowMarkdownViewer(true)
      } else if (node.type === 'html') {
        // Try to find HTML content from node's execution output
        let nodeResult = executionResults.get(nodeId)
        
        // If not found in executionResults, try to find it in timeline entries
        if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
          // First try non-forEach timeline entries
          let timelineEntry = timelineEntries
            .filter(e => e.nodeId === nodeId && !e.isForEachResult && e.output)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
          
          // If still not found, check all entries (including forEach results) but prefer the latest
          if (!timelineEntry || !timelineEntry.output || !timelineEntry.output.content) {
            timelineEntry = timelineEntries
              .filter(e => e.nodeId === nodeId && e.output && e.output.content)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
          }
          
          console.log('Checking timeline entry for HTML:', timelineEntry)
          if (timelineEntry && timelineEntry.output && timelineEntry.output.content) {
            nodeResult = {
              output: timelineEntry.output
            }
          }
        }
        
        // If still not found, check if we can get it from the last iteration of a for-each loop
        if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
          // Look for the HTML viewer in the last for-each iteration
          const forEachResults = timelineEntries
            .filter(e => e.isForEachResult && e.nodeId === nodeId && e.output && e.output.content)
            .sort((a, b) => (b.forEachIteration ?? 0) - (a.forEachIteration ?? 0))
          
          if (forEachResults.length > 0) {
            const lastIteration = forEachResults[0]
            console.log('Found HTML in for-each iteration:', lastIteration)
            if (lastIteration.output && lastIteration.output.content) {
              nodeResult = {
                output: lastIteration.output
              }
            }
          }
          
          // Also check executionResults for for-each nodes and extract from their results
          if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
            Array.from(executionResults.entries()).forEach(([resultNodeId, result]) => {
              // Check if this is a for-each node result
              if (result.output && result.output.results && Array.isArray(result.output.results)) {
                // Find the last successful iteration that has node_executions
                for (let i = result.output.results.length - 1; i >= 0; i--) {
                  const iteration = result.output.results[i]
                  if (iteration.node_executions && Array.isArray(iteration.node_executions)) {
                    // Find the HTML viewer in this iteration
                    const htmlExec = iteration.node_executions.find(
                      (exec: any) => exec.node_id === nodeId && exec.output && exec.output.content
                    )
                    if (htmlExec) {
                      console.log('Found HTML in for-each iteration result:', htmlExec)
                      nodeResult = {
                        output: htmlExec.output
                      }
                      return
                    }
                  }
                }
              }
            })
          }
        }
        
        if (nodeResult && nodeResult.output && nodeResult.output.content) {
          // Display the detected HTML content
          console.log('Found HTML content:', nodeResult.output.content.substring(0, 100))
          setHtmlContent(nodeResult.output.content)
          const detectedKey = nodeResult.output.detected_key || 'auto-detected'
          setHtmlTitle(`${node.title} (from ${detectedKey})`)
        } else {
          // Show helpful message if no execution results yet
          console.log('No HTML content found, showing placeholder')
          setHtmlContent('<!DOCTYPE html><html><head><title>HTML Viewer</title></head><body><h1>HTML Viewer</h1><p>HTML content will appear here after workflow execution.</p><p>The HTML node automatically detects HTML content in any variable passed from upstream nodes.</p><h2>How it works:</h2><ol><li>The node scans all variables from upstream</li><li>Detects HTML patterns automatically</li><li>Displays the first variable containing HTML</li></ol></body></html>')
          setHtmlTitle(node.title)
        }
        setShowHtmlViewer(true)
      } else if (node.type === 'json') {
        // Always open editor for JSON nodes
        // The editor will show a toggle button to switch between edit and view modes
        setShowEditorModal(true)
      } else {
        setShowEditorModal(true)
      }
    }
  }

  const readMarkdownFileMutation = trpc.readMarkdownFile.useMutation()

  const handleOpenMarkdownViewer = async (filePathWithAnchor: string) => {
    try {
      // Split file path and anchor
      const [filePath, anchor] = filePathWithAnchor.split('#')
      const result = await readMarkdownFileMutation.mutateAsync({ filePath })
      setMarkdownContent(result.content)
      // Extract filename for title
      const filename = result.path.split('/').pop() || result.path
      setMarkdownTitle(filename.replace('.md', ''))
      setShowMarkdownViewer(true)
      
      // If there's an anchor, scroll to it after a short delay to ensure content is rendered
      if (anchor) {
        setTimeout(() => {
          const element = document.querySelector(`#${anchor}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 200)
      }
    } catch (error) {
      console.error('Failed to read markdown file:', error)
      setMarkdownContent(`# Error\n\nFailed to load markdown file: ${filePathWithAnchor}\n\n${(error as Error).message}`)
      setMarkdownTitle('Error')
      setShowMarkdownViewer(true)
    }
  }

  const handleMarkdownLinkClick = (href: string) => {
    if (typeof window === 'undefined') return
    
    try {
      // Handle relative links (e.g., /docs/WORKFLOW_NODES_GUIDE.md, ./docs/file.md, or docs/file.md)
      // Also handle absolute URLs to localhost
      let normalizedPath: string | null = null
      
      // Check if it's an absolute URL to localhost
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin === window.location.origin) {
          normalizedPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
        }
      } catch {
        // Not a valid URL, treat as relative path
      }
      
      // Handle relative paths
      if (!normalizedPath) {
        if (href.startsWith('/')) {
          normalizedPath = href.slice(1)
        } else if (href.startsWith('./')) {
          normalizedPath = href.replace(/^\.\//, '')
        } else if (href.endsWith('.md') && !href.includes('://')) {
          // Relative path without leading slash (e.g., "docs/file.md")
          normalizedPath = href
        }
      }
      
      if (normalizedPath) {
        handleOpenMarkdownViewer(normalizedPath)
      }
      // External links will open normally (handled by browser)
    } catch (error) {
      console.error('Error handling markdown link click:', error)
    }
  }

  const handleOpenHelp = () => {
    handleOpenMarkdownViewer('README.md')
  }

  const handleNodeSave = async (code?: string, config?: any, skipDuringExecution?: boolean) => {
    if (selectedNode) {
      // Update the node in state first
      const updatedNodes = nodes.map(node => {
        if (node.id === selectedNode) {
          const updated: WorkflowNode = { ...node }
          if (code !== undefined) {
            updated.code = code
          }
          if (config !== undefined) {
            updated.config = config
          }
          if (skipDuringExecution !== undefined) {
            updated.skipDuringExecution = skipDuringExecution
          }
          return updated
        }
        return node
      })
      
      // Update state
      setNodes(updatedNodes)
      markAsChanged()
      
      // Auto-save the workflow if it has an ID (is already saved)
      // Use the updated nodes directly to ensure we save the latest changes
      if (workflowMetadata.id) {
        try {
          // Create workflow data with the updated nodes (not waiting for state update)
          const workflowData = {
            nodes: updatedNodes.reduce((acc, node) => {
              acc[node.id] = {
                type: node.type,
                title: node.title,
                description: node.description,
                code: node.code,
                config: node.config,
                position: node.position,
                customNodeId: node.customNodeId,
                customNodeName: node.customNodeName,
                skipDuringExecution: node.skipDuringExecution || false,
              }
              return acc
            }, {} as any),
            connections: connections.reduce((acc, conn) => {
              acc[`${conn.from}_${conn.to}`] = {
                source: conn.from,
                target: conn.to,
                sourceOutput: 'output',
                targetInput: 'input'
              }
              return acc
            }, {} as any),
            metadata: {
              nodeCount: updatedNodes.length,
              lastModified: new Date().toISOString()
            }
          }
          
          await saveWorkflowMutation.mutateAsync({
            id: workflowMetadata.id,
            name: workflowMetadata.name,
            description: workflowMetadata.description,
            tags: workflowMetadata.tags,
            data: workflowData,
            isTemplate: workflowMetadata.isTemplate
          })
          
          setHasUnsavedChanges(false)
        } catch (error) {
          console.error('Failed to auto-save workflow after node update:', error)
          // Don't throw - the node update was successful, just the auto-save failed
          // User can manually save via Save As if needed
        }
      }
    }
  }

  const handleMakeCustomNode = async (options: { name: string; description: string; code?: string; config?: any }) => {
    if (!selectedNode) return
    const node = nodes.find(n => n.id === selectedNode)
    if (!node) return

    if (node.type === 'start' || node.type === 'end') {
      // These nodes are not eligible to be custom nodes; ignore the request.
      return
    }

    try {
      const data = workflowNodeToCustomData({
        type: node.type,
        title: node.title,
        code: options.code !== undefined ? options.code : node.code,
        config: options.config !== undefined ? options.config : node.config,
      })

      const result = await saveCustomNodeMutation.mutateAsync({
        name: options.name,
        description: options.description,
        type: node.type,
        data,
      })

      // Attach custom node metadata to this node
      setNodes(prev =>
        prev.map(n =>
          n.id === node.id
            ? { ...n, customNodeId: result.id, customNodeName: options.name }
            : n
        )
      )
      refetchCustomNodes()
      markAsChanged()
    } catch (error) {
      console.error('Failed to save custom node:', error)
      throw error
    }
  }

  const handleUpdateCustomFromNode = async (options: { code?: string; config?: any }) => {
    if (!selectedNode) return
    const node = nodes.find(n => n.id === selectedNode)
    if (!node || !node.customNodeId) return

    try {
      const data = workflowNodeToCustomData({
        type: node.type,
        title: node.title,
        code: options.code !== undefined ? options.code : node.code,
        config: options.config !== undefined ? options.config : node.config,
      })

      await saveCustomNodeMutation.mutateAsync({
        id: node.customNodeId,
        name: node.customNodeName || node.title,
        description: undefined,
        type: node.type,
        data,
      })
      refetchCustomNodes()
    } catch (error) {
      console.error('Failed to update custom node:', error)
      throw error
    }
  }

  const handleNodeDelete = () => {
    if (!selectedNode) return

    const nodeToDelete = nodes.find(n => n.id === selectedNode)
    if (!nodeToDelete) return

    // Prevent deleting start or end nodes
    if (nodeToDelete.type === 'start' || nodeToDelete.type === 'end') {
      // Start/End nodes are visually differentiated and not deletable; just ignore.
      return
    }

    // Remove the node
    const updatedNodes = nodes.filter(node => node.id !== selectedNode)
    
    // Remove all connections to/from this node
    const updatedConnections = connections.filter(
      conn => conn.from !== selectedNode && conn.to !== selectedNode
    )

    setNodes(updatedNodes)
    setConnections(updatedConnections)
    setSelectedNode(null)
    setShowEditorModal(false)
    markAsChanged()
  }

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  const customNodes = (customNodesRaw as any[]).map((node) => ({
    id: node.id as number,
    name: node.name as string,
    description: (node.description ?? undefined) as string | undefined,
    type: node.type,
    data: node.config,
  }))

  const handleSelectCustomNode = (templateId: number) => {
    const template = customNodes.find((n) => n.id === templateId)
    if (!template) return

    const viewportCenter = canvasRef.current?.getViewportCenter()
    const position = viewportCenter || { x: 400, y: 300 }

    const newId = `${template.type}_${Date.now()}`
    const newNode: WorkflowNode = {
      id: newId,
      type: template.data.type,
      // Always display the custom node name on the canvas
      title: template.name,
      description: template.description,
      code: template.data.code,
      config: template.data.config,
      position,
      customNodeId: template.id,
      customNodeName: template.name,
    }

    const newNodes = [...nodes, newNode]
    updateNodes(newNodes)
  }

  const handleExportSelectedCustomNode = async (options: { filename: string }) => {
    if (!selectedNode) return
    const node = nodes.find((n) => n.id === selectedNode)
    if (!node || !node.customNodeId) return

    try {
      const result = await exportCustomNodeMutation.mutateAsync({ id: node.customNodeId })
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const safeBase =
        options.filename.trim().replace(/\.json$/i, '') ||
        node.customNodeName?.replace(/[^a-z0-9]/gi, '_') ||
        'custom_node'

      a.download = `${safeBase}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export custom node:', error)
      throw error
    }
  }

  const handleImportCustomNodes = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        try {
          const result = await importCustomNodeMutation.mutateAsync({ data, overwrite: false })
          await refetchCustomNodes()

          // Optionally add the imported node to the canvas
          const newTemplate = customNodes.find((n) => n.id === result.id)
          if (newTemplate) {
            handleSelectCustomNode(newTemplate.id)
          }
        } catch (error: any) {
          const message = error?.message || String(error)
          // Detect name collision and offer overwrite via in-app dialog
          if (message.includes('already exists') && data?.metadata?.name) {
            setPendingImportCustomNode(data)
            setPendingImportCustomNodeName(data.metadata.name as string)
            setShowImportOverwriteDialog(true)
          } else {
            console.error('Failed to import custom node:', error)
          }
        }
      } catch (error) {
        console.error('Failed to read custom node file:', error)
      }
    }
    input.click()
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Modern Toolbar */}
      <ModernToolbar
        activeNodeType={activeNodeType}
        onNodeTypeClick={(type) => {
          if (!isLocked) {
            setActiveNodeType(type)
            addNode(type)
          }
        }}
        isLocked={isLocked}
        customNodes={customNodes}
        onSelectCustomNode={isLocked ? undefined : handleSelectCustomNode}
        onImportCustomNodes={isLocked ? undefined : handleImportCustomNodes}
        onOpenDbMaintenance={() => setShowDbMaintenance(true)}
        onOpenHelp={handleOpenHelp}
        onNewWorkflow={handleNewWorkflow}
        onOpenWorkflow={() => setShowWorkflowBrowser(true)}
        onSave={handleSave}
        onSaveAs={() => setShowSaveAsDialog(true)}
        onExport={handleExport}
        onImport={handleImport}
        onExecute={executeWorkflow}
        isExecuting={isExecuting}
        hasUnsavedChanges={hasUnsavedChanges}
        isAutoSaving={isAutoSaving}
      />

      {/* Workflow Metadata */}
      {(workflowMetadata.description || workflowMetadata.tags.length > 0) && (
        <div className="mx-4 mb-2 glass-card p-3">
        {workflowMetadata.description && (
            <p className="text-sm text-muted-foreground mb-2">{workflowMetadata.description}</p>
        )}
        {workflowMetadata.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {workflowMetadata.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-white/10 text-muted-foreground rounded-full text-xs">
                  {tag}
                </span>
              ))}
          </div>
        )}
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative min-w-0">
          <WorkflowCanvas
            ref={canvasRef}
            nodes={nodes}
            connections={connections}
            onNodeClick={handleNodeClick}
            isExecuting={isExecuting}
            nodesDraggable={!isLocked}
            isLocked={isLocked}
            onToggleLock={() => setIsLocked(prev => !prev)}
            onNodesChange={(updatedNodes) => {
              // Update node positions from react-flow
              setNodes(prev => prev.map(node => {
                const updated = updatedNodes.find(n => n.id === node.id)
                if (updated) {
                  return { ...node, position: updated.position }
                }
                return node
              }))
              markAsChanged()
            }}
            onEdgesChange={(updatedEdges) => {
              // Update connections from react-flow
              const newConnections = updatedEdges.map(edge => ({
                from: edge.source,
                to: edge.target
              }))
              setConnections(newConnections)
              markAsChanged()
            }}
            onConnect={(connection) => {
              // Add new connection
              setConnections(prev => [...prev, {
                from: connection.source || '',
                to: connection.target || ''
              }])
              markAsChanged()
            }}
          />
        </div>

        {/* Execution Timeline */}
        <div className="w-80 border-l border-white/10 flex-shrink-0 h-full flex flex-col overflow-hidden">
          <ExecutionTimeline entries={timelineEntries} />
        </div>
      </div>

      {/* Node Editor Modal */}
      {showEditorModal && selectedNodeData && selectedNodeData.type !== 'llm' && selectedNodeData.type !== 'http' && (
        <NodeEditorModal
          isOpen={showEditorModal}
          onClose={() => {
            setShowEditorModal(false)
            setSelectedNode(null)
          }}
          nodeId={selectedNodeData.id}
          nodeType={selectedNodeData.type}
          nodeTitle={selectedNodeData.title}
          code={selectedNodeData.code}
          config={selectedNodeData.config}
          skipDuringExecution={selectedNodeData.skipDuringExecution}
          onSave={handleNodeSave}
          onDelete={handleNodeDelete}
          isLocked={isLocked}
          isCustom={Boolean(selectedNodeData.customNodeId)}
          customName={selectedNodeData.customNodeName}
          onMakeCustom={isLocked ? undefined : handleMakeCustomNode}
          onUpdateCustomFromNode={isLocked ? undefined : handleUpdateCustomFromNode}
          onExportCustomNode={isLocked ? undefined : handleExportSelectedCustomNode}
          jsonViewerContent={(() => {
            // For JSON nodes, try to find execution content
            if (selectedNodeData.type === 'json') {
              let nodeResult = executionResults.get(selectedNodeData.id)
              
              // If not found in executionResults, try to find it in timeline entries
              if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
                let timelineEntry = timelineEntries
                  .filter(e => e.nodeId === selectedNodeData.id && !e.isForEachResult && e.output)
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
                
                if (!timelineEntry || !timelineEntry.output || !timelineEntry.output.content) {
                  timelineEntry = timelineEntries
                    .filter(e => e.nodeId === selectedNodeData.id && e.output && e.output.content)
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
                }
                
                if (timelineEntry && timelineEntry.output && timelineEntry.output.content) {
                  nodeResult = {
                    output: timelineEntry.output
                  }
                }
              }
              
              // Check for-each results
              if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
                const forEachResults = timelineEntries
                  .filter(e => e.isForEachResult && e.nodeId === selectedNodeData.id && e.output && e.output.content)
                  .sort((a, b) => (b.forEachIteration ?? 0) - (a.forEachIteration ?? 0))
                
                if (forEachResults.length > 0 && forEachResults[0].output && forEachResults[0].output.content) {
                  nodeResult = {
                    output: forEachResults[0].output
                  }
                }
              }
              
              // Check executionResults for for-each nodes
              if (!nodeResult || !nodeResult.output || !nodeResult.output.content) {
                Array.from(executionResults.entries()).forEach(([resultNodeId, result]) => {
                  if (result.output && result.output.results && Array.isArray(result.output.results)) {
                    for (let i = result.output.results.length - 1; i >= 0; i--) {
                      const iteration = result.output.results[i]
                      if (iteration.node_executions && Array.isArray(iteration.node_executions)) {
                        const jsonExec = iteration.node_executions.find(
                          (exec: any) => exec.node_id === selectedNodeData.id && exec.output && exec.output.content
                        )
                        if (jsonExec) {
                          nodeResult = {
                            output: jsonExec.output
                          }
                          return
                        }
                      }
                    }
                  }
                })
              }
              
              return nodeResult?.output?.content || undefined
            }
            return undefined
          })()}
        />
      )}

      {/* LLM Node Dialog */}
      {showEditorModal && selectedNodeData && selectedNodeData.type === 'llm' && (
        <LlmNodeDialog
          isOpen={showEditorModal}
          isLocked={isLocked}
          nodeId={selectedNodeData.id}
          nodeTitle={selectedNodeData.title}
          rawConfig={selectedNodeData.config as LlmConfig | undefined}
          onClose={() => {
            setShowEditorModal(false)
            setSelectedNode(null)
          }}
          onSave={(newConfig) => {
            if (!selectedNode) return
            const updatedNodes = nodes.map((node) =>
              node.id === selectedNode ? { ...node, config: newConfig } : node
            )
            setNodes(updatedNodes)
            markAsChanged()
          }}
        />
      )}

      {/* HTTP Node Dialog */}
      {showEditorModal && selectedNodeData && selectedNodeData.type === 'http' && (
        <HttpNodeDialog
          isOpen={showEditorModal}
          isLocked={isLocked}
          nodeId={selectedNodeData.id}
          nodeTitle={selectedNodeData.title}
          rawConfig={selectedNodeData.config as HttpConfig | undefined}
          onClose={() => {
            setShowEditorModal(false)
            setSelectedNode(null)
          }}
          onSave={(newConfig) => {
            if (!selectedNode) return
            const updatedNodes = nodes.map((node) =>
              node.id === selectedNode ? { ...node, config: newConfig } : node
            )
            setNodes(updatedNodes)
            markAsChanged()
          }}
        />
      )}

      {/* Workflow Browser */}
      <WorkflowBrowser
        isOpen={showWorkflowBrowser}
        onClose={() => setShowWorkflowBrowser(false)}
        onSelect={handleLoadWorkflow}
      />

      {/* Save As Dialog */}
      <SaveAsDialog
        isOpen={showSaveAsDialog}
        currentName={
          workflowMetadata.name === 'Untitled Workflow' || workflowMetadata.name === 'Untitled'
            ? ''
            : workflowMetadata.name
        }
        currentId={workflowMetadata.id}
        onClose={() => setShowSaveAsDialog(false)}
        onSave={handleSaveAs}
      />

      {/* Custom Node Import Overwrite Dialog */}
      {showImportOverwriteDialog && pendingImportCustomNode && pendingImportCustomNodeName && (
        <>
          <div
            className="fixed inset-0 z-[60] backdrop-blur-md bg-black/60"
            onClick={() => setShowImportOverwriteDialog(false)}
          />
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Overwrite Custom Node?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                A custom node named &quot;{pendingImportCustomNodeName}&quot; already exists. Do you
                want to overwrite it with the version from this file?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportOverwriteDialog(false)
                    setPendingImportCustomNode(null)
                    setPendingImportCustomNodeName(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!pendingImportCustomNode) return
                    try {
                      const result = await importCustomNodeMutation.mutateAsync({
                        data: pendingImportCustomNode,
                        overwrite: true,
                      })
                      await refetchCustomNodes()

                      const newTemplate = customNodes.find((n) => n.id === result.id)
                      if (newTemplate) {
                        handleSelectCustomNode(newTemplate.id)
                      }
                    } catch (error) {
                      console.error('Failed to overwrite custom node during import:', error)
                    } finally {
                      setShowImportOverwriteDialog(false)
                      setPendingImportCustomNode(null)
                      setPendingImportCustomNodeName(null)
                    }
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Overwrite
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      {showUnsavedConfirmDialog && (
        <>
          <div
            className="fixed inset-0 z-[60] backdrop-blur-md bg-black/60"
            onClick={() => setShowUnsavedConfirmDialog(false)}
          />
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Discard Unsaved Changes?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                You have unsaved changes in this workflow. Creating a new workflow will discard those changes.
                Do you want to continue?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowUnsavedConfirmDialog(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUnsavedConfirmDialog(false)
                    // Proceed with new workflow
                    setNodes([
                      {
                        id: 'start',
                        type: 'start',
                        title: 'Start',
                        position: { x: 100, y: 100 }
                      },
                      {
                        id: 'end',
                        type: 'end',
                        title: 'End',
                        position: { x: 400, y: 100 }
                      }
                    ])
                    setConnections([{ from: 'start', to: 'end' }])
                    setWorkflowMetadata({
                      name: 'Untitled Workflow',
                      description: '',
                      tags: [],
                      isTemplate: false
                    })
                    setHasUnsavedChanges(false)
                    setSelectedNode(null)
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Discard & New Workflow
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Database Maintenance Modal */}
      <DbMaintenanceModal
        isOpen={showDbMaintenance}
        onClose={() => setShowDbMaintenance(false)}
      />

      {/* Markdown Viewer Modal */}
      <MarkdownViewerModal
        isOpen={showMarkdownViewer}
        onClose={() => setShowMarkdownViewer(false)}
        title={markdownTitle}
        markdown={markdownContent}
        onLinkClick={handleMarkdownLinkClick}
      />
      <HtmlViewerModal
        isOpen={showHtmlViewer}
        onClose={() => setShowHtmlViewer(false)}
        title={htmlTitle}
        html={htmlContent}
        onLinkClick={handleMarkdownLinkClick}
      />
      <JsonViewerModal
        isOpen={showJsonViewer}
        onClose={() => setShowJsonViewer(false)}
        title={jsonTitle}
        json={jsonContent}
      />

      {/* Workflow Delete Confirmation Dialog */}
      {workflowToDelete && (
        <>
          <div
            className="fixed inset-0 z-[60] backdrop-blur-md bg-black/60"
            onClick={() => setWorkflowToDelete(null)}
          />
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Delete Workflow?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete &quot;{workflowToDelete.name}&quot;? This action
                cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setWorkflowToDelete(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (workflowToDelete) {
                      // Deletion is handled inside the WorkflowBrowser dialog; this is just for
                      // confirming unsaved changes in the main builder.
                    }
                    setWorkflowToDelete(null)
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
