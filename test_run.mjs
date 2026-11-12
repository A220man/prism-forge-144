import { spawn } from 'node:child_process';

function runInspect(args) {
    const proc = spawn('node', ['scripts/inspect.mjs', ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
}

async function main() {
  console.log('Testing inspect CLI...');
  const result = await runInspect(['tests/fixtures/simple.html', '--widths', '1440']);
  console.log('Exit code:', result.code);
  console.log('STDOUT:', result.stdout);
  console.log('STDERR:', result.stderr);
}

main().catch(console.error);

</arg_key>
<arg_key=i</arg_key>
<arg_value>Create test runner script