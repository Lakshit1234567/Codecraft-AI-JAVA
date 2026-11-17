const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile, exec } = require('child_process');

const PORT = 4321;
const TEMP_DIR = path.join(__dirname, '.temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let pythonCmd = 'python3';

// Check installed compilers
function checkCompilers() {
  return new Promise((resolve) => {
    const results = { gpp: false, python: false, javac: false };
    exec('g++ --version', (err1) => {
      results.gpp = !err1;
      exec('python3 --version', (err2) => {
        if (!err2) {
          results.python = true;
          pythonCmd = 'python3';
          checkJavac(results, resolve);
        } else {
          exec('python --version', (err2b) => {
            results.python = !err2b;
            pythonCmd = 'python';
            checkJavac(results, resolve);
          });
        }
      });
    });
  });
}

function checkJavac(results, resolve) {
  exec('javac -version', (err3) => {
    results.javac = !err3;
    resolve(results);
  });
}

// Compile code if required
function compile(language, sourcePath, outputPath) {
  return new Promise((resolve) => {
    if (language === 'PYTHON') {
      return resolve({ success: true });
    }

    if (language === 'CPP') {
      execFile('g++', ['-O3', '-std=c++17', sourcePath, '-o', outputPath], { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          return resolve({ success: false, error: stderr || stdout || err.message });
        }
        resolve({ success: true });
      });
      return;
    }

    if (language === 'JAVA') {
      execFile('javac', [sourcePath], { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          return resolve({ success: false, error: stderr || stdout || err.message });
        }
        resolve({ success: true });
      });
      return;
    }

    resolve({ success: false, error: 'Unsupported language: ' + language });
  });
}

// Execute binary or script with stdin
function execute(language, executablePath, input, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    let child;

    if (language === 'CPP') {
      child = spawn(executablePath, [], { timeout: timeoutMs, windowsHide: true });
    } else if (language === 'PYTHON') {
      child = spawn(pythonCmd, [executablePath], { timeout: timeoutMs, windowsHide: true });
    } else if (language === 'JAVA') {
      const classDir = path.dirname(executablePath);
      const className = path.basename(executablePath, '.java');
      child = spawn('java', ['-cp', classDir, className], { timeout: timeoutMs, windowsHide: true });
    } else {
      return resolve({ success: false, error: 'Unsupported language' });
    }

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
      resolve({
        success: false,
        timedOut: true,
        error: 'Time Limit Exceeded (> ' + timeoutMs + 'ms)',
        stdout,
        stderr,
        runtimeMs: timeoutMs
      });
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!killed) resolve({ success: false, error: err.message, stdout, stderr });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      const endTime = process.hrtime.bigint();
      const runtimeMs = Number(endTime - startTime) / 1_000_000;

      if (code !== 0) {
        resolve({
          success: false,
          exitCode: code,
          error: stderr || `Process exited with code ${code}`,
          stdout,
          stderr,
          runtimeMs: Math.round(runtimeMs)
        });
      } else {
        resolve({
          success: true,
          stdout,
          stderr,
          runtimeMs: Math.round(runtimeMs)
        });
      }
    });

    if (input != null) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

function normalizeOutput(str) {
  if (!str) return '';
  return str.replace(/\r/g, '').trim();
}

// Single test runner handler
async function handleSingleRun(data) {
  const { language, code, input, expectedOutput } = data;
  const ext = language === 'CPP' ? 'cpp' : language === 'JAVA' ? 'java' : 'py';
  const baseName = `solution_${Date.now()}`;
  const srcFile = path.join(TEMP_DIR, `${baseName}.${ext}`);
  const exeFile = path.join(TEMP_DIR, `${baseName}.exe`);

  fs.writeFileSync(srcFile, code, 'utf8');

  // Compile
  const comp = await compile(language, srcFile, exeFile);
  if (!comp.success) {
    return {
      success: false,
      compileError: comp.error,
      status: 'COMPILATION_ERROR'
    };
  }

  const runTarget = language === 'CPP' ? exeFile : srcFile;
  const runResult = await execute(language, runTarget, input);

  if (runResult.timedOut) {
    return { success: false, status: 'TIME_LIMIT_EXCEEDED', runtimeMs: runResult.runtimeMs };
  }

  if (!runResult.success) {
    return { success: false, status: 'RUNTIME_ERROR', error: runResult.error, runtimeMs: runResult.runtimeMs };
  }

  const normActual = normalizeOutput(runResult.stdout);
  const normExpected = normalizeOutput(expectedOutput);
  const isMatch = normActual === normExpected;

  return {
    success: true,
    status: isMatch ? 'PASSED' : 'WRONG_ANSWER',
    actualOutput: runResult.stdout,
    expectedOutput: expectedOutput,
    runtimeMs: runResult.runtimeMs,
    isMatch
  };
}

