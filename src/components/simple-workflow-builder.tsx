'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { trpc } from '@/lib/trpc-provider'

interface WorkflowNode {
  id: string
  type: 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm'
  title: string
  code?: string
  config?: any
  position: { x: number; y: number }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Open Workflow</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Workflows</option>
            <option value="my-workflows">My Workflows</option>
            <option value="templates">Templates</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflowsData?.workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => onSelect(workflow)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 truncate">{workflow.name}</h3>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateWorkflowMutation.mutate({
                            id: workflow.id,
                            name: `Copy of ${workflow.name}`
                          })
                        }}
                        className="text-gray-400 hover:text-blue-600 p-1"
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
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{workflow.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {workflow.tags?.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
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
      id: 'python1',
      type: 'python',
      title: 'Python Code',
      code: 'def run(input):\n    return input',
      position: { x: 300, y: 100 }
    },
    {
      id: 'end',
      type: 'end',
      title: 'End',
      position: { x: 500, y: 100 }
    }
  ])

  // Auto-save and UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [showWorkflowBrowser, setShowWorkflowBrowser] = useState(false)
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false)

  // Generate connections based on node order
  const generateConnections = (nodeList: WorkflowNode[]): Connection[] => {
    const connections: Connection[] = []
    for (let i = 0; i < nodeList.length - 1; i++) {
      connections.push({
        from: nodeList[i].id,
        to: nodeList[i + 1].id
      })
    }
    return connections
  }

  const [connections, setConnections] = useState<Connection[]>(generateConnections(nodes))

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

  useEffect(() => {
    if (!hasUnsavedChanges || !workflowMetadata.id) return

    const autoSaveTimer = setTimeout(() => {
      handleSave()
    }, 30000) // Auto-save after 30 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [hasUnsavedChanges, workflowMetadata.id])

  // Save/Load functions
  const createWorkflowData = () => ({
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
  })

  const handleSave = async () => {
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
  }

  const handleSaveAs = async (newMetadata: Partial<WorkflowMetadata>) => {
    try {
      const result = await saveWorkflowMutation.mutateAsync({
        name: newMetadata.name || workflowMetadata.name,
        description: newMetadata.description || workflowMetadata.description,
        tags: newMetadata.tags || workflowMetadata.tags,
        data: createWorkflowData(),
        isTemplate: newMetadata.isTemplate || false
      })
      
      setWorkflowMetadata(prev => ({
        ...prev,
        ...newMetadata,
        id: result.id,
        lastSaved: new Date()
      }))
      setHasUnsavedChanges(false)
      setShowSaveAsDialog(false)
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow. Please try again.')
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
        position: nodeData.position || { x: 100, y: 100 }
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
        position: { x: 300, y: 100 }
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

        // Call the importWorkflow TRPC endpoint
        const result = await importWorkflowMutation.mutateAsync({
          data: importData,
          overwriteMetadata: true
        })

        // Load the imported workflow by fetching it from the database
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

  // Add import mutation
  const importWorkflowMutation = trpc.importWorkflow.useMutation()

  // Update nodes and mark as changed
  const updateNodes = useCallback((newNodes: WorkflowNode[]) => {
    setNodes(newNodes)
    setConnections(generateConnections(newNodes))
    markAsChanged()
  }, [markAsChanged])

  // Native HTML5 drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, nodeId: string, index: number) => {
    setDraggedNode(nodeId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', nodeId)
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault()
    const draggedNodeId = draggedNode
    
    if (!draggedNodeId) return
    
    const draggedIndex = nodes.findIndex(node => node.id === draggedNodeId)
    if (draggedIndex === -1 || draggedIndex === dropIndex) return

    const newNodes = Array.from(nodes)
    const [reorderedNode] = newNodes.splice(draggedIndex, 1)
    newNodes.splice(dropIndex, 0, reorderedNode)

    setNodes(newNodes)
    setConnections(generateConnections(newNodes))
    setDraggedNode(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedNode(null)
    setDragOverIndex(null)
  }

  const executeWorkflow = async () => {
    setIsExecuting(true)
    setLogs([])

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

      const logEntries: string[] = []
      result.nodes.forEach((nodeResult: any) => {
        if (nodeResult.stdout) {
          logEntries.push(`[${nodeResult.id}] STDOUT: ${nodeResult.stdout}`)
        }
        if (nodeResult.stderr) {
          logEntries.push(`[${nodeResult.id}] STDERR: ${nodeResult.stderr}`)
        }
        if (nodeResult.error) {
          logEntries.push(`[${nodeResult.id}] ERROR: ${nodeResult.error}`)
        } else {
          logEntries.push(`[${nodeResult.id}] SUCCESS: ${JSON.stringify(nodeResult.output)}`)
        }
      })

      setLogs(logEntries)
    } catch (error) {
      setLogs(['Execution failed: ' + (error instanceof Error ? error.message : 'Unknown error')])
    } finally {
      setIsExecuting(false)
    }
  }


  const addNode = (type: 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm') => {
    const newNode: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      title: getNodeTitle(type),
      position: { x: 300, y: 200 + nodes.length * 50 }
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

  const getNodeBorderColor = (type: string): string => {
    switch (type) {
      case 'start': return 'border-l-4 border-l-green-500'
      case 'end': return 'border-l-4 border-l-red-500'
      case 'python': return 'border-l-4 border-l-blue-500'
      case 'typescript': return 'border-l-4 border-l-cyan-500'
      case 'http': return 'border-l-4 border-l-purple-500'
      case 'file': return 'border-l-4 border-l-yellow-500'
      case 'condition': return 'border-l-4 border-l-orange-500'
      case 'database': return 'border-l-4 border-l-green-600'
      case 'llm': return 'border-l-4 border-l-pink-500'
      default: return 'border-l-4 border-l-gray-500'
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

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  return (
    <div className="w-full h-full flex flex-col">
      {/* Enhanced Header with Toolbar */}
      <div className="bg-white border-b border-gray-200">
        {/* Main toolbar */}
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Workflow Builder</h1>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>{workflowMetadata.name}</span>
              {hasUnsavedChanges && (
                <span className="text-orange-600 ml-1">•</span>
              )}
              {isAutoSaving && (
                <span className="text-blue-600 ml-1">Saving...</span>
              )}
              {workflowMetadata.lastSaved && !isAutoSaving && !hasUnsavedChanges && (
                <span className="text-gray-400 ml-1 text-xs">
                  Saved {new Date(workflowMetadata.lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            {/* File menu */}
            <button
              onClick={handleNewWorkflow}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              title="New Workflow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => setShowWorkflowBrowser(true)}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              title="Open Workflow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={handleSave}
              disabled={isAutoSaving || !hasUnsavedChanges}
              className={`px-3 py-2 rounded text-sm ${
                hasUnsavedChanges && !isAutoSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title={isAutoSaving ? "Saving workflow..." : hasUnsavedChanges ? "Save current workflow to database" : "No unsaved changes"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
            <button
              onClick={() => setShowSaveAsDialog(true)}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              title="Save As... - Save workflow with a new name"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              title="Export Workflow - Download workflow as JSON file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={handleImport}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              title="Import Workflow from File"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-4l-2-2H5a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-4-4l-4 4 4 4" />
              </svg>
            </button>

            <div className="w-px bg-gray-300 mx-2"></div>

            {/* Node actions */}
            <button
              onClick={() => addNode('python')}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              title="Add Python Code Node - Execute Python scripts with restricted environment"
            >
              + Python
            </button>
            <button
              onClick={() => addNode('typescript')}
              className="px-3 py-2 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700"
              title="Add TypeScript Code Node - Execute TypeScript/JavaScript with async support"
            >
              + TypeScript
            </button>
            <button
              onClick={() => addNode('http')}
              className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              title="Add HTTP API Call Node - Make requests to external APIs and web services"
            >
              + HTTP API
            </button>
            <button
              onClick={() => addNode('file')}
              className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              title="Add File Operations Node - Read, write, append, delete, and list files"
            >
              + File Ops
            </button>
            <button
              onClick={() => addNode('condition')}
              className="px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              title="Add Conditional Logic Node - Branch workflow based on data conditions"
            >
              + Condition
            </button>
            <button
              onClick={() => addNode('database')}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              title="Add Database Query Node - Execute SQLite queries and database operations"
            >
              + Database
            </button>
            <button
              onClick={() => addNode('llm')}
              className="px-3 py-2 bg-pink-600 text-white rounded text-sm hover:bg-pink-700"
              title="Add LLM AI Assistant Node - Integrate AI models via OpenRouter or Ollama"
            >
              + LLM AI
            </button>

            <div className="w-px bg-gray-300 mx-2"></div>

            {/* Execute */}
            <button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className={`px-4 py-2 rounded text-white font-medium ${
                isExecuting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              title={isExecuting ? "Workflow is currently executing" : "Execute the entire workflow with real-time logging"}
            >
              {isExecuting ? 'Executing...' : '▶ Execute'}
            </button>
          </div>
        </div>

        {/* Workflow metadata */}
        {workflowMetadata.description && (
          <div className="px-4 pb-2">
            <p className="text-sm text-gray-600">{workflowMetadata.description}</p>
          </div>
        )}
        {workflowMetadata.tags.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex gap-1">
              {workflowMetadata.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workflow Browser Modal */}
      <WorkflowBrowser
        isOpen={showWorkflowBrowser}
        onClose={() => setShowWorkflowBrowser(false)}
        onSelect={handleLoadWorkflow}
      />

      <div className="flex-1 flex">
        {/* Workflow Canvas */}
        <div className="flex-1 bg-gray-50 relative overflow-hidden">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">
              Workflow Nodes
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Drag to reorder execution)
              </span>
            </h3>
            
            <div className="space-y-4">
              {nodes.map((node, index) => (
                <div
                  key={node.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node.id, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedNode === node.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${
                    draggedNode === node.id
                      ? 'opacity-50 scale-105 rotate-2 shadow-lg'
                      : ''
                  } ${
                    dragOverIndex === index && draggedNode !== node.id
                      ? 'border-blue-300 bg-blue-50'
                      : ''
                  } ${getNodeBorderColor(node.type)}`}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">#{index + 1}</span>
                      <h4 className="font-medium">{node.title}</h4>
                      <div className="cursor-grab active:cursor-grabbing">
                        <svg
                          className="w-4 h-4 text-gray-400 hover:text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                          />
                        </svg>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">
                      {node.type.toUpperCase()}
                    </span>
                  </div>
                  {node.code && (
                    <div className="mt-2 text-xs text-gray-600">
                      <code className="bg-gray-100 p-1 rounded">
                        {node.code.split('\n')[0]}...
                      </code>
                    </div>
                  )}
                  {node.config && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="bg-gray-100 p-1 rounded">
                        {node.type === 'http' && `${node.config.method} ${node.config.url}`}
                        {node.type === 'file' && `${node.config.operation} ${node.config.path}`}
                        {node.type === 'condition' && `${node.config.conditions?.length || 0} condition(s)`}
                        {node.type === 'database' && `${node.config.operation} ${node.config.database}`}
                        {node.type === 'llm' && `${node.config.provider} ${node.config.model}`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Connection indicators */}
            <div className="mt-6">
              <h4 className="font-medium text-sm text-gray-600 mb-2">Execution Flow:</h4>
              <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500">
                {nodes.map((node, index) => (
                  <React.Fragment key={node.id}>
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      #{index + 1} {node.title}
                    </span>
                    {index < nodes.length - 1 && (
                      <span className="text-blue-500">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration/Code Editor Panel */}
        {selectedNodeData && (
          selectedNodeData.type === 'python' ||
          selectedNodeData.type === 'typescript' ||
          selectedNodeData.type === 'http' ||
          selectedNodeData.type === 'file' ||
          selectedNodeData.type === 'condition' ||
          selectedNodeData.type === 'database' ||
          selectedNodeData.type === 'llm'
        ) && (
          <div className="w-1/2 border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium">
                Edit {selectedNodeData.title}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedNodeData.type === 'python' && 'Must have a "run(input)" function that returns output'}
                {selectedNodeData.type === 'typescript' && 'Must have an "async run(input)" function that returns output'}
                {selectedNodeData.type === 'http' && 'Configure HTTP request parameters'}
                {selectedNodeData.type === 'file' && 'Configure file operation settings'}
                {selectedNodeData.type === 'condition' && 'Configure conditional logic rules'}
                {selectedNodeData.type === 'database' && 'Configure database query parameters'}
                {selectedNodeData.type === 'llm' && 'Configure LLM provider and prompt settings'}
              </p>
            </div>
            <div className="flex-1">
              {(selectedNodeData.type === 'python' || selectedNodeData.type === 'typescript') && (
                <Editor
                  height="100%"
                  language={selectedNodeData.type === 'python' ? 'python' : 'typescript'}
                  value={selectedNodeData.code || ''}
                  onChange={(value) => updateNodeCode(selectedNodeData.id, value || '')}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              )}
              
              {selectedNodeData.config && (
                <div className="p-4 space-y-4 h-full overflow-auto">
                  <Editor
                    height="100%"
                    language="json"
                    value={JSON.stringify(selectedNodeData.config, null, 2)}
                    onChange={(value) => {
                      try {
                        const parsedConfig = JSON.parse(value || '{}')
                        updateNodeConfig(selectedNodeData.id, parsedConfig)
                      } catch (e) {
                        // Invalid JSON, don't update
                      }
                    }}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs Panel */}
        <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Execution Logs</h3>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No logs yet. Execute a workflow to see output.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono bg-white p-2 rounded border">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}