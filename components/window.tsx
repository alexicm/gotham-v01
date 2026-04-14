'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Minus, Maximize2 } from 'lucide-react'

interface WindowProps {
  id: string
  title: string
  children: React.ReactNode
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onFocus: () => void
  onPositionChange: (x: number, y: number) => void
  onSizeChange: (width: number, height: number) => void
}

export function Window({
  title,
  children,
  x,
  y,
  width,
  height,
  zIndex,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onPositionChange,
  onSizeChange,
}: WindowProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y
        onPositionChange(newX, newY)
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y
        const newWidth = Math.max(400, resizeStart.width + deltaX)
        const newHeight = Math.max(300, resizeStart.height + deltaY)
        onSizeChange(newWidth, newHeight)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart, onPositionChange, onSizeChange])

  const handleMouseDownTitle = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - x,
      y: e.clientY - y,
    })
    onFocus()
  }

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width,
      height,
    })
  }

  return (
    <div
      ref={windowRef}
      className="absolute bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden flex flex-col"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex,
      }}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div
        className="bg-[#f5f1e8] border-b border-gray-300 px-4 py-2 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDownTitle}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="w-6 h-6 rounded-full bg-[#fbbf24] hover:bg-[#f59e0b] flex items-center justify-center transition-colors"
            aria-label="Minimize"
          >
            <Minus className="w-3 h-3 text-gray-800" />
          </button>
          <button
            onClick={onMaximize}
            className="w-6 h-6 rounded-full bg-[#10b981] hover:bg-[#059669] flex items-center justify-center transition-colors"
            aria-label="Maximize"
          >
            <Maximize2 className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-[#ef4444] hover:bg-[#dc2626] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto bg-white">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleMouseDownResize}
      >
        <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-gray-400"></div>
      </div>
    </div>
  )
}
