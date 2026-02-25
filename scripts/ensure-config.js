import { existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import fs from 'node:fs';


const defaultPath = 'config-default.json';
const configPath = 'config.json';

if (!existsSync(configPath)) {
  console.log('config.json not found; creating it from config-default.json');
  copyFileSync(defaultPath, configPath);
} else {
  console.log('config.json already exists — OK');
}

