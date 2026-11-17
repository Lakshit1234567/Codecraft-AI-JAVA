document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const btnSettings = document.getElementById('btnSettings');
  const settingsDrawer = document.getElementById('settingsDrawer');

  const cfgBackendUrl = document.getElementById('cfgBackendUrl');
  const cfgProjectId = document.getElementById('cfgProjectId');
  const cfgAuthToken = document.getElementById('cfgAuthToken');

  const pillGpp = document.getElementById('pillGpp');
  const pillPy = document.getElementById('pillPy');

  // Verify Tab
  const sampleLang = document.getElementById('sampleLang');
  const sampleSolutionCode = document.getElementById('sampleSolutionCode');
  const sampleInput = document.getElementById('sampleInput');
  const sampleExpected = document.getElementById('sampleExpected');
  const btnRunSingle = document.getElementById('btnRunSingle');
  const singleResultCard = document.getElementById('singleResultCard');
  const singleStatusBadge = document.getElementById('singleStatusBadge');
  const singleRuntimeTag = document.getElementById('singleRuntimeTag');
  const singleDiffViewer = document.getElementById('singleDiffViewer');

  // Stress Tab
  const btnSynthesizeAi = document.getElementById('btnSynthesizeAi');
  const aiProblemPrompt = document.getElementById('aiProblemPrompt');
  const stressBruteCode = document.getElementById('stressBruteCode');
  const stressGenCode = document.getElementById('stressGenCode');
  const stressIterations = document.getElementById('stressIterations');
  const btnStartStress = document.getElementById('btnStartStress');
  const stressResultCard = document.getElementById('stressResultCard');
  const stressStatusBadge = document.getElementById('stressStatusBadge');
  const stressIterationTag = document.getElementById('stressIterationTag');
  const mismatchInput = document.getElementById('mismatchInput');
  const mismatchExpected = document.getElementById('mismatchExpected');
  const mismatchActual = document.getElementById('mismatchActual');
  const btnDiagnoseAi = document.getElementById('btnDiagnoseAi');
  const btnArchiveCase = document.getElementById('btnArchiveCase');
  const aiDiagnosisContainer = document.getElementById('aiDiagnosisContainer');
  const aiDiagnosisContent = document.getElementById('aiDiagnosisContent');

  // Deck Tab
  const deckListContainer = document.getElementById('deckListContainer');
  const deckCountBadge = document.getElementById('deckCountBadge');
  const btnRefreshDeck = document.getElementById('btnRefreshDeck');

  let currentMismatch = null;

  // Load Saved Config from LocalStorage
  cfgBackendUrl.value = localStorage.getItem('bm_backend_url') || 'http://localhost:8080';
  cfgProjectId.value = localStorage.getItem('bm_project_id') || '1';
  cfgAuthToken.value = localStorage.getItem('bm_auth_token') || '';

  const saveConfig = () => {
    localStorage.setItem('bm_backend_url', cfgBackendUrl.value.trim());
    localStorage.setItem('bm_project_id', cfgProjectId.value.trim());
    localStorage.setItem('bm_auth_token', cfgAuthToken.value.trim());
  };

  cfgBackendUrl.addEventListener('change', saveConfig);
  cfgProjectId.addEventListener('change', saveConfig);
  cfgAuthToken.addEventListener('change', saveConfig);

  // Settings Drawer Toggle
  btnSettings.addEventListener('click', () => {
    settingsDrawer.classList.toggle('hidden');
  });

  // Tab Navigation
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
      if (btn.dataset.tab === 'tab-deck') loadDeck();
    });
  });

  // Check Local Compilers on Launch
  async function checkCompilers() {
    try {
      const res = await fetch('/api/system/compilers');
      const data = await res.json();
      pillGpp.textContent = data.gpp ? 'g++: OK' : 'g++: MISSING';
      pillGpp.className = data.gpp ? 'pill pill-ready' : 'pill pill-muted';

      pillPy.textContent = data.python ? 'Python: OK' : 'Python: MISSING';
      pillPy.className = data.python ? 'pill pill-ready' : 'pill pill-muted';
    } catch {
      pillGpp.textContent = 'Runner: Offline';
    }
  }
  checkCompilers();

  // Helper for Auth Headers
  function getBackendHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = cfgAuthToken.value.trim();
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return headers;
  }

  // 1. Single Run (Verify Tab)
  async function runSingleTest() {
    const code = sampleSolutionCode.value;
    const input = sampleInput.value;
    const expected = sampleExpected.value;
    const lang = sampleLang.value;

    if (!code.trim()) {
      alert('Please enter solution code first.');
      return;
    }

    btnRunSingle.disabled = true;
    btnRunSingle.textContent = '⏳ Compiling & Running...';
    singleResultCard.classList.add('hidden');

    try {
      const res = await fetch('/api/run/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, code, input, expectedOutput: expected })
      });
      const data = await res.json();

      singleResultCard.classList.remove('hidden');
      singleRuntimeTag.textContent = `${data.runtimeMs || 0}ms`;

      if (data.status === 'COMPILATION_ERROR') {
        singleStatusBadge.textContent = 'COMPILATION ERROR';
        singleStatusBadge.className = 'status-badge status-failed';
        renderDiff(data.compileError, 'Compiler Diagnostics:');
      } else if (data.status === 'TIME_LIMIT_EXCEEDED') {
        singleStatusBadge.textContent = 'TIME LIMIT EXCEEDED';
        singleStatusBadge.className = 'status-badge status-failed';
        renderDiff('Execution timed out (> 2500ms)', 'Process Error:');
      } else if (data.status === 'RUNTIME_ERROR') {
        singleStatusBadge.textContent = 'RUNTIME ERROR';
        singleStatusBadge.className = 'status-badge status-failed';
        renderDiff(data.error, 'Stderr Output:');
      } else if (data.isMatch) {
        singleStatusBadge.textContent = 'PASSED (MATCH)';
        singleStatusBadge.className = 'status-badge status-passed';
        renderDiff(data.actualOutput, expected);
      } else {
        singleStatusBadge.textContent = 'WRONG ANSWER (DIFF)';
        singleStatusBadge.className = 'status-badge status-failed';
        renderDiff(data.actualOutput, expected);
      }
    } catch (err) {
      alert('Local runner execution failed: ' + err.message);
    } finally {
      btnRunSingle.disabled = false;
      btnRunSingle.textContent = '▶ Run & Verify';
    }
  }

  function renderDiff(actual, expected) {
    const normActual = (actual || '').replace(/\r\n/g, '\n');
    const normExpected = (expected || '').replace(/\r\n/g, '\n');

    const actLines = normActual.split('\n');
    const expLines = normExpected.split('\n');
    const maxLen = Math.max(actLines.length, expLines.length);

    let expHtml = '<div class="diff-pane-title">Expected:</div>';
    let actHtml = '<div class="diff-pane-title">Actual:</div>';

    for (let i = 0; i < maxLen; i++) {
      const eLine = expLines[i] ?? '';
      const aLine = actLines[i] ?? '';
      const isMismatch = eLine.trim() !== aLine.trim();
      const lineClass = isMismatch ? 'diff-mismatch-line' : '';

      expHtml += `<div class="${lineClass}">${escapeHtml(eLine) || '&nbsp;'}</div>`;
      actHtml += `<div class="${lineClass}">${escapeHtml(aLine) || '&nbsp;'}</div>`;
    }

    singleDiffViewer.innerHTML = `
      <div class="diff-pane">${expHtml}</div>
      <div class="diff-pane">${actHtml}</div>
    `;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  btnRunSingle.addEventListener('click', runSingleTest);

  // Keyboard shortcut: Ctrl + Enter
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runSingleTest();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      startStressTest();
    }
  });

  // 2. Synthesize Stress Suite via Spring AI
  btnSynthesizeAi.addEventListener('click', async () => {
    const prompt = aiProblemPrompt.value.trim();
    if (!prompt) {
      alert('Please paste problem description or constraints first.');
      return;
    }

    btnSynthesizeAi.disabled = true;
    btnSynthesizeAi.textContent = '✨ Synthesizing via AI...';

    const backendUrl = cfgBackendUrl.value.trim();
    const projectId = cfgProjectId.value.trim();

    try {
      const res = await fetch(`${backendUrl}/api/dsa/${projectId}/synthesize-suite`, {
        method: 'POST',
        headers: getBackendHeaders(),
        body: JSON.stringify({
          language: sampleLang.value,
          problemDescription: prompt,
          studentCode: sampleSolutionCode.value
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to synthesize suite');
      }

      const suite = await res.json();
      stressBruteCode.value = suite.bruteForceCode || '';
      stressGenCode.value = suite.generatorCode || '';
      alert(`Success! Generated brute-force & generator scripts.\nBounds: ${suite.inputBoundsSummary}`);
    } catch (err) {
      alert('AI Synthesis Error: ' + err.message);
    } finally {
      btnSynthesizeAi.disabled = false;
      btnSynthesizeAi.textContent = 'Generate Brute-Force & Generator';
    }
  });

  // 3. Differential Stress Test Loop
  async function startStressTest() {
    const studentCode = sampleSolutionCode.value;
    const bruteCode = stressBruteCode.value;
    const genCode = stressGenCode.value;
    const lang = sampleLang.value;
    const maxIters = parseInt(stressIterations.value) || 200;

    if (!studentCode.trim() || !bruteCode.trim() || !genCode.trim()) {
      alert('Ensure student solution, brute-force baseline, and generator are all filled.');
      return;
    }

    btnStartStress.disabled = true;
    btnStartStress.textContent = `🔨 Hammering (${maxIters} iterations)...`;
    stressResultCard.classList.add('hidden');
    aiDiagnosisContainer.classList.add('hidden');

    try {
      const res = await fetch('/api/run/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          studentCode,
          bruteForceCode: bruteCode,
          generatorCode: genCode,
          maxIterations: maxIters
        })
      });

      const data = await res.json();
      stressResultCard.classList.remove('hidden');

      if (!data.success) {
        stressStatusBadge.textContent = 'COMPILATION / EXECUTION ERROR';
        stressStatusBadge.className = 'status-badge status-failed';
        stressIterationTag.textContent = 'Halted';
        mismatchInput.textContent = data.error || 'Unknown error';
        mismatchExpected.textContent = '';
        mismatchActual.textContent = '';
        currentMismatch = null;
        return;
      }

      if (data.mismatchFound) {
        stressStatusBadge.textContent = 'MISMATCH FOUND! (BREAKING INPUT)';
        stressStatusBadge.className = 'status-badge status-failed';
        stressIterationTag.textContent = `Caught at #${data.iteration}`;

        mismatchInput.textContent = data.input;
        mismatchExpected.textContent = data.expectedOutput;
        mismatchActual.textContent = data.actualOutput;

        currentMismatch = {
          input: data.input,
          expectedOutput: data.expectedOutput,
          actualOutput: data.actualOutput
        };
      } else {
        stressStatusBadge.textContent = 'ALL TESTS PASSED!';
        stressStatusBadge.className = 'status-badge status-passed';
        stressIterationTag.textContent = `${data.totalIterations} passes`;
        mismatchInput.textContent = 'No counterexample found within current bounds.';
        mismatchExpected.textContent = '---';
        mismatchActual.textContent = '---';
        currentMismatch = null;
      }
    } catch (err) {
      alert('Stress run error: ' + err.message);
    } finally {
      btnStartStress.disabled = false;
      btnStartStress.textContent = '🔨 Hammer Solutions';
    }
  }

  btnStartStress.addEventListener('click', startStressTest);

  // 4. Live Streaming AI Diagnosis (SSE)
  btnDiagnoseAi.addEventListener('click', async () => {
    if (!currentMismatch) {
      alert('No active mismatch to diagnose.');
      return;
    }

    aiDiagnosisContainer.classList.remove('hidden');
    aiDiagnosisContent.textContent = 'Connecting to Spring AI for root-cause diagnosis...\n';
    btnDiagnoseAi.disabled = true;

    const backendUrl = cfgBackendUrl.value.trim();
    const projectId = cfgProjectId.value.trim();

    try {
      const response = await fetch(`${backendUrl}/api/dsa/${projectId}/diagnose`, {
        method: 'POST',
        headers: getBackendHeaders(),
        body: JSON.stringify({
          language: sampleLang.value,
          studentCode: sampleSolutionCode.value,
          input: currentMismatch.input,
          expectedOutput: currentMismatch.expectedOutput,
          actualOutput: currentMismatch.actualOutput
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      aiDiagnosisContent.textContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              if (data.content) {
                aiDiagnosisContent.textContent += data.content;
              }
            } catch {
              // ignore partial line
            }
          }
        }
      }
    } catch (err) {
      aiDiagnosisContent.textContent = `Diagnosis Error: ${err.message}`;
    } finally {
      btnDiagnoseAi.disabled = false;
    }
  });

  // 5. Save Failing Case to Revision Deck
  btnArchiveCase.addEventListener('click', async () => {
    if (!currentMismatch) {
      alert('No active mismatch to archive.');
      return;
    }

    const backendUrl = cfgBackendUrl.value.trim();
    const projectId = cfgProjectId.value.trim();

    try {
      const res = await fetch(`${backendUrl}/api/dsa/${projectId}/test-cases`, {
        method: 'POST',
        headers: getBackendHeaders(),
        body: JSON.stringify({
          input: currentMismatch.input,
          expectedOutput: currentMismatch.expectedOutput,
          actualOutput: currentMismatch.actualOutput,
          explanation: aiDiagnosisContent.textContent.substring(0, 500) || 'Differential test mismatch'
        })
      });

      if (!res.ok) throw new Error('Failed to archive test case');
      alert('✅ Saved breaking test case to Revision Deck!');
      loadDeck();
    } catch (err) {
      alert('Archive error: ' + err.message);
    }
  });

  // 6. Deck Tab Loader
  async function loadDeck() {
    const backendUrl = cfgBackendUrl.value.trim();
    const projectId = cfgProjectId.value.trim();

    try {
      const res = await fetch(`${backendUrl}/api/dsa/${projectId}/test-cases`, {
        headers: getBackendHeaders()
      });
      if (!res.ok) return;

      const cases = await res.json();
      deckCountBadge.textContent = cases.length;

      if (cases.length === 0) {
        deckListContainer.innerHTML = '<p class="empty-hint">No failing test cases archived yet. Run the stress tester to hunt for edge cases!</p>';
        return;
      }

      deckListContainer.innerHTML = cases.map(tc => `
        <div class="deck-item">
          <div class="deck-item-top">
            <span class="status-badge ${tc.status === 'RESOLVED' ? 'status-passed' : 'status-failed'}">${tc.status}</span>
            <span class="deck-timestamp">${new Date(tc.createdAt).toLocaleDateString()}</span>
          </div>
          <span class="detail-label">Breaking Input:</span>
          <pre class="code-preview">${escapeHtml(tc.input)}</pre>
          <span class="detail-label">Expected: <code>${escapeHtml(tc.expectedOutput)}</code> | Actual: <code>${escapeHtml(tc.actualOutput)}</code></span>
          ${tc.explanation ? `<p style="font-size: 11px; color: #8b949e;">${escapeHtml(tc.explanation)}</p>` : ''}
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button class="btn btn-sm btn-secondary" onclick="loadIntoVerify('${encodeURIComponent(tc.input)}', '${encodeURIComponent(tc.expectedOutput)}')">Load into Verify</button>
          </div>
        </div>
      `).join('');
    } catch {
      // Backend not running or offline
    }
  }

  window.loadIntoVerify = (encInput, encExp) => {
    sampleInput.value = decodeURIComponent(encInput);
    sampleExpected.value = decodeURIComponent(encExp);
    document.querySelector('[data-tab="tab-verify"]').click();
  };

  btnRefreshDeck.addEventListener('click', loadDeck);
});
