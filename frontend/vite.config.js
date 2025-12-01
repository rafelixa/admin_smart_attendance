import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'src/pages/login/index.html'),
        dashboard: resolve(__dirname, 'index.html'),
        camera: resolve(__dirname, 'src/pages/camera/index.html'),
        requestList: resolve(__dirname, 'src/pages/request_list/index.html'),
        userlist: resolve(__dirname, 'src/pages/userlist/index.html'),
        userlistManage: resolve(__dirname, 'src/pages/userlist_manage/index.html'),
        requestListApproved: resolve(__dirname, 'src/pages/request_list_manage/approved/index.html'),
        requestListPending: resolve(__dirname, 'src/pages/request_list_manage/pending/index.html'),
        requestListRejected: resolve(__dirname, 'src/pages/request_list_manage/rejected/index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
