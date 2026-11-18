const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const scripts = [path.join(root, 'server.js'), ...['js', 'scripts', 'tests'].flatMap(directory => fs.readdirSync(path.join(root, directory)).filter(file => file.endsWith('.js')).map(file => path.join(root, directory, file)))];
let failed = false;
for (const script of scripts) {
  const result = spawnSync(process.execPath, ['--check', script], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); failed = true; }
}
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?#]+)"/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) { console.error(`${file}: missing ${match[1]}`); failed = true; }
  }
}
if (failed) process.exitCode = 1;
else console.log(`Syntax checked ${scripts.length} JavaScript files; HTML assets exist.`);
