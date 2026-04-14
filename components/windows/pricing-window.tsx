'use client'

import { Check } from 'lucide-react'

export function PricingWindow() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Side - Pricing Card */}
      <div className="w-1/2 p-8 overflow-auto bg-white">
        <img 
          src="/placeholder.svg?height=300&width=400" 
          alt="Product mockup"
          className="w-full mb-6 rounded-lg"
        />
        
        <div className="flex gap-4 mb-4">
          {['Session Replay', 'Web Analytics', 'Product Analytics'].map((product, i) => (
            <div key={i} className="flex-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 text-white text-center text-sm font-semibold">
              {product}
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600 italic text-center">
          *OpenHog {"doesn't"} really come on a physical CD. (If you {"don't"} know what a CD is, please ask your parents.)
        </p>
      </div>

      {/* Right Side - Pricing Details */}
      <div className="w-1/2 p-8 overflow-auto bg-gray-50 border-l border-gray-200">
        <h1 className="text-3xl font-bold mb-4">OpenHog Cloud</h1>
        <p className="text-gray-700 mb-6">
          OpenHog is designed to grow with you. Our <strong>10+ products</strong> (and counting) will take you from idea to product-market fit to IPO and beyond. 🚀
        </p>

        <p className="text-gray-700 mb-6">
          Our generous free tier means <strong>more than 90% of companies use OpenHog for free.</strong> Only add a card if you need more than the free tier limits, advanced features, or want more projects. You still keep the same monthly free volume, even after upgrading.
        </p>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Free</h2>
            <button className="text-sm font-semibold underline">Compare plans</button>
          </div>
          <p className="text-sm text-gray-600 mb-4">No credit card required</p>

          <div className="border-2 border-[#fbbf24] rounded-lg p-4 mb-4">
            <div className="text-xl font-bold mb-2">Free</div>
            <div className="text-sm text-gray-600 mb-4">Free - no credit card required</div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="text-xl font-bold mb-2">Pay-as-you-go</div>
            <div className="text-sm text-gray-600">Usage-based pricing</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm">Generous <strong>monthly free tier</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm">Community support</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm">1 project, 1-year data retention</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm">Unlimited team members</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Cloud region</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="border-2 border-[#fbbf24] bg-[#fef3c7] rounded-lg p-3 text-left font-medium">
                US (Virginia)
              </button>
              <button className="border border-gray-200 rounded-lg p-3 text-left hover:border-gray-400">
                EU (Frankfurt)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
