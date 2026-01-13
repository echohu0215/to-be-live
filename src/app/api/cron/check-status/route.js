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
    // 2. 核心逻辑：查询超过 48 小时未签到且状态未报警的用户
    // 假设我们在 profiles 表增加了一个字段 status (default: 'safe')
    const { data: riskyUsers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, emergency_email, last_check_in')
      .lt('last_check_in', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (error) throw error;
    if (!riskyUsers || riskyUsers.length === 0) {
      return NextResponse.json({ message: '目前所有效用户均安全' });
    }

    // 3. 遍历发送报警邮件
    const results = await Promise.all(
      riskyUsers.map(async (user) => {
        if (!user.emergency_email) return null;

        const { error: mailError } = await resend.emails.send({
          from: '守护者 <guardian@yourdomain.com>',
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
              <p style="font-size: 12px; color: #999; margin-top: 40px;">这是由 DIED LE ME 自动发出的安全预警。</p>
            </div>
          `
        });

        return mailError ? { id: user.id, status: 'failed' } : { id: user.id, status: 'sent' };
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