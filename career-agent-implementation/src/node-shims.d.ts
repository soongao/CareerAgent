declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd(): string;
  pid: number;
  exitCode?: number;
};

declare module "node:crypto" { export function randomUUID(): string; }
declare module "node:fs/promises" {
  export const readFile: any;
  export const writeFile: any;
  export const mkdir: any;
  export const appendFile: any;
  export const access: any;
  export const rename: any;
  export const copyFile: any;
  export const readdir: any;
  export const mkdtemp: any;
  export const rm: any;
}
declare module "node:path" {
  export const basename: any;
  export const dirname: any;
  export const join: any;
  export const relative: any;
  export const resolve: any;
  export const sep: any;
  export const extname: any;
}
declare module "node:child_process" { export const execFile: any; }
declare module "node:util" { export const promisify: any; }
declare module "node:os" { export const tmpdir: any; }
declare module "node:test" { const test: any; export default test; export const describe: any; export const it: any; }
declare module "node:assert/strict" { const assert: any; export default assert; }
declare module "node:fs" { export function existsSync(path: string): boolean; }
declare module "node:url" { export function pathToFileURL(path: string): { href: string }; }
