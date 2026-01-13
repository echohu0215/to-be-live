"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Mail,
  LogOut,
  Loader2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

export default function ToBeLiveApp() {
  const [supabase] = useState(() =>
    createClient()
  );

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 控制设置弹窗的状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [timeLeft, setTimeLeft] = useState({ h: 48, m: 0, s: 0, percent: 100 })
  const [isUpdating, setIsUpdating] = useState(false);

  // 初始化数据（保持之前的逻辑）

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);

          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

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

  // 更新紧急联系人函数
  const updateEmergencyEmail = async () => {
    if (!newEmail.includes("@")) {
      alert("请输入有效的邮箱地址");
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ emergency_email: newEmail })
      .eq("id", user.id);

    if (!error) {
      setProfile({ ...profile, emergency_email: newEmail });
      setIsSettingsOpen(false);
      alert("设置成功！");
    } else {
      alert("更新失败，请重试");
    }
    setIsUpdating(false);
  };

  // 2. 核心倒计时逻辑 (基于 48 小时)
  const updateCountdown = useCallback(() => {
    if (!profile?.last_check_in) return;

    const last = new Date(profile.last_check_in).getTime();
    const now = new Date().getTime();
    const diff = now - last;
    const total = 48 * 60 * 60 * 1000; // 48小时毫秒数
    const remaining = Math.max(0, total - diff);

    const h = Math.floor(remaining / (1000 * 60 * 60));
    const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((remaining % (1000 * 60)) / 1000);
    const percent = (remaining / total) * 100;

    setTimeLeft({ h, m, s, percent });
  }, [profile]);

  useEffect(() => {
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [updateCountdown]);

  const handleCheckIn = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ last_check_in: now })
      .eq("id", user.id);
    if (!error) {
      setProfile((prev) => ({ ...prev, last_check_in: now }));
      if ("vibrate" in navigator) navigator.vibrate([50, 30, 50]); // 成功反馈震动
    }
  };

  // 计算颜色主题
  const getThemeColor = () => {
    if (timeLeft.h < 8) return "text-red-500"; // 危险
    if (timeLeft.h < 24) return "text-amber-500"; // 预警
    return "text-green-500"; // 安全
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-6 relative overflow-hidden">
      {/* 1. 原有的 UI 内容 */}
      <div className="w-full flex justify-between items-center mb-12 py-4">
        <h1 className="text-xl font-black tracking-tighter italic">
          TO BE LIVE.
        </h1>
        <button
          onClick={() => supabase.auth.signOut().then(() => location.reload())}
        >
          <LogOut size={20} className="text-zinc-500" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center w-full space-y-12">
        {/* 增强版大按钮：带圆环进度 */}
        <div className="relative mb-12">
          <svg className="w-80 h-80 -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="140"
              fill="transparent"
              stroke="#18181b"
              strokeWidth="8"
            />
            <motion.circle
              cx="160"
              cy="160"
              r="140"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray="880"
              animate={{
                strokeDashoffset: 880 - (880 * timeLeft.percent) / 100,
              }}
              className={`${getThemeColor()} transition-colors duration-1000`}
              strokeLinecap="round"
            />
          </svg>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCheckIn}
            className="absolute inset-4 rounded-[4.5rem] bg-zinc-900 border border-zinc-800/50 flex flex-col items-center justify-center shadow-inner"
          >
            <div
              className={`mb-4 transition-colors duration-1000 ${getThemeColor()}`}
            >
              {timeLeft.h < 8 ? (
                <AlertTriangle size={60} />
              ) : (
                <Shield size={60} fill="currentColor" fillOpacity={0.1} />
              )}
            </div>
            <span className="text-2xl font-black tracking-tight">我还活着</span>
            <div className="mt-2 font-mono text-sm text-zinc-500">
              {String(timeLeft.h).padStart(2, "0")}:
              {String(timeLeft.m).padStart(2, "0")}:
              {String(timeLeft.s).padStart(2, "0")}
            </div>
          </motion.button>
        </div>

        <div className="w-full space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem]">
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">
              上次活跃时间
            </p>
            <p className="text-lg font-mono">
              {profile?.last_check_in
                ? new Date(profile.last_check_in).toLocaleString()
                : "等待首次签到"}
            </p>
          </div>

          {/* 点击此处开启设置 */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] flex items-center justify-between active:bg-zinc-800 transition-colors"
          >
            <div className="text-left">
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">
                紧急联系邮箱
              </p>
              <p className="text-lg font-mono italic text-zinc-400">
                {profile?.emergency_email || "点击设置"}
              </p>
            </div>
            <Mail
              className={
                profile?.emergency_email ? "text-green-500" : "text-zinc-700"
              }
              size={24}
            />
          </button>
        </div>
      </div>

      {/* 2. 弹窗组件：设置面板 */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* 弹窗主体 */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-[2.5rem] p-8 z-50 pb-12"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">紧急联系设置</h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="bg-zinc-800 p-2 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-6">
                当您超过 48 小时未点击“我还活着”时，系统将向该邮箱发送求助信息。
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                    size={18}
                  />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-1 focus:ring-white outline-none"
                  />
                </div>

                <button
                  onClick={updateEmergencyEmail}
                  disabled={isUpdating}
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Check size={18} /> 保存设置
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 底部版权 */}
      <footer className="mt-8 mb-4">
        <p className="text-[10px] text-zinc-700 font-mono tracking-widest uppercase text-center">
          Secure Link v2.0
        </p>
      </footer>
    </main>
  );
}
