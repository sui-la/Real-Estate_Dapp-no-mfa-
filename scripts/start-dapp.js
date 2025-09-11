#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const netstat = process.platform === 'win32' ? 'netstat' : 'lsof';
    const args = process.platform === 'win32' 
      ? ['-an'] 
      : ['-Pi', `:${port}`, '-sTCP:LISTEN', '-t'];
    
    exec(`${netstat} ${args.join(' ')}`, (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        const isInUse = process.platform === 'win32' 
          ? stdout.includes(`:${port} `) && stdout.includes('LISTENING')
          : stdout.trim() !== '';
        resolve(isInUse);
      }
    });
  });
}

function startProcess(command, args, cwd, logFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    const logStream = fs.createWriteStream(logFile);
    
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    
    child.on('error', (error) => {
      log(`❌ Failed to start ${command}: ${error.message}`, 'red');
      reject(error);
    });

    child.on('spawn', () => {
      log(`✅ Started ${command} (PID: ${child.pid})`, 'green');
      resolve(child);
    });
  });
}

async function waitForPort(port, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkPort(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

async function deployContracts() {
  log('📝 Deploying contracts...', 'cyan');
  
  try {
    const deployProcess = spawn('npx', ['hardhat', 'run', 'deploy.js', '--network', 'localhost'], {
      cwd: path.join(__dirname, '..', 'contracts'),
      stdio: 'inherit'
    });

    await new Promise((resolve, reject) => {
      deployProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Deployment failed with code ${code}`));
        }
      });
    });

    log('✅ Contracts deployed successfully', 'green');
  } catch (error) {
    log(`❌ Contract deployment failed: ${error.message}`, 'red');
    throw error;
  }
}

async function updateEnvironmentFiles() {
  log('🔄 Updating environment files...', 'cyan');
  
  try {
    const updateProcess = spawn('node', ['update-addresses.js'], {
      cwd: path.join(__dirname),
      stdio: 'inherit'
    });

    await new Promise((resolve, reject) => {
      updateProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Environment update failed with code ${code}`));
        }
      });
    });

    log('✅ Environment files updated', 'green');
  } catch (error) {
    log(`❌ Environment update failed: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  log('🚀 Starting Real Estate DApp...', 'bright');
  
  const processes = [];
  
  try {
    // Check if we're in the right directory
    if (!fs.existsSync('package.json')) {
      log('❌ Error: Please run this script from the project root directory', 'red');
      process.exit(1);
    }

    // Start Hardhat node if not running
    log('🔍 Checking Hardhat node...', 'cyan');
    if (!(await checkPort(8545))) {
      log('📝 Starting Hardhat node...', 'cyan');
      const hardhatProcess = await startProcess(
        'npx', 
        ['hardhat', 'node'], 
        path.join(__dirname, '..', 'contracts'),
        path.join(__dirname, '..', 'hardhat.log')
      );
      processes.push(hardhatProcess);
      
      log('⏳ Waiting for Hardhat node to start...', 'yellow');
      if (!(await waitForPort(8545))) {
        log('❌ Failed to start Hardhat node', 'red');
        process.exit(1);
      }
      log('✅ Hardhat node started', 'green');
    } else {
      log('✅ Hardhat node already running', 'green');
    }

    // Deploy contracts
    await deployContracts();

    // Update environment files
    await updateEnvironmentFiles();

    // Start backend
    log('🔍 Checking backend...', 'cyan');
    if (!(await checkPort(5000))) {
      log('📝 Starting backend...', 'cyan');
      const backendProcess = await startProcess(
        'npm', 
        ['start'], 
        path.join(__dirname, '..', 'backend'),
        path.join(__dirname, '..', 'backend.log')
      );
      processes.push(backendProcess);
      
      log('⏳ Waiting for backend to start...', 'yellow');
      if (!(await waitForPort(5000))) {
        log('❌ Failed to start backend', 'red');
        process.exit(1);
      }
      log('✅ Backend started', 'green');
    } else {
      log('✅ Backend already running', 'green');
    }

    // Start frontend
    log('📝 Starting frontend...', 'cyan');
    const frontendProcess = await startProcess(
      'npm', 
      ['run', 'dev'], 
      path.join(__dirname, '..', 'frontend'),
      path.join(__dirname, '..', 'frontend.log')
    );
    processes.push(frontendProcess);

    log('⏳ Waiting for frontend to start...', 'yellow');
    await waitForPort(5173, 15000);

    log('', 'reset');
    log('🎉 Real Estate DApp is now running!', 'bright');
    log('', 'reset');
    log('📋 Services:', 'cyan');
    log('  • Frontend: http://localhost:5173', 'green');
    log('  • Backend:  http://localhost:5000', 'green');
    log('  • Hardhat:  http://localhost:8545', 'green');
    log('', 'reset');
    log('📝 Logs:', 'cyan');
    log('  • Frontend: tail -f frontend.log', 'yellow');
    log('  • Backend:  tail -f backend.log', 'yellow');
    log('  • Hardhat:  tail -f hardhat.log', 'yellow');
    log('', 'reset');
    log('🛑 Press Ctrl+C to stop all services', 'red');
    log('', 'reset');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('🛑 Stopping services...', 'red');
      processes.forEach(process => {
        if (process && !process.killed) {
          process.kill('SIGTERM');
        }
      });
      process.exit(0);
    });

    // Keep the script running
    await new Promise(() => {});

  } catch (error) {
    log(`❌ Startup failed: ${error.message}`, 'red');
    
    // Clean up processes
    processes.forEach(process => {
      if (process && !process.killed) {
        process.kill('SIGTERM');
      }
    });
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

