'use client'

import { useState, useEffect } from 'react'
import { Download, PlusSquare, Share } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 1. 检查是否是 iOS (iOS 浏览器不支持自动弹出安装窗口，需手动引导)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(isIOSDevice)

    // 2. 监听 Android/Chrome 的安装事件
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsVisible(true) // 只有当还没安装时才显示
    }

    window.addEventListener('beforeinstallprompt', handler)
    
    // 如果是 iOS 且不在全屏模式，也可以显示手动引导
    if (isIOSDevice && !window.navigator.standalone) {
      setIsVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    
    deferredPrompt.prompt() // 弹出安装确认框
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsVisible(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-6 right-6 z-[60] bg-app-card border border-app-accent/30 p-4 rounded-2xl shadow-2xl"
        onClick={handleClose} // 点击整个容器关闭
      >
        <motion.div 
          className="bg-app-card border border-app-accent/30 p-4 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()} // 阻止事件冒泡，点击内部内容不关闭
        >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-app-accent/10 p-2 rounded-lg">
              <Download size={20} className="text-app-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">添加到桌面</p>
              <p className="text-[10px] opacity-50">像真正的 App 一样守护你</p>
            </div>
          </div>

          {isIOS ? (
            // iOS 手动引导提示
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1 text-[10px] bg-app-bg px-3 py-2 rounded-xl border border-app-border">
                <span>必须使用 Safari 浏览器打开</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] bg-app-bg px-3 py-2 rounded-xl border border-app-border">
                点击 <Share size={12} /> 然后 <PlusSquare size={12} /> "添加到主屏幕"
                </div>
            </div>
          ) : (
            // Android/Chrome 自动安装按钮
            <button 
              onClick={handleInstallClick}
              className="bg-app-accent text-white dark:text-black text-xs font-bold px-4 py-2 rounded-xl"
            >
              立即安装
            </button>
          )}
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
