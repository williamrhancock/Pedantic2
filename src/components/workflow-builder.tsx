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

class PythonNode extends Classic.Node<{ input: Classic.Socket }, { output: Classic.Socket }, { code: string }> {
  constructor(code = 'def run(input):\n    return input') {
    super('Python Code')
    this.addInput('input', new Classic.Input(new Classic.Socket('socket'), 'Input'))
    this.addOutput('output', new Classic.Output(new Classic.Socket('socket'), 'Output'))
    this.addControl('code', new Classic.InputControl('text', { initial: code }))
  }
}

class TypeScriptNode extends Classic.Node<{ input: Classic.Socket }, { output: Classic.Socket }, { code: string }> {
  constructor(code = 'async function run(input: any): Promise<any> {\n    return input;\n}') {
    super('TypeScript Code')
    this.addInput('input', new Classic.Input(new Classic.Socket('socket'), 'Input'))
    this.addOutput('output', new Classic.Output(new Classic.Socket('socket'), 'Output'))
    this.addControl('code', new Classic.InputControl('text', { initial: code }))
  }
}

type Schemes = GetSchemes<StartNode | EndNode | PythonNode | TypeScriptNode, Classic.Connection<StartNode | EndNode | PythonNode | TypeScriptNode, StartNode | EndNode | PythonNode | TypeScriptNode>>

export function WorkflowBuilder() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<NodeEditor<Schemes> | null>(null)
  const [area, setArea] = useState<AreaPlugin<Schemes, AreaExtra> | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({})
  const [logs, setLogs] = useState<string[]>([])

  const { data: workflow, refetch: refetchWorkflow } = trpc.getWorkflow.useQuery({ id: 1 })
  const saveWorkflowMutation = trpc.saveWorkflow.useMutation()
  const executeWorkflowMutation = trpc.executeWorkflow.useMutation()

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (editor: NodeEditor<Schemes>) => {
      if (!editor) return
      
      try {
        const nodes: Record<string, any> = {}
        const connections: Record<string, any> = {}

        // Export nodes
        for (const [id, node] of editor.getNodes()) {
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
        for (const [id, connection] of editor.getConnections()) {
          connections[id] = {
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
    }, 1000),
    [area, saveWorkflowMutation]
  )

  const getNodeType = (node: any): string => {
    if (node instanceof StartNode) return 'start'
    if (node instanceof EndNode) return 'end'
    if (node instanceof PythonNode) return 'python'
    if (node instanceof TypeScriptNode) return 'typescript'
    return 'unknown'
  }

  const createNode = async (type: 'start' | 'end' | 'python' | 'typescript', position: [number, number] = [0, 0]) => {
    if (!editor || !area) return

    let node: StartNode | EndNode | PythonNode | TypeScriptNode

    switch (type) {
      case 'start':
        node = new StartNode()
        break
      case 'end':
        node = new EndNode()
        break
      case 'python':
        node = new PythonNode()
        break
      case 'typescript':
        node = new TypeScriptNode()
        break
      default:
        return
    }

    await editor.addNode(node)
    await area.translate(node.id, { x: position[0], y: position[1] })
    
    // Trigger save
    debouncedSave(editor)
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

      for (const [id, node] of editor.getNodes()) {
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

      for (const [id, connection] of editor.getConnections()) {
        connections[id] = {
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
          ['Add Python Node', () => createNode('python', [100, 100])],
          ['Add TypeScript Node', () => createNode('typescript', [100, 100])],
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
              return (props: any) => {
                const nodeData = {
                  ...payload,
                  title: payload.label,
                  code: payload.controls?.code?.value || ''
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
            }
            
            return Presets.classic.node
          }
        }
      }))

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
  }, [])

  // Load workflow data
  useEffect(() => {
    if (!editor || !area || !workflow) return

    const loadWorkflow = async () => {
      // Clear existing
      await editor.clear()

      // Load nodes
      for (const [id, nodeData] of Object.entries(workflow.data.nodes)) {
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
      for (const [id, connData] of Object.entries(workflow.data.connections)) {
        const sourceNode = editor.getNode(connData.source)
        const targetNode = editor.getNode(connData.target)
        
        if (sourceNode && targetNode) {
          const connection = new Classic.Connection(
            sourceNode,
            connData.sourceOutput,
            targetNode,
            connData.targetInput
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
    </div>
  )
}

type AreaExtra = ReactArea2D<Schemes> & ContextMenuExtra