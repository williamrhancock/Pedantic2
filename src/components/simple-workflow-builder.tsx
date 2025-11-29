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
import { useTheme } from '@/contexts/ThemeContext'
import type { NodeType } from '@/components/toolbar/ModernToolbar'
import { workflowNodeToCustomData } from '@/lib/custom-nodes'
import { createDefaultLlmConfig, normalizeLlmConfig, type LlmConfig } from '@/lib/llm'

interface WorkflowNode {
  id: string
  type: 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'foreach'
  title: string
  description?: string
  code?: string
  config?: any
  position: { x: number; y: number }
  isExecuting?: boolean
  executionStatus?: 'success' | 'error' | 'running'
  customNodeId?: number
  customNodeName?: string
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
      setWorkflowMetadata(prev => ({
        ...prev,
        id: data.id,
        lastSaved: new Date()
      }))
      setHasUnsavedChanges(false)
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
      // Special case: for the default "Untitled" workflows with no id yet,
      // do NOT auto-save. The user must explicitly name the workflow first
      // via Save As; this prevents cluttering the DB with unnamed entries.
      let targetId = workflowMetadata.id
      const isUntitled =
        workflowMetadata.name === 'Untitled Workflow' ||
        workflowMetadata.name === 'Untitled'

      if (!targetId && isUntitled) {
        // Skip saving entirely for unnamed workflows with no id.
        return
      }

      if (!targetId && isUntitled) {
        try {
          const existing = await getWorkflowByNameQuery.refetch()
          if (existing.data?.id) {
            targetId = existing.data.id
          }
        } catch (e) {
          console.error('Failed to lookup existing Untitled workflow by name:', e)
        }
      }

      await saveWorkflowMutation.mutateAsync({
        id: targetId ?? workflowMetadata.id,
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
  }, [workflowMetadata, saveWorkflowMutation, createWorkflowData, getWorkflowByNameQuery])

  const handleSaveAs = async (name: string, shouldUpdateCurrent: boolean) => {
    try {
      // Determine if we should update the current workflow or create a new one:
      // - If same name (shouldUpdateCurrent), always update current workflow
      // - If different name but current workflow has ID, update current workflow with new name
      // - If different name and no current ID, create new workflow
      const workflowId = (shouldUpdateCurrent || workflowMetadata.id) ? workflowMetadata.id : undefined
      
      const result = await saveWorkflowMutation.mutateAsync({
        id: workflowId,
        name: name,
        description: workflowMetadata.description,
        tags: workflowMetadata.tags,
        data: createWorkflowData(),
        isTemplate: workflowMetadata.isTemplate
      })
      
      setWorkflowMetadata(prev => ({
        ...prev,
        name: name,
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
        }
      })

      // Load connections
      const loadedConnections: Connection[] = Object.values(workflowData.connections || {}).map((conn: any) => ({
        from: conn.source,
        to: conn.target
      }))

      setNodes(loadedNodes)
      setConnections(loadedConnections)
      setWorkflowMetadata({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        tags: workflow.tags || [],
        isTemplate: workflow.is_template || false,
        lastSaved: new Date(workflow.updated_at)
      })
      setHasUnsavedChanges(false)
      setShowWorkflowBrowser(false)
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

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedNode(nodeId)
      setShowEditorModal(true)
    }
  }

  const handleNodeSave = (code?: string, config?: any) => {
    if (selectedNode) {
      if (code !== undefined) {
        updateNodeCode(selectedNode, code)
      }
      if (config !== undefined) {
        updateNodeConfig(selectedNode, config)
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
      {showEditorModal && selectedNodeData && selectedNodeData.type !== 'llm' && (
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
          onSave={handleNodeSave}
          onDelete={handleNodeDelete}
          isLocked={isLocked}
          isCustom={Boolean(selectedNodeData.customNodeId)}
          customName={selectedNodeData.customNodeName}
          onMakeCustom={isLocked ? undefined : handleMakeCustomNode}
          onUpdateCustomFromNode={isLocked ? undefined : handleUpdateCustomFromNode}
          onExportCustomNode={isLocked ? undefined : handleExportSelectedCustomNode}
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
