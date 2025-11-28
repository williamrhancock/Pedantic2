'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { NodeEditor, GetSchemes, ClassicPreset as Classic } from 'rete'
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin'
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin'
import { ReactPlugin, Presets, ReactArea2D } from 'rete-react-plugin'
import { ContextMenuPlugin, ContextMenuExtra, Presets as ContextMenuPresets } from 'rete-context-menu-plugin'
import { MinimapPlugin } from 'rete-minimap-plugin'
import { DataflowEngine } from 'rete-engine'
import { trpc } from '@/lib/trpc-provider'
import { nodeComponents } from '@/components/nodes/node-components'
import { debounce } from 'lodash'
import { FloatingAddButton } from '@/components/ui/FloatingAddButton'

// Node classes matching our schema
class StartNode extends Classic.Node<{}, { output: Classic.Socket }, {}> {
  constructor() {
    super('Start')
    this.addOutput('output', new Classic.Output(new Classic.Socket('socket'), 'Output'))
  }
}

class EndNode extends Classic.Node<{ input: Classic.Socket }, {}, {}> {
  constructor() {
    super('End')
    this.addInput('input', new Classic.Input(new Classic.Socket('socket'), 'Input'))
  }
}

type CodeControl = Classic.InputControl<'text'>

class PythonNode extends Classic.Node<{ input: Classic.Socket }, { output: Classic.Socket }, { code: CodeControl }> {
  constructor(code = 'def run(input):\n    return input') {
    super('Python Code')
    this.addInput('input', new Classic.Input(new Classic.Socket('socket'), 'Input'))
    this.addOutput('output', new Classic.Output(new Classic.Socket('socket'), 'Output'))
    this.addControl('code', new Classic.InputControl('text', { initial: code }))
  }
}

class TypeScriptNode extends Classic.Node<{ input: Classic.Socket }, { output: Classic.Socket }, { code: CodeControl }> {
  constructor(code = 'async function run(input: any): Promise<any> {\n    return input;\n}') {
    super('TypeScript Code')
    this.addInput('input', new Classic.Input(new Classic.Socket('socket'), 'Input'))
    this.addOutput('output', new Classic.Output(new Classic.Socket('socket'), 'Output'))
    this.addControl('code', new Classic.InputControl('text', { initial: code }))
  }
}

type NodeKind = 'start' | 'end' | 'python' | 'typescript'

const instantiateNode = (type: NodeKind, options?: { code?: string }) => {
  switch (type) {
    case 'start':
      return new StartNode()
    case 'end':
      return new EndNode()
    case 'python':
      return new PythonNode(options?.code)
    case 'typescript':
      return new TypeScriptNode(options?.code)
    default:
      return new StartNode()
  }
}

type Schemes = GetSchemes<StartNode | EndNode | PythonNode | TypeScriptNode, Classic.Connection<StartNode | EndNode | PythonNode | TypeScriptNode, StartNode | EndNode | PythonNode | TypeScriptNode>>

interface StoredNodeData {
  type: NodeKind
  title?: string
  code?: string
  position?: [number, number]
}

interface StoredConnectionData {
  source: string
  target: string
  sourceOutput?: string
  targetInput?: string
}

