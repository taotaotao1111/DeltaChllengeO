import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // 允许通过内网穿透（cloudflared/ngrok 等）生成的临时域名访问开发服务器，
    // 仅用于本地开发/演示环境，不影响生产构建。
    allowedHosts: true,
  },
})
