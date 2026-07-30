import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const root = new URL('../', import.meta.url);

test('Codex Sites build contains every frontend asset referenced by the pages', async () => {
  await execFileAsync(process.execPath, ['scripts/build-sites.mjs'], {
    cwd: root,
  });

  for (const page of ['index.html', 'intro.html']) {
    const html = await readFile(new URL(`dist/client/${page}`, root), 'utf8');
    const assetPaths = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1].split('?')[0])
      .filter((path) => path && !path.startsWith('http') && !path.startsWith('#'));

    for (const assetPath of assetPaths) {
      await assert.doesNotReject(
        access(new URL(`dist/client/${assetPath}`, root)),
        `${page} 引用的 ${assetPath} 未包含在 Sites 构建产物中`,
      );
    }
  }
});
