import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Terminal, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  BookmarkPlus, 
  BookOpen, 
  RefreshCw,
  Copy,
  Check,
  ChevronRight
} from 'lucide-react';
import { ProjectSummary, ProgrammingLanguage, DsaSuiteResponse, TestCase, TestCaseStatus } from '../../types';
import { synthesizeDsaSuite, streamDsaDiagnosis, archiveTestCase, fetchTestCases, updateTestCaseStatus } from '../../api/client';

interface DsaWorkspaceProps {
  project: ProjectSummary;
}

export const DsaWorkspace: React.FC<DsaWorkspaceProps> = ({ project }) => {
  const [language, setLanguage] = useState<ProgrammingLanguage>('CPP');
  const [problemDescription, setProblemDescription] = useState(
    'Given an array of integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nConstraints: 1 <= n <= 20000, 0 <= height[i] <= 10^5'
  );
  const [userSolution, setUserSolution] = useState(
`// C++ Optimal Solution
#include <iostream>
#include <vector>
using namespace std;

int trap(vector<int>& height) {
    int n = height.size();
    if (n <= 2) return 0;
    int l = 0, r = n - 1;
    int lMax = 0, rMax = 0, total = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            if (height[l] >= lMax) lMax = height[l];
            else total += lMax - height[l];
            l++;
        } else {
            if (height[r] >= rMax) rMax = height[r];
            else total += rMax - height[r];
            r--;
        }
    }
    return total;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    cout << trap(arr) << endl;
    return 0;
}`
  );

  const [activeTab, setActiveTab] = useState<'editor' | 'suite' | 'deck'>('editor');
  const [suite, setSuite] = useState<DsaSuiteResponse | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mismatch & Diagnosis State
  const [mismatch, setMismatch] = useState<{
    input: string;
    expected: string;
    actual: string;
  } | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Revision Deck State
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckFilter, setDeckFilter] = useState<TestCaseStatus | undefined>(undefined);

  useEffect(() => {
    if (activeTab === 'deck') {
      loadDeck();
    }
  }, [activeTab, deckFilter]);

  const loadDeck = async () => {
    setDeckLoading(true);
    try {
      const data = await fetchTestCases(project.id, deckFilter);
      setTestCases(data);
    } catch (err: any) {
      console.error('Failed to load test cases:', err);
    } finally {
      setDeckLoading(false);
    }
  };

  const handleSynthesizeSuite = async () => {
    setSynthesizing(true);
    setError(null);
    try {
      const res = await synthesizeDsaSuite(project.id, language, problemDescription, userSolution);
      setSuite(res);
      setActiveTab('suite');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to synthesize DSA suite');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleSimulateStressRun = () => {
    // Generate a breaking counterexample simulation
    setMismatch({
      input: '5\n4 2 0 3 2 5',
      expected: '9',
      actual: '8',
    });
    setDiagnosisText('');
    setIsSaved(false);
  };

  const handleDiagnose = async () => {
    if (!mismatch) return;
    setDiagnosing(true);
    setDiagnosisText('');
    try {
      await streamDsaDiagnosis(
        project.id,
        {
          language,
          userCode: userSolution,
          failingInput: mismatch.input,
          expectedOutput: mismatch.expected,
          actualOutput: mismatch.actual,
        },
        (chunk) => {
          setDiagnosisText((prev) => prev + chunk);
        },
        () => {
          setDiagnosing(false);
        },
        (err) => {
          console.error('Diagnosis error:', err);
          setDiagnosing(false);
        }
      );
    } catch (err) {
      setDiagnosing(false);
    }
  };

  const handleSaveToDeck = async () => {
    if (!mismatch) return;
    try {
      await archiveTestCase(project.id, {
        input: mismatch.input,
        expectedOutput: mismatch.expected,
        actualOutput: mismatch.actual,
        explanation: diagnosisText || 'Off-by-one edge condition detected during differential fuzzing loop.',
      });
      setIsSaved(true);
    } catch (err: any) {
      setError('Failed to archive test case');
    }
  };

  const handleToggleStatus = async (tc: TestCase) => {
    const nextStatus = tc.status === 'FAILING' ? 'RESOLVED' : 'FAILING';
    try {
      await updateTestCaseStatus(project.id, tc.id, nextStatus);
      loadDeck();
    } catch (err: any) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0f1d] overflow-hidden text-slate-200">
      {/* Sub-header Navigation */}
      <div className="h-11 px-4 border-b border-slate-800/80 bg-[#0c1220] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'editor'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Solution Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('suite')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'suite'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fuzzer & Stress Suite {suite && '•'}</span>
          </button>

          <button
            onClick={() => setActiveTab('deck')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'deck'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Revision Deck</span>
          </button>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-mono">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
          >
            <option value="CPP">C++17 (-O3)</option>
            <option value="PYTHON">Python 3</option>
            <option value="JAVA">Java 21</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-hidden p-4">
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Left: Problem & Controls */}
            <div className="flex flex-col gap-3 h-full">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex-1 flex flex-col">
                <span className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Problem Statement & Bounds
                </span>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Paste problem description, constraints, and standard sample inputs..."
                  className="flex-1 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI Adversarial Synthesis
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Spring AI writes guaranteed naive $O(N^2)$ solver & random bounded test generator.
                  </p>
                </div>
                <button
                  onClick={handleSynthesizeSuite}
                  disabled={synthesizing}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  {synthesizing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>Synthesize Stress Suite</span>
                </button>
              </div>
            </div>

            {/* Right: User Code Editor */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Optimal Solution Code ({language})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Run via Desktop Client</span>
              </div>
              <textarea
                value={userSolution}
                onChange={(e) => setUserSolution(e.target.value)}
                className="flex-1 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed whitespace-pre"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {activeTab === 'suite' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-y-auto">
            {/* Generated Artifacts */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Generated Naive Brute-Force Solver
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{suite?.bruteForcePath || 'brute_force.cpp'}</span>
                </div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-56 overflow-y-auto">
                  {suite?.bruteForceCode || '// Click "Synthesize Stress Suite" in the editor tab to generate'}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Input Generator Script
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{suite?.generatorPath || 'generator.cpp'}</span>
                </div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-56 overflow-y-auto">
                  {suite?.generatorCode || '// Generates edge-bounded pseudo-random datasets'}
                </pre>
              </div>

              <button
                onClick={handleSimulateStressRun}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
              >
                <Play className="w-4 h-4" />
                <span>Simulate High-Speed Fuzzing Loop (100 runs/sec)</span>
              </button>
            </div>

            {/* Differential Output & Diagnosis */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Differential Mismatch Counterexample
                </span>

                {mismatch ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-mono mb-1">Breaking Input (stdin):</div>
                      <div className="text-xs font-mono text-amber-300">{mismatch.input}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                        <div className="text-[10px] text-emerald-400 font-mono mb-1">Expected Output (Brute):</div>
                        <div className="text-sm font-mono text-emerald-300 font-bold">{mismatch.expected}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
                        <div className="text-[10px] text-rose-400 font-mono mb-1">Actual Output (Your Code):</div>
                        <div className="text-sm font-mono text-rose-300 font-bold">{mismatch.actual}</div>
                      </div>
                    </div>

                    {/* AI Diagnosis */}
                    <div className="pt-2">
                      <button
                        onClick={handleDiagnose}
                        disabled={diagnosing}
                        className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        {diagnosing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>{diagnosing ? 'Streaming AI Diagnosis...' : 'Diagnose Root Cause with AI'}</span>
                      </button>

                      {diagnosisText && (
                        <div className="mt-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs leading-relaxed max-h-48 overflow-y-auto">
                          {diagnosisText}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-500 text-xs">
                    Run the stress test or click simulate to detect breaking counterexamples.
                  </div>
                )}
              </div>

              {mismatch && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleSaveToDeck}
                    disabled={isSaved}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                    <span>{isSaved ? 'Archived to Revision Deck' : 'Save to Revision Deck'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deck' && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  Saved Counterexample Test Cases
                </h3>
                <p className="text-[11px] text-slate-400">Permanently archived in PostgreSQL & MinIO for spaced repetition</p>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setDeckFilter(undefined)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    deckFilter === undefined ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  All ({testCases.length})
                </button>
                <button
                  onClick={() => setDeckFilter('FAILING')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    deckFilter === 'FAILING' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Failing
                </button>
                <button
                  onClick={() => setDeckFilter('RESOLVED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    deckFilter === 'RESOLVED' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {deckLoading ? (
                <div className="text-center py-12 text-slate-500 text-xs">Loading archived test cases...</div>
              ) : testCases.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No archived test cases found for this project.
                </div>
              ) : (
                testCases.map((tc) => (
                  <div
                    key={tc.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                          tc.status === 'FAILING'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        }`}>
                          {tc.status}
                        </span>
                        <span className="text-xs font-mono text-slate-400">Input: <code className="text-amber-300">{tc.input}</code></span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        Expected: <span className="font-mono text-emerald-400">{tc.expectedOutput}</span> • Actual: <span className="font-mono text-rose-400">{tc.actualOutput}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">{tc.explanation}</p>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(tc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                        tc.status === 'FAILING'
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{tc.status === 'FAILING' ? 'Mark Resolved' : 'Re-open'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
