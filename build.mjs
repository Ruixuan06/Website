import {build} from 'vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
await build({root:fileURLToPath(new URL('./source',import.meta.url)),plugins:[react()],build:{outDir:fileURLToPath(new URL('./public',import.meta.url)),emptyOutDir:true}});
await writeFile(new URL('./secure-api.mjs',import.meta.url),ts.transpileModule(await readFile(new URL('./source/secure-api.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
