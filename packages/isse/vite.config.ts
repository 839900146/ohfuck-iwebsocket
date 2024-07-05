import { defineConfig } from 'vite'
import * as path from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
    plugins: [
        dts({
            copyDtsFiles: true,
            exclude: [
                "node_modules/**",
            ],
            include: [
                "src/build.ts",
                "src/lib/**/*.ts",
                "src/plugins/**/*.ts",
                "src/utils/**/*.ts",
            ],
            outDir: path.resolve(__dirname, 'dist/types'),
        })
    ],
    resolve: {
        alias: {
            '@': path.join(__dirname, 'src'),
        }
    },
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/build.ts'),
            name: 'isse',
            fileName: (format) => `isse.${format}.js`,
            formats: ['es', 'cjs', 'umd', 'iife']
        },
        copyPublicDir: false
    },
    server: {
        port: 10001
    }
})