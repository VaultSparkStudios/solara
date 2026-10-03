import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
test('Pages publication waits for unit and gameplay checks', () => {
  const publish = workflow.indexOf('uses: actions/upload-pages-artifact@');
  for (const command of ['npm run build:pages', 'npm test', 'npm run smoke']) {
    const position = workflow.indexOf(`run: ${command}`);
    assert.ok(position >= 0 && position < publish, `${command} must pass before publication`);
  }
});
test('Pages rebuilds when public assets or dependency resolution change', () => {
  for (const path of ['public/**', 'package-lock.json', 'scripts/generate-public-status.mjs']) {
    assert.ok(workflow.includes(`- "${path}"`), `${path} must trigger deployment`);
  }
});
