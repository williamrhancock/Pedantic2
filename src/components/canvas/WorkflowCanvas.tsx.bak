'use client'

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
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
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from '@/contexts/ThemeContext'
import { WorkflowNode, type WorkflowNodeType, type WorkflowNodeData } from './NodeTypes'
import { AnimatedEdge } from './EdgeTypes'

// Re-export types for convenience
export type { WorkflowNodeType, WorkflowNodeData }

// Use a ref to store nodeTypes/edgeTypes - this survives Fast Refresh
// This is the most reliable way to ensure stable references
let nodeTypesRef: NodeTypes | null = null
let edgeTypesRef: EdgeTypes | null = null

function getNodeTypes(): NodeTypes {
  if (!nodeTypesRef) {
    nodeTypesRef = Object.freeze({ workflowNode: WorkflowNode })
  }
  return nodeTypesRef
}

function getEdgeTypes(): EdgeTypes {
  if (!edgeTypesRef) {
    edgeTypesRef = Object.freeze({ animated: AnimatedEdge })
  }
  return edgeTypesRef
}

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
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  // Convert to react-flow format
  // CRITICAL: Set hidden: false to prevent React Flow from hiding nodes
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
      hidden: false, // Force nodes to be visible - this is the key fix!
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
  const prevNodeIdsRef = useRef<string>('')
  const isUpdatingFromPropsRef = useRef(false)

  // Use a ref to track the last node IDs to prevent unnecessary updates
  const lastInitialNodesRef = useRef(initialNodes)
  
  useEffect(() => {
    // Only update if the nodes array reference changed AND content is different
    const currentIds = initialNodes.map(n => n.id).sort().join(',')
    const lastIds = lastInitialNodesRef.current.map(n => n.id).sort().join(',')
    
    if (currentIds !== lastIds || initialNodes !== lastInitialNodesRef.current) {
      isUpdatingFromPropsRef.current = true
      lastInitialNodesRef.current = initialNodes
      
      // Recalculate reactFlowNodes - ensure all required properties are set
      // CRITICAL: Set hidden: false to prevent React Flow from hiding nodes
      const newReactFlowNodes: Node[] = initialNodes.map((node) => ({
        id: node.id,
        type: 'workflowNode' as const,
        position: node.position || { x: 0, y: 0 },
        data: {
          type: node.type,
          title: node.title,
          code: node.code,
          config: node.config,
          isExecuting: node.isExecuting || isExecuting,
          executionStatus: node.executionStatus,
        },
        selected: false,
        draggable: true,
        selectable: true,
        hidden: false, // Force nodes to be visible - this is the key fix!
      }))
      
      setNodes(newReactFlowNodes)
      
      // Always fit view when nodes change to ensure they're visible
      if (newReactFlowNodes.length > 0 && reactFlowInstance.current) {
        const calculateAndSetViewport = () => {
          if (!reactFlowInstance.current) return
          
          const nodePositions = newReactFlowNodes.map(n => n.position)
          const minX = Math.min(...nodePositions.map(p => p.x))
          const maxX = Math.max(...nodePositions.map(p => p.x))
          const minY = Math.min(...nodePositions.map(p => p.y))
          const maxY = Math.max(...nodePositions.map(p => p.y))
          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2
          
          // Get container dimensions
          const container = document.querySelector('.react-flow') as HTMLElement
          if (!container) return
          
          const containerWidth = container.offsetWidth || 800
          const containerHeight = container.offsetHeight || 600
          
          // Calculate zoom to fit all nodes
          const padding = 100
          const contentWidth = Math.max(maxX - minX, 200) + padding * 2
          const contentHeight = Math.max(maxY - minY, 200) + padding * 2
          const zoomX = containerWidth / contentWidth
          const zoomY = containerHeight / contentHeight
          const zoom = Math.min(zoomX, zoomY, 1.5)
          
          // Calculate viewport transform
          const viewportX = containerWidth / 2 - centerX * zoom
          const viewportY = containerHeight / 2 - centerY * zoom
          
          // Set viewport directly
          reactFlowInstance.current.setViewport({ x: viewportX, y: viewportY, zoom }, { duration: 0 })
          
          // Force all nodes visible immediately
          requestAnimationFrame(() => {
            document.querySelectorAll('.react-flow__node').forEach((node) => {
              const el = node as HTMLElement
              el.style.setProperty('visibility', 'visible', 'important')
            })
          })
        }
        
        setTimeout(calculateAndSetViewport, 50)
        setTimeout(calculateAndSetViewport, 200)
        setTimeout(calculateAndSetViewport, 500)
        setTimeout(calculateAndSetViewport, 1000)
      }
      
      // Reset flag after update
      setTimeout(() => {
        isUpdatingFromPropsRef.current = false
      }, 100)
    }
  }, [initialNodes, isExecuting])

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
      // Ignore changes if we're currently updating from props to prevent infinite loop
      if (isUpdatingFromPropsRef.current) {
        return
      }
      
      // Filter out 'select' changes as they don't need to update parent state
      const meaningfulChanges = changes.filter((change: any) => 
        change.type === 'position' || change.type === 'remove' || change.type === 'add'
      )
      
      if (meaningfulChanges.length === 0) {
        return
      }
      
      setNodes((nds) => {
        let updatedNodes = [...nds]
        meaningfulChanges.forEach((change: any) => {
          if (change.type === 'position' && change.position) {
            updatedNodes = updatedNodes.map((node) =>
              node.id === change.id ? { ...node, position: change.position, hidden: false } : { ...node, hidden: false }
            )
          } else if (change.type === 'remove') {
            updatedNodes = updatedNodes.filter((node) => node.id !== change.id)
          } else if (change.type === 'add' && change.item) {
            updatedNodes.push({ ...change.item, hidden: false })
          }
        })
        // Ensure all nodes have hidden: false
        updatedNodes = updatedNodes.map(node => ({ ...node, hidden: false }))
        // Notify parent of meaningful changes
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

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance
    
    // Immediately set viewport to center on nodes BEFORE React Flow calculates visibility
    if (nodes.length > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const nodePositions = nodes.map(n => n.position)
          if (nodePositions.length === 0) return
          
          const minX = Math.min(...nodePositions.map(p => p.x))
          const maxX = Math.max(...nodePositions.map(p => p.x))
          const minY = Math.min(...nodePositions.map(p => p.y))
          const maxY = Math.max(...nodePositions.map(p => p.y))
          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2
          
          const container = document.querySelector('.react-flow') as HTMLElement
          if (!container) return
          
          const containerWidth = container.offsetWidth || 800
          const containerHeight = container.offsetHeight || 600
          
          const padding = 100
          const contentWidth = Math.max(maxX - minX, 200) + padding * 2
          const contentHeight = Math.max(maxY - minY, 200) + padding * 2
          const zoomX = containerWidth / contentWidth
          const zoomY = containerHeight / contentHeight
          const zoom = Math.min(zoomX, zoomY, 1.5, 1.0) // Cap at 1.0 to ensure nodes are visible
          
          const viewportX = containerWidth / 2 - centerX * zoom
          const viewportY = containerHeight / 2 - centerY * zoom
          
          // Set viewport BEFORE React Flow tries to calculate visibility
          instance.setViewport({ x: viewportX, y: viewportY, zoom }, { duration: 0 })
        })
      })
    }
  }, [nodes])

  // Inject a style tag to force visibility with maximum specificity
  // Use attribute selectors to target inline styles directly
  useEffect(() => {
    // Remove any existing style tag we created
    const existingStyle = document.getElementById('react-flow-force-visible')
    if (existingStyle) {
      existingStyle.remove()
    }
    
    // Create a style tag that targets nodes with inline visibility: hidden
    // This uses attribute selectors which have higher specificity
    const style = document.createElement('style')
    style.id = 'react-flow-force-visible'
    style.textContent = `
      /* Force all React Flow nodes to be visible - use attribute selectors for inline styles */
      .react-flow__node[style*="visibility"],
      .react-flow__node[style*="visibility: hidden"],
      .react-flow__node[style*="visibility:hidden"],
      .react-flow__nodes .react-flow__node,
      .react-flow__pane .react-flow__node,
      .react-flow__viewport .react-flow__node,
      .react-flow__renderer .react-flow__node,
      .react-flow .react-flow__node,
      div.react-flow__node {
        visibility: visible !important;
      }
      
      /* Target by data attributes with inline styles */
      [data-id].react-flow__node[style],
      [data-testid*="rf__node"][style] {
        visibility: visible !important;
      }
    `
    // Insert at the beginning of head to ensure it loads first
    document.head.insertBefore(style, document.head.firstChild)
    
    return () => {
      const styleToRemove = document.getElementById('react-flow-force-visible')
      if (styleToRemove) {
        styleToRemove.remove()
      }
    }
  }, [])

  // Simple, single-pass visibility fix - no constant checking
  useEffect(() => {
    if (nodes.length === 0) return
    
    // Wait for React Flow to render, then fix visibility once
    const fixVisibility = () => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.react-flow__node').forEach((node) => {
          const el = node as HTMLElement
          // Use CSS custom property to override inline style
          el.style.setProperty('visibility', 'visible', 'important')
        })
      })
    }
    
    // Fix after a short delay to let React Flow render
    const timeout = setTimeout(fixVisibility, 100)
    
    return () => clearTimeout(timeout)
  }, [nodes.length])

  // Ensure all nodes have hidden: false before passing to ReactFlow
  const visibleNodes = useMemo(() => {
    return nodes.map(node => ({ ...node, hidden: false }))
  }, [nodes])

  return (
    <div className="w-full h-full" style={{ minHeight: '600px', position: 'relative', height: '100%', width: '100%' }}>
      <ReactFlow
        style={{ width: '100%', height: '100%' }}
        nodes={visibleNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickInternal}
        onInit={onInit}
        nodeTypes={getNodeTypes()}
        edgeTypes={getEdgeTypes()}
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView={false}
        onlyRenderVisibleElements={false}
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
