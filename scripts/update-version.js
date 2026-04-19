import { readFileSync, writeFileSync } from 'fs';

const version = process.argv[2];
const path = '.claude-plugin/plugin.json';
const plugin = JSON.parse(readFileSync(path, 'utf8'));
plugin.version = version;
writeFileSync(path, JSON.stringify(plugin, null, 2) + '\n');
