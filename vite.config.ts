import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
    force: true,
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true
        })
      ]
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
    }
  },
  esbuild: {
    supported: {
      'top-level-await': true
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    commonjsOptions: {
      include: ['buffer', 'process', /node_modules/],
      transformMixedEsModules: true,
      defaultIsModuleExports: 'auto'
    },
    rollupOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true
        }) as any
      ],
      output: {
        manualChunks: {
          'polyfills': ['buffer', 'process']
        }
      }
    }
  }
})
