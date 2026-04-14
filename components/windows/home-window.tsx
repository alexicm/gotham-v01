'use client'

export function HomeWindow() {
  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center gap-4 text-sm">
        <div className="flex gap-2">
          <button className="px-3 py-1 hover:bg-gray-200 rounded">Zoom</button>
        </div>
        <div className="flex gap-1">
          <button className="px-2 py-1 hover:bg-gray-200 rounded font-bold">B</button>
          <button className="px-2 py-1 hover:bg-gray-200 rounded italic">I</button>
          <button className="px-2 py-1 hover:bg-gray-200 rounded underline">U</button>
        </div>
        <button className="px-3 py-1 hover:bg-gray-200 rounded">Font</button>
        <div className="ml-auto">
          <button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-semibold px-4 py-1 rounded">
            Get started - free
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
            <h1 className="text-4xl font-bold text-gray-900">OpenHog</h1>
          </div>

          <p className="text-xl text-gray-700 mb-8">
            You like PostHog&apos;s OS-theme? Use this template to create one for yourself. 
            Whether it&apos;s a website for your product or a personal portfolio, 
            an OS-themed app is really dope to see.
          </p>

          <div className="flex gap-4 mb-6">
            <button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-semibold px-6 py-2 rounded">
              Get started - free
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-6 py-2 rounded">
              Install with AI
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-12">
            Questions? <a href="#" className="underline font-semibold">Watch a demo</a> or <a href="#" className="underline font-semibold">talk to a human</a>
          </p>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Explore apps <span className="text-sm font-normal text-gray-600">by company stage</span>
              </h2>
              <a href="#" className="text-sm font-semibold underline">Browse app library (34)</a>
            </div>

            <div className="flex gap-2 mb-6 text-sm">
              <button className="px-4 py-2 bg-gray-200 rounded font-medium">Startup / Side project</button>
              <button className="px-4 py-2 hover:bg-gray-100 rounded">Growth</button>
              <button className="px-4 py-2 hover:bg-gray-100 rounded">Scale</button>
            </div>

            <div className="bg-[#fbbf24] rounded-lg p-6 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">▶</div>
                    <h3 className="text-2xl font-bold">Session Replay</h3>
                  </div>
                  <p className="text-gray-800">Watch people use your product</p>
                </div>
                <button className="bg-white hover:bg-gray-100 px-6 py-2 rounded font-semibold">
                  Explore
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                  <span className="font-semibold">Web Analytics</span>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  <span className="font-semibold">Product Analytics</span>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-red-500 rounded"></div>
                  <span className="font-semibold">Error Tracking</span>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-purple-500 rounded"></div>
                  <span className="font-semibold">Experiments</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{"Who's using OpenHog?"}</h2>
            <p className="text-gray-700">Trusted by thousands of product teams worldwide</p>
          </div>
        </div>
      </div>
    </div>
  )
}
