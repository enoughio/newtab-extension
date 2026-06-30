import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite' 

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],

  build: {

    rollupOptions: {
      // output : {   // output file names 
      //   entryFileNames :  "assets/[name].js",  // for  naming entry files like main.js
      //   chunkFileNames: "assets/[name].js",
      //   assetFileNames: "assets/[name][ext]"
      // }
       input: {
        newtab: resolve(__dirname, "newtab.html"),
        popup: resolve(__dirname, "popup.html"),
      },
    }
  }
  
})


