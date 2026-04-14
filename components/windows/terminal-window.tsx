'use client'

import { useState, useRef, useEffect } from 'react'

interface TerminalProps {
  onBackgroundChange: (color: string) => void
}

export function TerminalWindow({ onBackgroundChange }: TerminalProps) {
  const [history, setHistory] = useState<{ type: 'command' | 'output', content: string | React.ReactNode }[]>([
    { type: 'output', content: 'OpenHog Terminal v1.0.0' },
    { type: 'output', content: 'Type "open-hog fetch" or "open-hog change bg" to get started.' },
  ])
  const [currentInput, setCurrentInput] = useState('')
  const [bgColor, setBgColor] = useState('beige')
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  const colors = ['beige', 'blue', 'red']

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    
    // Add command to history
    setHistory(prev => [...prev, { type: 'command', content: `$ ${trimmedCmd}` }])

    if (trimmedCmd === 'open-hog fetch') {
      // Display neofetch-style output
      const fetchOutput = (
        <div className="my-2 flex gap-8">
          <div className="text-purple-400 font-bold leading-tight">
            <pre className="text-2xl">{`
   ██████╗ ██████╗ ███████╗███╗   ██╗
  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║
  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║
  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║
  ╚██████╔╝██║     ███████╗██║ ╚████║
   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝
  ██╗  ██╗ ██████╗  ██████╗ 
  ██║  ██║██╔═══██╗██╔════╝ 
  ███████║██║   ██║██║  ███╗
  ██╔══██║██║   ██║██║   ██║
  ██║  ██║╚██████╔╝╚██████╔╝
  ╚═╝  ╚═╝ ╚═════╝  ╚═════╝
`}</pre>
          </div>
          <div className="text-sm space-y-1 font-mono">
            <div><span className="text-cyan-400">Created by:</span> xy</div>
            <div><span className="text-cyan-400">Built with:</span> v0</div>
            <div><span className="text-cyan-400">Version:</span> 1.0.0</div>
            <div><span className="text-cyan-400">Theme:</span> OS-inspired</div>
            <div><span className="text-cyan-400">Framework:</span> Next.js</div>
            <div><span className="text-cyan-400">Current BG:</span> {bgColor}</div>
            <div className="mt-2 text-gray-400">An OS-themed website template</div>
          </div>
        </div>
      )
      setHistory(prev => [...prev, { type: 'output', content: fetchOutput }])
    } else if (trimmedCmd === 'open-hog change bg') {
      // Cycle through background colors
      const currentIndex = colors.indexOf(bgColor)
      const nextIndex = (currentIndex + 1) % colors.length
      const nextColor = colors[nextIndex]
      setBgColor(nextColor)
      onBackgroundChange(nextColor)
      
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: `Background changed to ${nextColor}` 
      }])
    } else if (trimmedCmd === 'clear') {
      setHistory([])
    } else if (trimmedCmd === 'help') {
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: (
          <div className="space-y-1 font-mono">
            <div className="text-yellow-400 font-bold">Available Commands:</div>
            <div><span className="text-green-400">open-hog fetch</span> - Display OpenHog system info</div>
            <div><span className="text-green-400">open-hog change bg</span> - Change background color</div>
            <div><span className="text-green-400">clear</span> - Clear terminal</div>
            <div><span className="text-green-400">help</span> - Show this help message</div>
          </div>
        )
      }])
    } else if (trimmedCmd) {
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: `Command not found: ${trimmedCmd}. Type "help" for available commands.` 
      }])
    }

    setCurrentInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(currentInput)
    }
  }

  return (
    <div 
      className="h-full bg-gray-900 text-green-400 p-4 overflow-auto font-mono text-sm"
      ref={terminalRef}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="space-y-1 font-mono">
        {history.map((item, index) => (
          <div key={index} className={`font-mono ${item.type === 'command' ? 'text-white' : 'text-gray-300'}`}>
            {item.content}
          </div>
        ))}
        
        {/* Input Line */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-green-400 font-mono">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-white font-mono"
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
