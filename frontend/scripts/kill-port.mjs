import { execSync } from 'child_process'

const PORT = 5173

try {
  if (process.platform === 'win32') {
    execSync(
      `powershell -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore' }
    )
  } else {
    execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' })
  }
} catch {
  // port was already free
}
