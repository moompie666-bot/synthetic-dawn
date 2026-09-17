import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const target = 'story/legacy-export.json';
if (existsSync(target)) throw new Error('Legacy archive already exists; refusing to overwrite.');
const html = readFileSync('index.html', 'utf8');
const data = JSON.parse(html.match(/<script id="story-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
mkdirSync('story', { recursive: true });
writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
console.log(`Archived ${data.nodes.length} legacy nodes without changing them.`);
