'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Check, Download, Settings, Zap } from 'lucide-react'

export function UpdateWindow() {
  const [stage, setStage] = useState<'checking' | 'downloading' | 'installing' | 'complete'>('checking')
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')

  const files = [
    'system.core.dll',
    'ui.framework.pkg',
    'security.patch.exe',
    'network.drivers.sys',
    'graphics.renderer.bin',
    'audio.codec.dll',
    'kernel.update.img',
    'bootloader.cfg',
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (stage === 'checking') {
      // Checking for updates phase
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setStage('downloading')
            return 0
          }
          return prev + 2
        })
      }, 50)
    } else if (stage === 'downloading') {
      // Downloading phase with file names
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setStage('installing')
            return 0
          }
          const newProgress = prev + 1
          if (newProgress % 12 === 0) {
            const fileIndex = Math.floor((newProgress / 100) * files.length)
            setCurrentFile(files[fileIndex] || files[files.length - 1])
          }
          return newProgress
        })
      }, 80)
    } else if (stage === 'installing') {
      // Installing phase
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setStage('complete')
            return 100
          }
          const newProgress = prev + 0.8
          if (Math.floor(newProgress) % 15 === 0) {
            const fileIndex = Math.floor((newProgress / 100) * files.length)
            setCurrentFile(files[fileIndex] || files[files.length - 1])
          }
          return newProgress
        })
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [stage])

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-12">
      <div className="w-full max-w-2xl">
        {/* Logo/Icon Area */}
        <div className="flex justify-center mb-8">
          {stage === 'complete' ? (
            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center animate-in zoom-in duration-500">
              <Check className="w-14 h-14 text-white" strokeWidth={3} />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center relative">
              <RefreshCw 
                className="w-12 h-12 text-white animate-spin" 
                style={{ animationDuration: '2s' }}
              />
              <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-ping opacity-20"></div>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center mb-8">
          {stage === 'checking' && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Checking for updates</h2>
              <p className="text-gray-600">Scanning for available system updates...</p>
            </>
          )}
          {stage === 'downloading' && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Downloading updates</h2>
              <p className="text-gray-600">This may take a few minutes</p>
            </>
          )}
          {stage === 'installing' && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Installing updates</h2>
              <p className="text-gray-600">Don't turn off your computer</p>
            </>
          )}
          {stage === 'complete' && (
            <>
              <h2 className="text-3xl font-bold text-green-600 mb-2">Update complete!</h2>
              <p className="text-gray-600">Your system is up to date</p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {stage !== 'complete' && (
          <div className="mb-6">
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-700">{Math.floor(progress)}%</span>
              {currentFile && (
                <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                  {stage === 'downloading' ? <Download className="w-3 h-3" /> : <Settings className="w-3 h-3 animate-spin" />}
                  {currentFile}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stage Indicators */}
        <div className="flex justify-center gap-8 mt-8">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              stage === 'checking' ? 'bg-blue-600 scale-110' : 
              ['downloading', 'installing', 'complete'].includes(stage) ? 'bg-green-500' : 
              'bg-gray-300'
            }`}>
              <RefreshCw className={`w-6 h-6 text-white ${stage === 'checking' ? 'animate-spin' : ''}`} />
            </div>
            <span className={`text-xs font-medium ${stage === 'checking' ? 'text-blue-600' : 'text-gray-600'}`}>
              Checking
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              stage === 'downloading' ? 'bg-blue-600 scale-110' : 
              ['installing', 'complete'].includes(stage) ? 'bg-green-500' : 
              'bg-gray-300'
            }`}>
              <Download className={`w-6 h-6 text-white ${stage === 'downloading' ? 'animate-bounce' : ''}`} />
            </div>
            <span className={`text-xs font-medium ${stage === 'downloading' ? 'text-blue-600' : 'text-gray-600'}`}>
              Downloading
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              stage === 'installing' ? 'bg-blue-600 scale-110' : 
              stage === 'complete' ? 'bg-green-500' : 
              'bg-gray-300'
            }`}>
              <Zap className={`w-6 h-6 text-white ${stage === 'installing' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-medium ${stage === 'installing' ? 'text-blue-600' : 'text-gray-600'}`}>
              Installing
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              stage === 'complete' ? 'bg-green-500 scale-110' : 'bg-gray-300'
            }`}>
              <Check className={`w-6 h-6 text-white ${stage === 'complete' ? 'animate-pulse' : ''}`} />
            </div>
            <span className={`text-xs font-medium ${stage === 'complete' ? 'text-green-600' : 'text-gray-600'}`}>
              Complete
            </span>
          </div>
        </div>

        {/* Fun Facts */}
        {stage !== 'complete' && (
          <div className="mt-12 p-6 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 text-center italic">
              {stage === 'checking' && "💡 Did you know? Regular updates keep your system secure and running smoothly!"}
              {stage === 'downloading' && "💡 Pro tip: Updates include performance improvements and new features!"}
              {stage === 'installing' && "💡 Fun fact: System updates can make your computer faster and more stable!"}
            </p>
          </div>
        )}

        {/* Completion Message */}
        {stage === 'complete' && (
          <div className="mt-8 p-6 bg-green-50 rounded-lg border-2 border-green-200 animate-in slide-in-from-bottom duration-500">
            <p className="text-center text-green-800 font-medium">
              All updates have been successfully installed. Your system is now running the latest version.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
