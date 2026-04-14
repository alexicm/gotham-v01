'use client'

import { Search, Wrench, Box, FileCode, Code, Star, Sparkles, Zap } from 'lucide-react'

export function DocumentationWindow() {
  return (
    <div className="flex flex-col h-full">
      {/* Header with Isometric Illustration */}
      <div className="relative bg-gradient-to-r from-orange-800 to-orange-900 h-48 flex items-center justify-center overflow-hidden">
        <img 
          src="/placeholder.svg?height=200&width=1200" 
          alt="Office illustration"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <h1 className="relative text-4xl font-bold text-white z-10">Documentation</h1>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search the docs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {/* Integration Section */}
          <div className="mb-8">
            <button className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-800 hover:text-gray-600">
              <span>▼</span> Integration
            </button>
            <div className="grid grid-cols-5 gap-4">
              {[
                { icon: Wrench, label: 'Install and configure' },
                { icon: Box, label: 'SDKs' },
                { icon: FileCode, label: 'Frameworks' },
                { icon: Code, label: 'API' },
                { icon: Star, label: 'Advanced' },
              ].map((item, i) => (
                <button key={i} className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-colors">
                  <item.icon className="w-8 h-8 text-gray-600" />
                  <span className="text-sm text-center text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Platform Section */}
          <div className="mb-8">
            <button className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-800 hover:text-gray-600">
              <span>▼</span> AI platform
            </button>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Sparkles, label: 'OpenHog AI', color: 'bg-gray-100' },
                { icon: Box, label: 'MCP', color: 'bg-blue-100' },
                { icon: Zap, label: 'AI wizard', color: 'bg-purple-100' },
                { icon: Code, label: 'AI engineering', color: 'bg-orange-100' },
              ].map((item, i) => (
                <button key={i} className={`flex flex-col items-center gap-2 p-4 ${item.color} rounded-lg hover:opacity-80 transition-opacity`}>
                  <item.icon className="w-8 h-8 text-gray-700" />
                  <span className="text-sm text-center text-gray-800 font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold mb-3">About our docs</h3>
            <p className="text-gray-700 mb-4">There are a few ways to explore our docs:</p>
            
            <div className="mb-4">
              <h4 className="font-semibold mb-2">On our website <span className="text-gray-500">(You are here)</span></h4>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Ask OpenHog AI</strong>, our trusty AI chatbot. Start a chat on any docs page and OpenHog AI will have the relevant context.
              </p>
              <p className="text-sm text-gray-600">
                Search with the 🔍 icon at the top right.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">In the product</h4>
              <p className="text-sm text-gray-600 mb-2">
                Look for tooltips that link to docs - they open right inside the product.
              </p>
              <p className="text-sm text-gray-600">
                Ask OpenHog AI in the product.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