export function WorkflowBuilder() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<NodeEditor<Schemes> | null>(null)
  const [area, setArea] = useState<AreaPlugin<Schemes, AreaExtra> | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({})
  const [logs, setLogs] = useState<string[]>([])
  const [nodeCounter, setNodeCounter] = useState(0) // For unique node IDs

  const { data: workflow, refetch: refetchWorkflow } = trpc.getWorkflow.useQuery({ id: 1 })
  const saveWorkflowMutation = trpc.saveWorkflow.useMutation()
  const executeWorkflowMutation = trpc.executeWorkflow.useMutation()

  const getNodeType = (node: any): string => {
    if (node instanceof StartNode) return 'start'
    if (node instanceof EndNode) return 'end'
    if (node instanceof PythonNode) return 'python'
    if (node instanceof TypeScriptNode) return 'typescript'
    return 'unknown'
  }

  const addNode = async () => {
    if (!editor || !area) return

    const newNodeId = `node-${nodeCounter}`
    setNodeCounter(prev => prev + 1)

    // Calculate a position for the new node (e.g., center of the visible area)
    const view = area.area.transform
    const x = (-view.x + window.innerWidth / 2) / area.area.transform.k
    const y = (-view.y + window.innerHeight / 2) / area.area.transform.k

    const node = instantiateNode('python') // Default to Python node for now
    node.id = newNodeId
    node.label = `Python Node ${nodeCounter}`

    await editor.addNode(node)
    await area.translate(node.id, { x, y })

    debouncedSave(editor)
  }

  // Debounced save function
  const debouncedSave = useCallback(
    (editorInstance: NodeEditor<Schemes>) => {
      if (!editorInstance) return
      
      const saveData = async () => {
        try {
          const nodes: Record<string, any> = {}
          const connections: Record<string, any> = {}

          // Export nodes
          for (const node of editorInstance.getNodes()) {
            const id = node.id
            const nodeData: any = {
              type: getNodeType(node),
              position: area?.nodeViews.get(id)?.position || [0, 0],
              title: node.label
            }

            if (node instanceof PythonNode || node instanceof TypeScriptNode) {
              const codeControl = node.controls.code as Classic.InputControl<'text'>
              nodeData.code = codeControl.value || ''
            }

            nodes[id] = nodeData
          }

          // Export connections
          for (const connection of editorInstance.getConnections()) {
            connections[connection.id] = {
              source: connection.source,
              target: connection.target,
              sourceOutput: connection.sourceOutput,
              targetInput: connection.targetInput
            }
          }

          const workflowData = { nodes, connections }
          
          await saveWorkflowMutation.mutateAsync({
            id: 1,
            name: 'Untitled',
            data: workflowData
          })
        } catch (error) {
          console.error('Failed to save workflow:', error)
        }
      }

      // Debounce the actual save
      const timeoutId = setTimeout(saveData, 1000)
      return () => clearTimeout(timeoutId)
    },
    [area, saveWorkflowMutation]
  )

  const createNode = async (type: NodeKind, position: [number, number] = [0, 0]) => {
    if (!editor || !area) return null

    const node = instantiateNode(type)

    await editor.addNode(node)
    await area.translate(node.id, { x: position[0], y: position[1] })
    
    // Trigger save
    debouncedSave(editor)
    return node
  }

  const executeWorkflow = async () => {
    if (!editor || isExecuting) return

    setIsExecuting(true)
    setExecutionResults({})
    setLogs([])

    try {
      // Export current workflow
      const nodes: Record<string, any> = {}
      const connections: Record<string, any> = {}

      for (const node of editor.getNodes()) {
        const id = node.id
        const nodeData: any = {
          type: getNodeType(node),
          title: node.label
        }

        if (node instanceof PythonNode || node instanceof TypeScriptNode) {
          const codeControl = node.controls.code as Classic.InputControl<'text'>
          nodeData.code = codeControl.value || ''
        }

        nodes[id] = nodeData
      }

      for (const connection of editor.getConnections()) {
        connections[connection.id] = {
          source: connection.source,
          target: connection.target,
          sourceOutput: connection.sourceOutput,
          targetInput: connection.targetInput
        }
      }

      const workflowData = { nodes, connections }
      
      // Execute via API
      const result = await executeWorkflowMutation.mutateAsync({
        workflow: workflowData
      })

      // Process results
      const results: Record<string, any> = {}
      const logEntries: string[] = []

      result.nodes.forEach((nodeResult: any) => {
        results[nodeResult.id] = nodeResult
        
        if (nodeResult.stdout) {
          logEntries.push(`[${nodeResult.id}] STDOUT: ${nodeResult.stdout}`)
        }
        if (nodeResult.stderr) {
          logEntries.push(`[${nodeResult.id}] STDERR: ${nodeResult.stderr}`)
        }
        if (nodeResult.error) {
          logEntries.push(`[${nodeResult.id}] ERROR: ${nodeResult.error}`)
        }
      })

      setExecutionResults(results)
      setLogs(logEntries)

    } catch (error) {
      console.error('Workflow execution failed:', error)
      setLogs(['Execution failed: ' + (error instanceof Error ? error.message : 'Unknown error')])
    } finally {
      setIsExecuting(false)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    const init = async () => {
      const editor = new NodeEditor<Schemes>()
      const area = new AreaPlugin<Schemes, AreaExtra>(containerRef.current!)
      const connection = new ConnectionPlugin<Schemes, AreaExtra>()
      const reactPlugin = new ReactPlugin<Schemes, AreaExtra>()
      const contextMenu = new ContextMenuPlugin<Schemes>({
        items: ContextMenuPresets.classic.setup([
          ['Add Python Node', () => instantiateNode('python')],
          ['Add TypeScript Node', () => instantiateNode('typescript')],
        ])
      })

      AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl()
      })

      reactPlugin.addPreset(Presets.classic.setup({
        customize: {
          node(context) {
            const { payload } = context
            const nodeType = getNodeType(payload)
            const Component = nodeComponents[nodeType as keyof typeof nodeComponents]
            
            if (Component) {
              const NodeComponent = (props: any) => {
                const codeControl = payload.controls?.code as CodeControl | undefined

                const nodeData = {
                  ...payload,
                  title: payload.label,
                  code: codeControl?.value || ''
                }
                
                // Add execution status styling
                const executionResult = executionResults[payload.id]
                let statusClass = ''
                if (executionResult) {
                  statusClass = executionResult.status === 'success' ? 'success' : 
                              executionResult.status === 'error' ? 'error' : 'running'
                }
                
                return (
                  <div className={`node-wrapper ${statusClass}`}>
                    <Component data={nodeData} emit={() => debouncedSave(editor)} />
                  </div>
                )
              }
              NodeComponent.displayName = `NodeComponent_${nodeType}`
              return NodeComponent
            }
            
            return (Presets.classic as any).node
          }
        }
      }) as any)

      connection.addPreset(ConnectionPresets.classic.setup())

      editor.use(area)
      area.use(connection)
      area.use(reactPlugin)
      area.use(contextMenu)

      // Auto-arrange
      AreaExtensions.simpleNodesOrder(area)

      setEditor(editor)
      setArea(area)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load workflow data
  useEffect(() => {
    if (!editor || !area || !workflow) return

    const loadWorkflow = async () => {
      // Clear existing
      await editor.clear()

      // Load nodes
      const storedNodes = workflow.data.nodes as Record<string, StoredNodeData>

      for (const [id, nodeData] of Object.entries(storedNodes)) {
        let node: StartNode | EndNode | PythonNode | TypeScriptNode

        switch (nodeData.type) {
          case 'start':
            node = new StartNode()
            break
          case 'end':
            node = new EndNode()
            break
          case 'python':
            node = new PythonNode(nodeData.code)
            break
          case 'typescript':
            node = new TypeScriptNode(nodeData.code)
            break
          default:
            continue
        }

        node.id = id
        if (nodeData.title) {
          node.label = nodeData.title
        }

        await editor.addNode(node)
        
        if (nodeData.position) {
          await area.translate(node.id, { 
            x: nodeData.position[0], 
            y: nodeData.position[1] 
          })
        }
      }

      // Load connections
      const storedConnections = workflow.data.connections as Record<string, StoredConnectionData>

      for (const [id, connData] of Object.entries(storedConnections)) {
        const sourceNode = editor.getNode(connData.source)
        const targetNode = editor.getNode(connData.target)
        
        if (sourceNode && targetNode) {
          const connection: any = new Classic.Connection(
            sourceNode as any,
            connData.sourceOutput ?? 'output',
            targetNode as any,
            connData.targetInput ?? 'input'
          )
          connection.id = id
          await editor.addConnection(connection)
        }
      }

      // Fit view
      AreaExtensions.zoomAt(area, editor.getNodes())
    }

    loadWorkflow()
  }, [editor, area, workflow])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Visual Workflow Builder</h1>
        <div className="flex gap-2">
          <button
            onClick={executeWorkflow}
            disabled={isExecuting}
            className={`px-4 py-2 rounded text-white font-medium ${
              isExecuting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isExecuting ? 'Executing...' : 'Execute Workflow'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Editor area */}
        <div className="flex-1 relative">
          <div ref={containerRef} className="w-full h-full rete" />
        </div>

        {/* Side panel for logs */}
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
      <FloatingAddButton onClick={addNode} />
    </div>
  )
}

type AreaExtra = ReactArea2D<Schemes> & ContextMenuExtra