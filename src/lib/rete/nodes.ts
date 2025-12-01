import { ClassicPreset as Classic } from 'rete'

export class StartNode extends Classic.Node {
  constructor() {
    super('Start')
    
    this.addOutput('output', new Classic.Output(socket, 'Output'))
  }
}

export class EndNode extends Classic.Node {
  constructor() {
    super('End')
    
    this.addInput('input', new Classic.Input(socket, 'Input'))
  }
}

export class PythonNode extends Classic.Node {
  public code: string

  constructor(code = 'def run(input):\n    return input') {
    super('Python Code')
    
    this.code = code
    this.addInput('input', new Classic.Input(socket, 'Input'))
    this.addOutput('output', new Classic.Output(socket, 'Output'))
  }
}

export class TypeScriptNode extends Classic.Node {
  public code: string

  constructor(code = 'async function run(input: any): Promise<any> {\n    return input;\n}') {
    super('TypeScript Code')
    
    this.code = code
    this.addInput('input', new Classic.Input(socket, 'Input'))
    this.addOutput('output', new Classic.Output(socket, 'Output'))
  }
}

export const socket = new Classic.Socket('socket')

export type WorkflowNode = StartNode | EndNode | PythonNode | TypeScriptNode

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  python: PythonNode,
  typescript: TypeScriptNode,
} as const