import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }) => {
  
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['frontend-service', 'localhost', "karsyn-preaffirmative-elwood.ngrok-free.dev"],
      proxy: {
        '/auth-api': {
          target: env.VITE_AUTH_API,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/auth-api/, '')
        },
        '/task-api': {
          target: env.VITE_TASK_API,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/task-api/, '')
        }
      }
    }
  });
};
