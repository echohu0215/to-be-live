'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/') // 登录成功跳转首页
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
      {/* 顶部 Logo 区 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-black" />
        </div>
        <h1 className="text-2xl font-black tracking-tighter italic">DIED LE ME.</h1>
        <p className="text-zinc-500 text-sm mt-1">守护你的每一份平安</p>
      </motion.div>

      {/* 登录卡片 */}
      <motion.div 
        layout
        className="w-full max-w-sm bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] backdrop-blur-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* 邮箱输入 */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email" 
                required
                placeholder="你的邮箱地址"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-1 focus:ring-white transition-all outline-none"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* 密码输入 */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="password" 
                required
                placeholder="密码"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-1 focus:ring-white transition-all outline-none"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                {isLogin ? '立即登录' : '创建账户'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* 切换按钮 */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-zinc-500 text-sm hover:text-white transition-colors"
          >
            {isLogin ? "没有账户？点击注册" : "已有账户？立即登录"}
          </button>
        </div>
      </motion.div>

      <p className="mt-12 text-[10px] text-zinc-700 tracking-widest font-mono uppercase text-center leading-relaxed">
        Secure Encryption<br/>Protocol v2.6.0
      </p>
    </div>
  )
}
