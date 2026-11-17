const { handleSingleRun, handleStressTest } = require('../runner.js');

async function testCpp() {
  console.log('--- Testing C++ Compilation and Execution with g++ ---');
  const cppCode = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    }
    return 0;
}
`;

  const res = await handleSingleRun({
    language: 'CPP',
    code: cppCode,
    input: '100 250\n',
    expectedOutput: '350'
  });

  console.log('C++ Run Result:', {
    status: res.status,
    isMatch: res.isMatch,
    actualOutput: res.actualOutput ? res.actualOutput.trim() : null,
    runtimeMs: res.runtimeMs
  });

  if (!res.isMatch) throw new Error('C++ run failed');
  console.log('🎉 C++ COMPILATION & EXECUTION WITH G++ PASSED!');
}

testCpp().catch(err => {
  console.error('C++ error:', err);
  process.exit(1);
});
