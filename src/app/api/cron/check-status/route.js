import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

// 初始化具有管理员权限的 Supabase 客户端
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 使用 Service Role Key
);

export async function GET(request) {
  // 1. 安全校验：验证是否为合法的 Vercel Cron 请求
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    // 2. 筛选：失联超过48小时 且 尚未发送过告警 (is_alerted = false)
    const { data: riskyUsers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, emergency_email, last_check_in')
      .lt('last_check_in', fortyEightHoursAgo)
      .eq('is_alerted', false) // 极其重要：防止重复骚扰
      .not('emergency_email', 'is', null);

    if (error) throw error;
    if (!riskyUsers || riskyUsers.length === 0) {
      return NextResponse.json({ message: '目前所有效用户均安全' });
    }

    // 3. 遍历发送报警邮件
    const results = await Promise.all(
      riskyUsers.map(async (user) => {
        if (!user.emergency_email) return null;

        const { error: mailError } = await resend.emails.send({
          from: '守护者 <guardian@send.to-be-live.me>',
          to: user.emergency_email,
          subject: `【紧急提醒】您的好友 ${user.email} 已失联`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>紧急安全通知</h2>
              <p>您好，</p>
              <p>系统检测到您的好友 <strong>${user.email}</strong> 已经连续超过 48 小时未在“死了么”App 进行安全签到。</p>
              <p>其最后一次活跃时间为：${new Date(user.last_check_in).toLocaleString()}</p>
              <hr />
              <p style="color: #e11d48;"><strong>建议操作：</strong> 请立即尝试通过电话或上门方式确认其安全状态。</p>
              <p style="font-size: 12px; color: #999; margin-top: 40px;">这是由 TO BE LIVE 自动发出的安全预警。</p>
            </div>
          `
        });

        if (mailError) {
          console.error(`邮件发送失败给 ${user.email}:`, mailError);
          return { id: user.id, status: 'failed', error: mailError };
        }

        // 3. 发送成功后立即更新数据库标记
        await supabaseAdmin
          .from('profiles')
          .update({ is_alerted: true })
          .eq('id', user.id);

        return { id: user.id, status: 'sent', messageId: data.id };

      })
    );

    return NextResponse.json({ 
      processedCount: riskyUsers.length,
      details: results 
    });

  } catch (err) {
    console.error('Cron Error:', err);
    return new Response(err.message, { status: 500 });
  }
}