const { checkCompilers, handleSingleRun, handleStressTest } = require('../runner.js');

async function testAll() {
  console.log('--- 1. Testing Compiler Detection ---');
  const compilers = await checkCompilers();
  console.log('Compilers found:', compilers);

  console.log('\n--- 2. Testing Single Run (Python: A + B) ---');
  const pyCode = `
import sys
data = sys.stdin.read().split()
if data:
    a, b = int(data[0]), int(data[1])
    print(a + b)
`;
  const singleResult = await handleSingleRun({
    language: 'PYTHON',
    code: pyCode,
    input: '15 27\n',
    expectedOutput: '42'
  });
  console.log('Single run result:', {
    status: singleResult.status,
    isMatch: singleResult.isMatch,
    actualOutput: singleResult.actualOutput ? singleResult.actualOutput.trim() : null,
    runtimeMs: singleResult.runtimeMs
  });
  if (!singleResult.isMatch) throw new Error('Single run failed matching expected output');

  console.log('\n--- 3. Testing Differential Stress Test Loop ---');
  // Student has a subtle bug: only handles up to 50
  const studentCode = `
import sys
data = sys.stdin.read().split()
if data:
    val = int(data[0])
    if val > 50:
        print(val * 2 + 1) # Bug!
    else:
        print(val * 2)
`;

  // Guaranteed brute force
  const bruteForceCode = `
import sys
data = sys.stdin.read().split()
if data:
    val = int(data[0])
    print(val * 2)
`;

  // Generator: generates random integer 1 to 100
  const generatorCode = `
import random
print(random.randint(1, 100))
`;

  const stressResult = await handleStressTest({
    language: 'PYTHON',
    studentCode,
    bruteForceCode,
    generatorCode,
    maxIterations: 50
  });

  console.log('Stress test result:', {
    success: stressResult.success,
    mismatchFound: stressResult.mismatchFound,
    iteration: stressResult.iteration,
    breakingInput: stressResult.input ? stressResult.input.trim() : null,
    expectedOutput: stressResult.expectedOutput ? stressResult.expectedOutput.trim() : null,
    actualOutput: stressResult.actualOutput ? stressResult.actualOutput.trim() : null,
    status: stressResult.status
  });

  if (!stressResult.mismatchFound) {
    throw new Error('Expected stress test to find the mismatch, but none was found');
  }

  console.log('\n🎉 ALL RUNNER TESTS PASSED! Local compilation, execution, and differential loop work perfectly.');
}

testAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
