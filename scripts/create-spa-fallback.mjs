import fs from 'node:fs'
import path from 'node:path'

const distDir = path.resolve(process.cwd(), 'dist')
const indexPath = path.join(distDir, 'index.html')
const fallbackPath = path.join(distDir, '404.html')

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html nao encontrado. Execute o build antes de criar o fallback SPA.')
}

fs.copyFileSync(indexPath, fallbackPath)

console.log('Fallback SPA criado em dist/404.html')
