import { mkdir, copyFile } from 'node:fs/promises';
await mkdir(new URL('../app/dist/', import.meta.url), { recursive: true });
for (const name of ['index.html', 'styles.css', 'app.js', 'engine.js', 'concepts.html', 'concepts.css', 'concepts.js']) await copyFile(new URL('../app/' + name, import.meta.url), new URL('../app/dist/' + name, import.meta.url));
console.log('Built app/dist');
