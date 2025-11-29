'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { trpc } from '@/lib/trpc-provider'
import { WorkflowCanvas } from '@/components/canvas'
import { ModernToolbar } from '@/components/toolbar/ModernToolbar'
import { ExecutionTimeline, TimelineEntry } from '@/components/timeline/ExecutionTimeline'
import { NodeEditorModal } from '@/components/editor/NodeEditorModal'
import { SaveAsDialog } from '@/components/dialogs/SaveAsDialog'
import { useTheme } from '@/contexts/ThemeContext'
import type { NodeType } from '@/components/toolbar/ModernToolbar'

interface WorkflowNode {
  id: string
  type: 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm'
  title: string
  code?: string
  config?: any
  position: { x: number; y: number }
  isExecuting?: boolean
  executionStatus?: 'success' | 'error' | 'running'
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
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'templates' | 'my-workflows' | 'public'>('all')
  const { isDark } = useTheme()
  
  const { data: workflowsData, isLoading, refetch } = trpc.listWorkflows.useQuery({
    search: searchTerm,
    category: selectedCategory,
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
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Workflows</option>
            <option value="my-workflows">My Workflows</option>
            <option value="templates">Templates</option>
            <option value="public">Public</option>
          </select>
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
                          if (confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
                            deleteWorkflowMutation.mutate({ id: workflow.id })
                          }
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
                    Updated: {new Date(workflow.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

  // tRPC mutations
  const executeWorkflowMutation = trpc.executeWorkflow.useMutation()
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
        code: node.code,
        config: node.config,
        position: node.position
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
      alert('Failed to save workflow. Please try again.')
    }
  }, [workflowMetadata, saveWorkflowMutation, createWorkflowData])

  useEffect(() => {
    if (!hasUnsavedChanges || !workflowMetadata.id) return

    const autoSaveTimer = setTimeout(() => {
      handleSave()
    }, 30000)

    return () => clearTimeout(autoSaveTimer)
  }, [hasUnsavedChanges, workflowMetadata.id, handleSave])

  const handleSaveAs = async (name: string) => {
    try {
      const result = await saveWorkflowMutation.mutateAsync({
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
      const loadedNodes: WorkflowNode[] = Object.entries(workflowData.nodes || {}).map(([id, nodeData]: [string, any]) => ({
        id,
        type: nodeData.type,
        title: nodeData.title,
        code: nodeData.code,
        config: nodeData.config,
        position: nodeData.position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 }
      }))

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
      alert('Failed to load workflow. Please try again.')
    }
  }

  const handleNewWorkflow = () => {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to create a new workflow?')) {
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
          alert(`Successfully imported workflow: ${result.name}`)
        }
      } catch (error) {
        console.error('Failed to import workflow:', error)
        alert('Failed to import workflow. Please check the file format.')
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

      const result = await executeWorkflowMutation.mutateAsync({
        workflow: workflowData
      })

      // Convert to timeline entries
      const entries: TimelineEntry[] = []
      let allSuccess = true

      result.nodes.forEach((nodeResult: any, index: number) => {
        const status: 'success' | 'error' | 'running' = nodeResult.error ? 'error' : 'success'
        if (nodeResult.error) allSuccess = false

        entries.push({
          id: `entry-${nodeResult.id}-${Date.now()}`,
          nodeId: nodeResult.id,
          nodeTitle: nodes.find(n => n.id === nodeResult.id)?.title || nodeResult.id,
          status,
          output: nodeResult.output,
          error: nodeResult.error,
          stdout: nodeResult.stdout,
          stderr: nodeResult.stderr,
          executionTime: nodeResult.execution_time,
          timestamp: new Date(),
        })

        // Update node execution status
        setNodes(prev => prev.map(node => 
          node.id === nodeResult.id
            ? { ...node, isExecuting: false, executionStatus: status }
            : node
        ))
      })

      setTimelineEntries(entries)

      // Confetti on success
      if (allSuccess && entries.length > 0) {
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
    const newNode: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      title: getNodeTitle(type),
      position: { 
        x: 300 + Math.random() * 200, 
        y: 200 + nodes.length * 100 
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
      newNode.config = {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        prompt: 'You are a helpful assistant. Process this data: {input}',
        system: '',
        temperature: 0.7,
        max_tokens: 1000,
        api_key_name: 'OPENROUTER_API_KEY',
        ollama_host: 'http://localhost:11434'
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

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Modern Toolbar */}
      <ModernToolbar
        activeNodeType={activeNodeType}
        onNodeTypeClick={(type) => {
          setActiveNodeType(type)
          addNode(type)
        }}
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
            nodes={nodes}
            connections={connections}
            onNodeClick={handleNodeClick}
            isExecuting={isExecuting}
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
      {showEditorModal && selectedNodeData && (
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
        currentName={workflowMetadata.name}
        currentId={workflowMetadata.id}
        onClose={() => setShowSaveAsDialog(false)}
        onSave={handleSaveAs}
      />
    </div>
  )
}
