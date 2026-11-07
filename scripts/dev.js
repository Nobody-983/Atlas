import { spawn } from 'child_process';
import path from 'path';

console.log('=======================================================');
console.log('🚀 Starting ATLAS Platform Development Servers');
console.log('📡 Backend API:  http://localhost:3007');
console.log('💻 Frontend Web: http://localhost:5180');
console.log('=======================================================');

const backend = spawn('npm', ['run', 'dev', '-w', 'backend'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3007' },
});

const frontend = spawn('npm', ['run', 'dev', '-w', 'frontend'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '5180' },
});

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});

