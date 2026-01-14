import "./globals.css";
import { ThemeProvider } from '@/components/theme-provider'
import { InstallPWA } from '@/components/InstallPWA'

export const metadata = {
  title: '活着呢 - 守护你的平安',
  description: '极简独居安全签到应用',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TO BE LIVE',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <InstallPWA /> {/* 添加到桌面引导 */}
        </ThemeProvider>
      </body>
    </html>
  );
}
