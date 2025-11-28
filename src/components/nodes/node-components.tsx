'use client'

import React, { useRef, useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { ClassicPreset as Classic } from 'rete'

interface NodeProps {
  data: any
  emit: (data: any) => void
}

export function StartNodeComponent({ data }: NodeProps) {
  return (
    <div className="node start-node">
      <div className="title start-title">
        <input 
          className="bg-transparent text-white w-full text-center border-none outline-none"
          defaultValue={data.title || 'Start'}
          onChange={(e) => data.title = e.target.value}
        />
      </div>
      <div className="outputs">
        <div className="output">
          <div className="socket"></div>
        </div>
      </div>
    </div>
  )
}

export function EndNodeComponent({ data }: NodeProps) {
  return (
    <div className="node end-node">
      <div className="title end-title">
        <input 
          className="bg-transparent text-white w-full text-center border-none outline-none"
          defaultValue={data.title || 'End'}
          onChange={(e) => data.title = e.target.value}
        />
      </div>
      <div className="inputs">
        <div className="input">
          <div className="socket"></div>
        </div>
      </div>
    </div>
  )
}

interface CodeNodeProps extends NodeProps {
  language: 'python' | 'typescript'
}

export function CodeNodeComponent({ data, language }: CodeNodeProps) {
  const [code, setCode] = useState(data.code || (
    language === 'python' 
      ? 'def run(input):\n    return input'
      : 'async function run(input: any): Promise<any> {\n    return input;\n}'
  ))

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      data.code = value
    }
  }

  const titleClass = language === 'python' ? 'python-title' : 'typescript-title'

  return (
    <div className="node code-node">
      <div className={`title ${titleClass}`}>
        <input 
          className="bg-transparent text-white w-full text-center border-none outline-none"
          defaultValue={data.title || `${language === 'python' ? 'Python' : 'TypeScript'} Code`}
          onChange={(e) => data.title = e.target.value}
        />
      </div>
      
      <div className="inputs">
        <div className="input">
          <div className="socket"></div>
        </div>
      </div>

      <div className="code-editor" style={{ height: '200px', margin: '8px 0' }}>
        <Editor
          height="200px"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </div>

      <div className="outputs">
        <div className="output">
          <div className="socket"></div>
        </div>
      </div>
    </div>
  )
}

export function PythonNodeComponent(props: NodeProps) {
  return <CodeNodeComponent {...props} language="python" />
}

export function TypeScriptNodeComponent(props: NodeProps) {
  return <CodeNodeComponent {...props} language="typescript" />
}

export const nodeComponents = {
  start: StartNodeComponent,
  end: EndNodeComponent,
  python: PythonNodeComponent,
  typescript: TypeScriptNodeComponent,
}