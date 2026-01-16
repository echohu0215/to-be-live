"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  Shield,
  Mail,
  LogOut,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Clock
} from "lucide-react";
import { toast } from 'sonner';

export default function ToBeLiveApp() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [timeLeft, setTimeLeft] = useState({ h: 48, m: 0, s: 0, percent: 100 })
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false); // 专门用于签到按钮

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          if (!error) {
            setProfile(data);
            setNewEmail(data.emergency_email || "");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [supabase]);

  const updateEmergencyEmail = async () => {
    if (!newEmail.includes("@")) {
      toast.warning("格式错误", { description: "请输入有效的邮箱地址" });
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase.from("profiles").update({ emergency_email: newEmail }).eq("id", user.id);
    if (!error) {
      setProfile({ ...profile, emergency_email: newEmail });
      setIsSettingsOpen(false);
    } else {
      toast.error("更新失败");
    }
    setIsUpdating(false);
  };

  const updateCountdown = useCallback(() => {
    if (!profile?.last_check_in) return;
    const last = new Date(profile.last_check_in).getTime();
    const now = new Date().getTime();
    const total = 48 * 60 * 60 * 1000;
    const remaining = Math.max(0, total - (now - last));
    setTimeLeft({
      h: Math.floor(remaining / (1000 * 60 * 60)),
      m: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      s: Math.floor((remaining % (1000 * 60)) / 1000),
      percent: (remaining / total) * 100
    });
  }, [profile]);

  useEffect(() => {
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [updateCountdown]);

  const handleCheckIn = async () => {
    if (!user || isCheckingIn) return; // 使用专属的 loading
    
    setIsCheckingIn(true);
    const now = new Date().toISOString();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          last_check_in: now,
          is_alerted: false 
        })
        .eq('id', user.id);

      if (!error) {
        setProfile((prev) => ({ ...prev, last_check_in: now, is_alerted: false }));
        if ("vibrate" in navigator) navigator.vibrate([50, 30, 50]);

        toast.success("生命体征已确认", {
          description: "守护倒计时已重置",
          duration: 3000,
        });
      } else {
        throw error;
      }
    } catch (err) {
      console.error("签到失败:", err.message);
      toast.error("签到失败", {
        description: "请检查网络连接后重试"
      });
    } finally {
      setIsCheckingIn(false); // 释放专属 loading
    }
};

  // 动态获取当前的强调色（预警系统）
  const getAlertColorClass = () => {
    if (timeLeft.h < 8) return "text-red-500";
    if (timeLeft.h < 24) return "text-amber-500";
    return "text-app-accent"; // 使用主题定义的强调色
  };

  if (loading)
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center text-app-text">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <main className="min-h-screen bg-app-bg text-app-text flex flex-col items-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* 顶部栏 */}
      <div className="w-full flex justify-between items-center mb-12 py-4">
        <h1 className="text-xl tracking-tighter italic font-black">
          TO BE LIVE.
        </h1>
        <div className="flex gap-3">
          <ThemeToggle />
          <button
            onClick={() => supabase.auth.signOut().then(() => location.reload())}
            className="p-2 bg-app-card border border-app-border rounded-xl"
          >
            <LogOut size={18} className="text-app-text opacity-70" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center w-full space-y-12">
        {/* 圆环进度按钮 */}
        <div className="relative mb-12">
          <svg className="w-80 h-80 -rotate-90">
            {/* 底层阴影环 */}
            <circle
              cx="160" cy="160" r="140"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              className="text-app-border opacity-60 dark:opacity-30" 
            />
            
            {/* 动态进度环 */}
            <motion.circle
              cx="160" cy="160" r="140"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="7"
              strokeDasharray="880"
              // 当签到中时，圆环产生一种“扫描”或“充能”的呼吸效果
              animate={{ 
                strokeDashoffset: isCheckingIn ? [880, 440, 880] : (880 - (880 * timeLeft.percent) / 100),
                opacity: isCheckingIn ? [0.4, 1, 0.4] : 1
              }}
              transition={{
                duration: isCheckingIn ? 1.5 : 0.5,
                repeat: isCheckingIn ? Infinity : 0,
                ease: "easeInOut"
              }}
              className={`${getAlertColorClass()} transition-colors duration-1000`}
              strokeLinecap="round"
            />
          </svg>

          <motion.button
            whileTap={{ scale: 0.94 }}
            disabled={isCheckingIn}
            onClick={handleCheckIn}
            className="absolute inset-4 rounded-[4.5rem] bg-app-card border border-app-border flex flex-col items-center justify-center 
                      shadow-[0_15px_40px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden"
          >
            {/* 签到时的遮罩层，增加“同步中”的朦胧感 */}
            <AnimatePresence>
              {isCheckingIn && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-app-accent/5 backdrop-blur-[2px] z-10 flex items-center justify-center"
                >
                  <Loader2 className="animate-spin text-app-accent" size={32} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 图标区域：签到时缩小并变淡 */}
            <motion.div 
              animate={{ 
                scale: isCheckingIn ? 0.8 : 1,
                opacity: isCheckingIn ? 0.3 : 1 
              }}
              className={`mb-4 transition-colors duration-1000 ${getAlertColorClass()}`}
            >
              {timeLeft.h < 8 ? (
                <AlertTriangle size={60} />
              ) : (
                <Shield 
                  size={60} 
                  fill="currentColor" 
                  fillOpacity={0.12} 
                  className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                />
              )}
            </motion.div>
            
            <span className="text-2xl font-black tracking-tight text-app-text">
              {isCheckingIn ? "同步中..." : "我还活着"}
            </span>
            
            <div className="mt-2 font-mono text-[11px] opacity-40 flex items-center gap-1.5 tracking-widest">
              <Clock size={12} strokeWidth={2.5} />
              {String(timeLeft.h).padStart(2, "0")}:
              {String(timeLeft.m).padStart(2, "0")}:
              {String(timeLeft.s).padStart(2, "0")}
            </div>
          </motion.button>
        </div>

        {/* 信息卡片区 */}
        <div className="w-full space-y-4 max-w-sm">
          <div className="bg-app-card border border-app-border p-6 rounded-[2rem] shadow-sm">
            <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest mb-1">
              上次活跃时间
            </p>
            <p className="text-lg font-mono">
              {profile?.last_check_in
                ? new Date(profile.last_check_in).toLocaleString()
                : "等待首次签到"}
            </p>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full bg-app-card border border-app-border p-6 rounded-[2rem] flex items-center justify-between active:scale-[0.98] transition-all shadow-sm"
          >
            <div className="text-left">
              <p className="opacity-40 text-[10px] uppercase font-bold tracking-widest mb-1">
                紧急联系邮箱
              </p>
              <p className="text-lg font-mono italic opacity-70">
                {profile?.emergency_email || "点击设置"}
              </p>
            </div>
            <Mail
              className={profile?.emergency_email ? "text-app-accent" : "opacity-20"}
              size={24}
            />
          </button>
        </div>
      </div>

      {/* 弹窗面板 */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-app-card border-t border-app-border rounded-t-[2.5rem] p-8 z-50 pb-12"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">紧急联系设置</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="bg-app-bg p-2 rounded-full border border-app-border">
                  <X size={20} />
                </button>
              </div>
              <p className="opacity-60 text-sm mb-6">当您超过 48 小时未签到，系统将发送求助信息。</p>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                  <input
                    type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="w-full bg-app-bg border border-app-border rounded-2xl py-4 pl-12 pr-4 focus:ring-1 focus:ring-app-accent outline-none font-mono text-app-text"
                  />
                </div>
                <button
                  onClick={updateEmergencyEmail} disabled={isUpdating}
                  className="w-full bg-app-text text-app-bg font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-95"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <><Check size={18} /> 保存设置</>}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* <footer className="mt-8 mb-4">
        <p className="text-[10px] opacity-30 font-mono tracking-widest uppercase text-center leading-relaxed">
          Secure Encryption Protocol<br/>NODE_ID: 2.6.0-LIVE
        </p>
      </footer> */}
    </main>
  );
}
