import * as Path from 'path';
import { ls, exec, pwd } from 'shelljs';
import { getObjectFromFile } from './utils';
import {
  CONFIG_FILE,
  SMPC,
  KEY_GROUP_REGEXP,
  SMP_TARGET_OBJECT,
} from './constant';
import { SmpConfig } from './type';
import { smpLog } from './logger';

export function buildStorage(
  michelsonStorage: string,
  keys: { [key: string]: string },
): string {
  smpLog.trace('buildStorage');
  const match = michelsonStorage.match(new RegExp(KEY_GROUP_REGEXP, 'g'));

  return match
    ? match
        .map((s) => {
          const m = s.match(KEY_GROUP_REGEXP) as RegExpMatchArray;
          return { toReplace: m.input as string, key: (m.groups as any).key };
        })
        .reduce(
          (acc, m) => acc.replace(m.toReplace, keys[m.key]),
          michelsonStorage,
        )
    : michelsonStorage;
}

function buildFromPath(path: string, config: SmpConfig): void {
  const sourceRoot = Path.join(pwd().toString(), config.srcDir);
  const dir = Path.dirname(path);
  const filename = Path.basename(path);

  smpLog.info(`Building ${filename.split('.')[0]}...`);

  const ccCmd = `${SMPC} ${path} ${dir}/dist`;

  const result = exec(ccCmd, { fatal: true });

  if (result.code > 0) {
    throw new Error(result.stderr);
  }
}

export function buildAll(): void {
  const config = getObjectFromFile(CONFIG_FILE);
  const sourcesDirectory = config.srcDir;
  const filesPattern = config.pattern;

  const paths = ls(Path.join(sourcesDirectory, filesPattern));

  for (const filePath of paths) {
    buildFromPath(filePath, config);
  }
}
