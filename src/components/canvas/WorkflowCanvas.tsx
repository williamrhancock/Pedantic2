'use client'

import React, { useCallback, useMemo, useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from '@/contexts/ThemeContext'
import { WorkflowNode, type WorkflowNodeType, type WorkflowNodeData } from './NodeTypes'
import { AnimatedEdge } from './EdgeTypes'

// Re-export types for convenience
export type { WorkflowNodeType, WorkflowNodeData }

// Define nodeTypes and edgeTypes at MODULE level - they will NEVER be recreated
// This is the ONLY way to avoid React Flow's warning
const nodeTypes: NodeTypes = { workflowNode: WorkflowNode }
const edgeTypes: EdgeTypes = { animated: AnimatedEdge }

interface WorkflowCanvasProps {
  nodes: Array<{
    id: string
    type: WorkflowNodeType
    title: string
    code?: string
    config?: any
    position: { x: number; y: number }
    isExecuting?: boolean
    executionStatus?: 'success' | 'error' | 'running'
  }>
  connections: Array<{ from: string; to: string }>
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onConnect?: (connection: Connection) => void
  onNodeClick?: (nodeId: string) => void
  isExecuting?: boolean
}

function WorkflowCanvasInner({
  nodes: initialNodes,
  connections: initialConnections,
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onConnect: externalOnConnect,
  onNodeClick,
  isExecuting = false,
}: WorkflowCanvasProps) {
  const { isDark } = useTheme()

  // Convert to react-flow format
  const reactFlowNodes = useMemo<Node[]>(() => {
    return initialNodes.map((node) => ({
      id: node.id,
      type: 'workflowNode',
      position: node.position,
      data: {
        type: node.type,
        title: node.title,
        code: node.code,
        config: node.config,
        isExecuting: node.isExecuting || isExecuting,
        executionStatus: node.executionStatus,
      },
    }))
  }, [initialNodes, isExecuting])

  const reactFlowEdges = useMemo<Edge[]>(() => {
    return initialConnections
      .filter((conn) => {
        const sourceNode = initialNodes.find((n) => n.id === conn.from)
        const targetNode = initialNodes.find((n) => n.id === conn.to)
        return sourceNode && sourceNode.type !== 'end' && targetNode && targetNode.type !== 'start'
      })
      .map((conn) => {
        const edge: Edge = {
          id: `edge-${conn.from}-${conn.to}`,
          source: conn.from,
          target: conn.to,
          sourceHandle: 'output',
          targetHandle: 'input',
          type: isExecuting ? 'animated' : 'default',
          animated: isExecuting,
          data: { animated: isExecuting },
          style: {
            strokeWidth: 2,
          },
          markerEnd: {
            type: 'arrowclosed' as any,
            color: '#8b5cf6',
          },
        }
        return edge
      })
  }, [initialConnections, initialNodes, isExecuting])

  const [nodes, setNodes] = useState<Node[]>(reactFlowNodes)
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    console.log('WorkflowCanvas: Updating nodes', reactFlowNodes.length, reactFlowNodes)
    setNodes(reactFlowNodes)
  }, [reactFlowNodes])

  useEffect(() => {
    const timer = setTimeout(() => {
      setEdges(reactFlowEdges)
    }, 100)
    return () => clearTimeout(timer)
  }, [reactFlowEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = reactFlowNodes.find((n) => n.id === params.source)
      const targetNode = reactFlowNodes.find((n) => n.id === params.target)
      
      if (!sourceNode || !targetNode) return
      
      const sourceData = sourceNode.data as WorkflowNodeData
      const targetData = targetNode.data as WorkflowNodeData
      
      if (sourceData.type === 'end' || targetData.type === 'start') {
        return
      }
      
      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source || '',
        target: params.target || '',
        sourceHandle: 'output',
        targetHandle: 'input',
        type: 'default',
        markerEnd: {
          type: 'arrowclosed' as any,
          color: '#8b5cf6',
        },
      }
      
      setEdges((eds) => {
        const newEdges = addEdge(newEdge, eds)
        Promise.resolve().then(() => {
          if (externalOnConnect) externalOnConnect(params)
          if (externalOnEdgesChange) externalOnEdgesChange(newEdges)
        })
        return newEdges
      })
    },
    [reactFlowNodes, externalOnConnect, externalOnEdgesChange]
  )

  const handleNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        let updatedNodes = [...nds]
        changes.forEach((change: any) => {
          if (change.type === 'position' && change.position) {
            updatedNodes = updatedNodes.map((node) =>
              node.id === change.id ? { ...node, position: change.position } : node
            )
          } else if (change.type === 'remove') {
            updatedNodes = updatedNodes.filter((node) => node.id !== change.id)
          }
        })
        if (externalOnNodesChange) {
          Promise.resolve().then(() => externalOnNodesChange(updatedNodes))
        }
        return updatedNodes
      })
    },
    [externalOnNodesChange]
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      setEdges((eds) => {
        let updatedEdges = [...eds]
        changes.forEach((change: any) => {
          if (change.type === 'remove') {
            updatedEdges = updatedEdges.filter((edge) => edge.id !== change.id)
          }
        })
        if (externalOnEdgesChange) {
          Promise.resolve().then(() => externalOnEdgesChange(updatedEdges))
        }
        return updatedEdges
      })
    },
    [externalOnEdgesChange]
  )

  const onNodeClickInternal = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeClick) onNodeClick(node.id)
    },
    [onNodeClick]
  )

  console.log('WorkflowCanvas render:', { 
    nodeCount: nodes.length, 
    edgeCount: edges.length,
    nodes: nodes.map(n => ({ id: n.id, type: n.type, pos: n.position }))
  })

  return (
    <div className="w-full h-full" style={{ minHeight: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickInternal}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className={isDark ? 'dark' : ''}
      >
        <Background color={isDark ? '#4a5568' : '#e2e8f0'} gap={16} size={1} />
        <Controls
          className={`${isDark ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border border-white/20 rounded-lg`}
        />
        <MiniMap
          className={`${isDark ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border border-white/20 rounded-lg`}
          nodeColor={(node: Node) => {
            const data = node.data as WorkflowNodeData
            if (data.executionStatus === 'success') return '#22c55e'
            if (data.executionStatus === 'error') return '#ef4444'
            if (data.isExecuting) return '#8b5cf6'
            return isDark ? '#4a5568' : '#cbd5e1'
          }}
        />
      </ReactFlow>
    </div>
  )
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading canvas...</div>
      </div>
    )
  }

  return <WorkflowCanvasInner {...props} />
}