// Differential stress tester loop
async function handleStressTest(data) {
  const { language, studentCode, bruteForceCode, generatorCode, maxIterations = 200 } = data;
  const ext = language === 'CPP' ? 'cpp' : language === 'JAVA' ? 'java' : 'py';
  const ts = Date.now();

  const studentSrc = path.join(TEMP_DIR, `student_${ts}.${ext}`);
  const studentExe = path.join(TEMP_DIR, `student_${ts}.exe`);
  const bruteSrc = path.join(TEMP_DIR, `brute_${ts}.${ext}`);
  const bruteExe = path.join(TEMP_DIR, `brute_${ts}.exe`);
  const genSrc = path.join(TEMP_DIR, `gen_${ts}.${ext}`);
  const genExe = path.join(TEMP_DIR, `gen_${ts}.exe`);

  fs.writeFileSync(studentSrc, studentCode, 'utf8');
  fs.writeFileSync(bruteSrc, bruteForceCode, 'utf8');
  fs.writeFileSync(genSrc, generatorCode, 'utf8');

  // Compile all 3
  const [compStudent, compBrute, compGen] = await Promise.all([
    compile(language, studentSrc, studentExe),
    compile(language, bruteSrc, bruteExe),
    compile(language, genSrc, genExe)
  ]);

  if (!compStudent.success) return { success: false, error: 'Student compilation error: ' + compStudent.error };
  if (!compBrute.success) return { success: false, error: 'Brute-force compilation error: ' + compBrute.error };
  if (!compGen.success) return { success: false, error: 'Generator compilation error: ' + compGen.error };

  const studentTarget = language === 'CPP' ? studentExe : studentSrc;
  const bruteTarget = language === 'CPP' ? bruteExe : bruteSrc;
  const genTarget = language === 'CPP' ? genExe : genSrc;

  for (let i = 1; i <= maxIterations; i++) {
    // 1. Generate input
    const genRes = await execute(language, genTarget, null, 1000);
    if (!genRes.success) {
      return { success: false, error: `Generator failed at iteration ${i}: ${genRes.error}` };
    }
    const testInput = genRes.stdout;

    // 2. Run Brute Force
    const bruteRes = await execute(language, bruteTarget, testInput, 2000);
    if (!bruteRes.success) {
      return { success: false, error: `Brute force failed at iteration ${i}: ${bruteRes.error}` };
    }

    // 3. Run Student Code
    const studentRes = await execute(language, studentTarget, testInput, 2000);
    if (!studentRes.success) {
      return {
        success: true,
        mismatchFound: true,
        iteration: i,
        input: testInput,
        expectedOutput: bruteRes.stdout,
        actualOutput: studentRes.error || studentRes.stdout,
        status: 'RUNTIME_ERROR'
      };
    }

    // 4. Compare outputs
    const normActual = normalizeOutput(studentRes.stdout);
    const normExpected = normalizeOutput(bruteRes.stdout);

    if (normActual !== normExpected) {
      return {
        success: true,
        mismatchFound: true,
        iteration: i,
        input: testInput,
        expectedOutput: bruteRes.stdout,
        actualOutput: studentRes.stdout,
        runtimeMs: studentRes.runtimeMs,
        status: 'MISMATCH'
      };
    }
  }

  return {
    success: true,
    mismatchFound: false,
    totalIterations: maxIterations,
    message: `All ${maxIterations} random stress tests passed!`
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // API Routes
  if (req.url === '/api/system/compilers' && req.method === 'GET') {
    const compilers = await checkCompilers();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(compilers));
  }

  if (req.url === '/api/run/single' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await handleSingleRun(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/run/stress' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await handleStressTest(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  const extname = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading ' + req.url);
    } else {
      res.writeHead(200, { 'Content-Type': contentTypes[extname] || 'text/plain' });
      res.end(content);
    }
  });
});

module.exports = { checkCompilers, handleSingleRun, handleStressTest, server };

if (require.main === module) {
  server.listen(PORT, async () => {
    await checkCompilers();
    console.log(`======================================================`);
    console.log(`🚀 BreakMyCode Local Runner is active on http://localhost:${PORT}`);
    console.log(`======================================================`);

    const edgeWindows = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const chromeMac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const profileDir = path.join(TEMP_DIR, 'browser-profile');

    if (process.platform === 'darwin' && fs.existsSync(chromeMac)) {
      console.log('🌟 Opening minimal desktop window via Google Chrome App Mode...');
      spawn(chromeMac, [
        `--app=http://localhost:${PORT}`,
        '--window-size=580,880',
        `--user-data-dir=${profileDir}`
      ], { detached: true, stdio: 'ignore' });
    } else if (process.platform === 'win32' && fs.existsSync(edgeWindows)) {
      console.log('🌟 Opening minimal desktop window via Microsoft Edge App Mode...');
      spawn(edgeWindows, [
        `--app=http://localhost:${PORT}`,
        '--window-size=580,880',
        `--user-data-dir=${profileDir}`
      ], { detached: true, stdio: 'ignore' });
    } else {
      console.log(`Open http://localhost:${PORT} in your browser.`);
      if (process.platform === 'darwin') {
        spawn('open', [`http://localhost:${PORT}`], { detached: true, stdio: 'ignore' });
      }
    }
  });
}
