import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 定义延时函数，用于规避 Resend 每秒 2 封的限制
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request) {
  // 1. 安全校验
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. 获取所有待检查用户（包含自定义周期字段）
    const { data: allUsers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, emergency_email, last_check_in, check_interval_hours')
      .eq('is_alerted', false)
      .not('emergency_email', 'is', null);

    if (error) throw error;

    // 3. 在内存中筛选真正“失联”的用户
    const now = Date.now();
    const riskyUsers = (allUsers || []).filter(user => {
      const interval = (user.check_interval_hours || 40) * 60 * 60 * 1000;
      const lastCheckIn = new Date(user.last_check_in).getTime();
      return (now - lastCheckIn) > interval;
    });

    if (riskyUsers.length === 0) {
      return NextResponse.json({ message: '目前所有效用户均安全' });
    }

    const results = [];

    // 4. 串行发送邮件，防止触发 Rate Limit (429)
    for (const user of riskyUsers) {
      try {
        const { data: mailData, error: mailError } = await resend.emails.send({
          // 重要：改为你 Resend 验证成功的根域名
          from: 'TO BE LIVE <guardian@to-be-live.me>', 
          to: user.emergency_email,
          subject: `【紧急提醒】您的好友 ${user.email} 可能失联`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #e11d48;">紧急安全预警</h2>
              <p>您好，</p>
              <p>系统检测到您的好友 <strong>${user.email}</strong> 已超过其设定的安全周期未进行活跃签到。</p>
              <p>其最后活跃时间为：<strong>${new Date(user.last_check_in).toLocaleString()}</strong></p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="background: #fff1f2; padding: 15px; border-radius: 8px; color: #be123c;">
                <strong>建议操作：</strong> 请立即尝试联系该好友，确认其当前安全状况。
              </p>
              <p style="font-size: 11px; color: #999; margin-top: 30px;">
                此邮件由 TO BE LIVE (to-be-live.me) 自动发出。
              </p>
            </div>
          `
        });

        if (mailError) {
          results.push({ id: user.id, status: 'failed', error: mailError });
        } else {
          // 发送成功后更新数据库
          await supabaseAdmin
            .from('profiles')
            .update({ is_alerted: true })
            .eq('id', user.id);
          
          results.push({ id: user.id, status: 'sent', messageId: mailData.id });
        }
      } catch (innerErr) {
        results.push({ id: user.id, status: 'error', message: innerErr.message });
      }

      // 关键：每处理完一个用户，暂停 600 毫秒，确保每秒发信不超过 2 封
      await delay(600);
    }

    return NextResponse.json({ 
      totalProcessed: riskyUsers.length,
      details: results 
    });

  } catch (err) {
    console.error('Cron Global Error:', err);
    return new Response(err.message, { status: 500 });
  }
}