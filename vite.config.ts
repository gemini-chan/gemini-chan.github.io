import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { DownloadLive2DSDK } from '@proj-airi/unplugin-live2d-sdk/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/gemini-chan/',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      plugins: [
        DownloadLive2DSDK() as any,
      ],
    };
});
