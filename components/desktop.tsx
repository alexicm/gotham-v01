'use client'

import { useState } from 'react'
import { DesktopIcon } from './desktop-icon'
import { Window } from './window'
import { HomeWindow } from './windows/home-window'
import { DocumentationWindow } from './windows/documentation-window'
import { PricingWindow } from './windows/pricing-window'
import { RoadmapWindow } from './windows/roadmap-window'
import { UpdateWindow } from './windows/update-window'
import { TerminalWindow } from './windows/terminal-window'
import { FileText, Package, Calculator, Video, HelpCircle, LogIn, Lightbulb, Briefcase, Trash2, RefreshCw, Terminal } from 'lucide-react'

interface OpenWindow {
  id: string
  title: string
  component: React.ReactNode
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMinimized: boolean
}

export function Desktop() {
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([])
  const [nextZIndex, setNextZIndex] = useState(10)
  const [backgroundColor, setBackgroundColor] = useState('#d4c4a8')

  const bgColorMap: Record<string, string> = {
    beige: '#d4c4a8',
    blue: '#3b82f6',
    red: '#ef4444'
  }

  const handleBackgroundChange = (color: string) => {
    setBackgroundColor(bgColorMap[color] || '#d4c4a8')
  }

  const leftIcons = [
    { id: 'home', label: 'home.mdx', icon: FileText, component: <HomeWindow /> },
    { id: 'product', label: 'Product OS', icon: Package, component: <div className="p-6">Product OS Content</div> },
    { id: 'pricing', label: 'Pricing', icon: Calculator, component: <PricingWindow /> },
    { id: 'demo', label: 'demo.mov', icon: Video, component: <div className="p-6">Demo Video</div> },
    { id: 'question', label: 'Ask a question', icon: HelpCircle, component: <div className="p-6">Q&A Form</div> },
    { id: 'signup', label: 'Sign up →', icon: LogIn, component: <div className="p-6">Sign Up Form</div> },
  ]

  const rightIcons = [
    { id: 'why', label: 'Why OpenHog?', icon: Lightbulb, component: <div className="p-6">Why OpenHog Content</div> },
    { id: 'work', label: 'Work here', icon: Briefcase, component: <div className="p-6">Careers Content</div> },
    { id: 'terminal', label: 'Terminal', icon: Terminal, component: <TerminalWindow onBackgroundChange={handleBackgroundChange} /> },
    { id: 'update', label: 'Update OS', icon: RefreshCw, component: <UpdateWindow /> },
    { id: 'trash', label: 'Trash', icon: Trash2, component: <div className="p-6">Trash (Empty)</div> },
  ]

  const openWindow = (id: string, title: string, component: React.ReactNode) => {
    const existingWindow = openWindows.find(w => w.id === id)
    if (existingWindow) {
      setOpenWindows(prev => prev.map(w => 
        w.id === id 
          ? { ...w, zIndex: nextZIndex, isMinimized: false }
          : w
      ))
      setNextZIndex(prev => prev + 1)
      return
    }

    const newWindow: OpenWindow = {
      id,
      title,
      component,
      x: 100 + openWindows.length * 30,
      y: 60 + openWindows.length * 30,
      width: 800,
      height: 600,
      zIndex: nextZIndex,
      isMinimized: false,
    }
    setOpenWindows(prev => [...prev, newWindow])
    setNextZIndex(prev => prev + 1)
  }

  const closeWindow = (id: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id))
  }

  const minimizeWindow = (id: string) => {
    setOpenWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMinimized: true } : w
    ))
  }

  const maximizeWindow = (id: string) => {
    setOpenWindows(prev => prev.map(w => 
      w.id === id 
        ? { ...w, x: 0, y: 32, width: window.innerWidth, height: window.innerHeight - 80, zIndex: nextZIndex }
        : w
    ))
    setNextZIndex(prev => prev + 1)
  }

  const bringToFront = (id: string) => {
    setOpenWindows(prev => prev.map(w => 
      w.id === id ? { ...w, zIndex: nextZIndex } : w
    ))
    setNextZIndex(prev => prev + 1)
  }

  const updateWindowPosition = (id: string, x: number, y: number) => {
    setOpenWindows(prev => prev.map(w => 
      w.id === id ? { ...w, x, y } : w
    ))
  }

  const updateWindowSize = (id: string, width: number, height: number) => {
    setOpenWindows(prev => prev.map(w => 
      w.id === id ? { ...w, width, height } : w
    ))
  }

  return (
    <>
      {/* Desktop Background */}
      <div className="fixed inset-0 overflow-hidden transition-colors duration-500" style={{
        backgroundColor,
        backgroundImage: backgroundColor === bgColorMap.beige ? `
          repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.03) 0px,
            transparent 1px,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 3px
          ),
          repeating-linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.03) 0px,
            transparent 1px,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 3px
          )
        ` : 'none'
      }}>
        {/* Top Menu Bar */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-[#f5f1e8] border-b border-[#a89968] flex items-center px-4 gap-4 text-sm font-medium text-gray-800 z-50">
          <div className="flex items-center gap-2">
            <div className="font-bold">OpenHog</div>
          </div>
          <div className="flex gap-3">
            <button className="hover:bg-[#e5dcc8] px-2 py-1 rounded">Product OS</button>
            <button className="hover:bg-[#e5dcc8] px-2 py-1 rounded">Pricing</button>
            <button className="hover:bg-[#e5dcc8] px-2 py-1 rounded">Docs</button>
            <button className="hover:bg-[#e5dcc8] px-2 py-1 rounded">Community</button>
            <button className="hover:bg-[#e5dcc8] px-2 py-1 rounded">Company</button>
            <button className="hover:bg-[#e5dcc8] px-2 py-1 rounded">More</button>
          </div>
          <div className="ml-auto">
            <button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-semibold px-4 py-1 rounded">
              Get started — free
            </button>
          </div>
        </div>

        {/* Left Desktop Icons */}
        <div className="absolute left-4 top-12 flex flex-col gap-4 z-0">
          {leftIcons.map((icon) => (
            <DesktopIcon
              key={icon.id}
              label={icon.label}
              icon={icon.icon}
              onClick={() => openWindow(icon.id, icon.label, icon.component)}
            />
          ))}
        </div>

        {/* Right Desktop Icons */}
        <div className="absolute right-4 top-12 flex flex-col gap-4 z-0">
          {rightIcons.map((icon) => (
            <DesktopIcon
              key={icon.id}
              label={icon.label}
              icon={icon.icon}
              onClick={() => openWindow(icon.id, icon.label, icon.component)}
            />
          ))}
        </div>

        {/* Open Windows */}
        {openWindows.map((window) => (
          !window.isMinimized && (
            <Window
              key={window.id}
              id={window.id}
              title={window.title}
              x={window.x}
              y={window.y}
              width={window.width}
              height={window.height}
              zIndex={window.zIndex}
              onClose={() => closeWindow(window.id)}
              onMinimize={() => minimizeWindow(window.id)}
              onMaximize={() => maximizeWindow(window.id)}
              onFocus={() => bringToFront(window.id)}
              onPositionChange={(x, y) => updateWindowPosition(window.id, x, y)}
              onSizeChange={(width, height) => updateWindowSize(window.id, width, height)}
            >
              {window.component}
            </Window>
          )
        ))}

        {/* Taskbar */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#f5f1e8] border-t border-[#a89968] flex items-center px-4 gap-2 z-40">
          {openWindows.map((window) => (
            <button
              key={window.id}
              onClick={() => {
                if (window.isMinimized) {
                  setOpenWindows(prev => prev.map(w => 
                    w.id === window.id 
                      ? { ...w, isMinimized: false, zIndex: nextZIndex }
                      : w
                  ))
                  setNextZIndex(prev => prev + 1)
                } else {
                  bringToFront(window.id)
                }
              }}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                window.isMinimized 
                  ? 'bg-[#e5dcc8] text-gray-600' 
                  : 'bg-[#d4c4a8] text-gray-800'
              } hover:bg-[#c4b49a]`}
            >
              {window.title}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
