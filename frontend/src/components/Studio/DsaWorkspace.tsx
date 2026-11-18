import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  ProjectSummary,
  ProgrammingLanguage,
  DsaSuiteResponse,
  TestCase,
  TestCaseStatus,
} from '../../types';
import {
  synthesizeDsaSuite,
  runDsaStressTest,
  streamDsaDiagnosis,
  archiveTestCase,
  fetchTestCases,
  updateTestCaseStatus,
} from '../../api/client';
import {
  DEFAULT_PROBLEM_DESCRIPTION,
  LANGUAGE_TEMPLATES,
} from './DsaWorkspace/defaultTemplates';
import { DsaToolbar, DsaTab } from './DsaWorkspace/DsaToolbar';
import { ProblemEditorTab } from './DsaWorkspace/ProblemEditorTab';
import { FuzzingSuiteTab, MismatchInfo } from './DsaWorkspace/FuzzingSuiteTab';
import { RevisionDeckTab } from './DsaWorkspace/RevisionDeckTab';
import { useToast } from '../ui/ToastProvider';

interface DsaWorkspaceProps {
  project: ProjectSummary;
}

export const DsaWorkspace: React.FC<DsaWorkspaceProps> = ({ project }) => {
  const { notify } = useToast();
  const [language, setLanguage] = useState<ProgrammingLanguage>('CPP');
  const [problemDescription, setProblemDescription] = useState(DEFAULT_PROBLEM_DESCRIPTION);
  const [userSolution, setUserSolution] = useState(LANGUAGE_TEMPLATES.CPP);

  const [activeTab, setActiveTab] = useState<DsaTab>('editor');
  const [suite, setSuite] = useState<DsaSuiteResponse | null>(null);
  const [runningTest, setRunningTest] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mismatch, setMismatch] = useState<MismatchInfo | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckFilter, setDeckFilter] = useState<TestCaseStatus | undefined>(undefined);

  const loadDeck = useCallback(async () => {
    setDeckLoading(true);
    try {
      const data = await fetchTestCases(project.id, deckFilter);
      setTestCases(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load archived test cases');
    } finally {
      setDeckLoading(false);
    }
  }, [project.id, deckFilter]);

  useEffect(() => {
    if (activeTab === 'deck') {
      loadDeck();
    }
  }, [activeTab, loadDeck]);

  const handleLanguageChange = (nextLang: ProgrammingLanguage) => {
    const isUsingDefault = Object.values(LANGUAGE_TEMPLATES).includes(userSolution);
    setLanguage(nextLang);
    if (isUsingDefault) {
      setUserSolution(LANGUAGE_TEMPLATES[nextLang]);
    }
  };

  const handleSynthesizeSuite = async () => {
    setSynthesizing(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await synthesizeDsaSuite(project.id, language, problemDescription, userSolution);
      setSuite(res);
      setActiveTab('suite');
      setStatusMessage('Brute-force oracle and randomized generator synthesized.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to synthesize DSA suite');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleRunStressTest = async () => {
    setRunningTest(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await runDsaStressTest(project.id, {
        language,
        problemDescription,
        studentCode: userSolution,
        bruteForceCode: suite?.bruteForceCode,
        generatorCode: suite?.generatorCode,
      });

      if (res.bruteForceCode && !suite) {
        setSuite({
          projectId: project.id,
          language,
          bruteForceCode: res.bruteForceCode,
          bruteForcePath: 'brute_force',
          generatorCode: res.generatorCode || '',
          generatorPath: 'generator',
          inputConstraints: 'Synthesized automatically',
        });
      }

      if (res.foundCounterexample && res.failingInput) {
        setMismatch({
          input: res.failingInput,
          expected: res.expectedOutput || 'N/A',
          actual: res.actualOutput || 'N/A',
          explanation: res.message,
        });
        setDiagnosisText('');
        setIsSaved(true);
        setActiveTab('suite');
        setStatusMessage(res.message);
      } else {
        setStatusMessage(
          res.message || `All ${res.iterationsRun} differential fuzz iterations passed.`
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Stress test execution failed');
    } finally {
      setRunningTest(false);
    }
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
        (chunk) => setDiagnosisText((prev) => prev + chunk),
        () => setDiagnosing(false),
        () => {
          setDiagnosing(false);
          setError('Failed to stream AI diagnosis.');
        }
      );
    } catch {
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
        explanation:
          diagnosisText ||
          mismatch.explanation ||
          'Counterexample captured during differential fuzzing.',
      });
      setIsSaved(true);
      notify('Counterexample archived to Revision Deck', 'success');
    } catch {
      setError('Failed to archive test case');
    }
  };

  const handleToggleStatus = async (tc: TestCase) => {
    const nextStatus = tc.status === 'FAILING' ? 'RESOLVED' : 'FAILING';
    try {
      await updateTestCaseStatus(project.id, tc.id, nextStatus);
      setTestCases((prev) =>
        prev.map((item) => (item.id === tc.id ? { ...item, status: nextStatus } : item))
      );
      notify(`Test case marked ${nextStatus.toLowerCase()}`, 'success');
    } catch {
      setError('Failed to update test case status');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-canvas overflow-hidden">
      <DsaToolbar
        activeTab={activeTab}
        hasMismatch={Boolean(mismatch)}
        language={language}
        runningTest={runningTest}
        onChangeTab={setActiveTab}
        onChangeLanguage={handleLanguageChange}
        onRunStressTest={handleRunStressTest}
      />

      {error && (
        <div
          role="alert"
          className="px-3.5 py-2.5 mx-4 mt-3 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2 shrink-0"
        >
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="p-0.5 text-rose-600 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="px-3.5 py-2.5 mx-4 mt-3 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 shrink-0"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            {statusMessage}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss status message"
            className="p-0.5 text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-3 sm:p-4">
        {activeTab === 'editor' && (
          <ProblemEditorTab
            language={language}
            problemDescription={problemDescription}
            userSolution={userSolution}
            synthesizing={synthesizing}
            runningTest={runningTest}
            onChangeProblem={setProblemDescription}
            onChangeSolution={setUserSolution}
            onResetTemplate={() => setUserSolution(LANGUAGE_TEMPLATES[language])}
            onSynthesizeSuite={handleSynthesizeSuite}
            onRunStressTest={handleRunStressTest}
          />
        )}

        {activeTab === 'suite' && (
          <FuzzingSuiteTab
            suite={suite}
            mismatch={mismatch}
            runningTest={runningTest}
            diagnosing={diagnosing}
            diagnosisText={diagnosisText}
            isSaved={isSaved}
            onRunStressTest={handleRunStressTest}
            onDiagnose={handleDiagnose}
            onSaveToDeck={handleSaveToDeck}
          />
        )}

        {activeTab === 'deck' && (
          <RevisionDeckTab
            testCases={testCases}
            loading={deckLoading}
            filter={deckFilter}
            onChangeFilter={setDeckFilter}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>
    </div>
  );
};
