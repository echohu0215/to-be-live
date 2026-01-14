'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase";
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mounted, setMounted] = useState(false)

  const supabase = createClient()

  // 处理 Hydration 匹配问题
  useEffect(() => setMounted(true), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/') 
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('验证邮件已发送，请查收！')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col items-center justify-center p-6 transition-colors duration-500">
      
      {/* 绝对定位的主题切换按钮 */}
      <div className="absolute top-8 right-8">
        <ThemeToggle />
      </div>

      {/* 顶部 Logo 区 */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12 text-center"
      >
        <div className="
          w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-[1.5rem]
          bg-app-card border border-app-border
          shadow-[0_10px_25px_rgba(0,0,0,0.05)] 
          dark:shadow-[0_0_30px_var(--app-accent-glow)]
          transition-all duration-500
        ">
          <ShieldCheck 
            size={40} 
            strokeWidth={1.5}
            className="text-app-accent transition-colors duration-500" 
            // 增加内部填充感
            fill="currentColor" 
            fillOpacity={0.1} 
          />
        </div>
        <h1 className="text-2xl font-black tracking-tighter italic text-app-text">TO BE LIVE.</h1>
        <p className="opacity-40 text-xs mt-2 font-mono tracking-widest uppercase">守护你的每一份安全</p>
      </motion.div>

      {/* 登录卡片 */}
      <motion.div 
        layout
        className="w-full max-w-sm bg-app-card border border-app-border p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-none backdrop-blur-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* 邮箱输入 */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 
      transition-all duration-300
      text-app-text opacity-20 
      group-focus-within:opacity-100 
      group-focus-within:text-app-accent" size={18} />
              <input 
                type="email" 
                required
                placeholder="你的邮箱地址"
                className="w-full bg-app-bg border border-app-border rounded-2xl py-4 pl-12 pr-4 focus:ring-1 focus:ring-app-accent transition-all outline-none text-app-text"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* 密码输入 */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-app-accent transition-all" size={18} />
              <input 
                type="password" 
                required
                placeholder="密码"
                className="w-full bg-app-bg border border-app-border rounded-2xl py-4 pl-12 pr-4 focus:ring-1 focus:ring-app-accent transition-all outline-none text-app-text"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="
              w-full 
              bg-app-accent text-white dark:text-black 
              font-bold py-4 rounded-2xl 
              flex items-center justify-center gap-2 
              active:scale-[0.97] transition-all 
              disabled:opacity-50 
              shadow-[0_10px_20px_var(--app-accent-glow)]
            "
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="tracking-wide">{isLogin ? '立即登录' : '创建账户'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* 切换按钮 */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="opacity-40 text-sm hover:opacity-100 hover:text-app-accent transition-all font-medium"
          >
            {isLogin ? "没有账户？点击注册" : "已有账户？立即登录"}
          </button>
        </div>
      </motion.div>

      {/* 底部装饰文本 */}
      <footer className="mt-12">
        <p className="text-[10px] opacity-20 tracking-[0.2em] font-mono uppercase text-center leading-relaxed">
          Secure Encryption<br/>Protocol v2.6.0
        </p>
      </footer>
    </div>
  )
}
