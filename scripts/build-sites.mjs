import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const root = new URL('../', import.meta.url);
const files = ['index.html', 'styles.css', 'extras.css', 'extras-3.css'];
const folders = ['src', 'assets'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) await cp(new URL(file, root), new URL(file, output));
for (const folder of folders) await cp(new URL(folder, root), new URL(folder, output), { recursive: true });
await mkdir(new URL('server/', output), { recursive: true });
await writeFile(new URL('server/index.js', output), `export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};\n`);
