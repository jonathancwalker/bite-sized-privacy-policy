import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ASSETS, readAppAsset } from './assets.mjs';

const output = new URL('../app/dist/', import.meta.url);
await rm(output, {recursive:true, force:true});
for (const name of APP_ASSETS) {
  const destination = new URL(name, output);
  await mkdir(dirname(fileURLToPath(destination)), {recursive:true});
  await writeFile(destination, await readAppAsset(name));
}
console.log('Built app/dist');
