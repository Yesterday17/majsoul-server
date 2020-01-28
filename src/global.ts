import os from 'os';
import path from 'path';
import { ConsoleLogger } from './utils/logger';

export const Logger = new ConsoleLogger('Majsoul_Plus');

export interface GlobalPath {
  LocalDir: string;
  ResourcePackDir: string;
  ExtensionDir: string;
}

// 保存数据的路径
export const appDataDir = path.resolve('data');

export const GlobalPath = {
  LocalDir: 'static',
  ResourcePackDir: 'resourcepack',
  ExtensionDir: 'extension'
};

export class Global {
  public static readonly XOR_KEY = 73;
  public static readonly EXTEND_RES_KEYWORD = 'extendRes';
  public static readonly UserConfigPath = path.join(appDataDir, 'config.json');
  public static readonly LocalCachePath = path.join(
    appDataDir,
    GlobalPath.LocalDir
  );
  public static readonly ResourceFolderPath = path.join(
    appDataDir,
    GlobalPath.ResourcePackDir
  );
  public static readonly ExtensionFolderPath = path.join(
    appDataDir,
    GlobalPath.ExtensionDir
  );
  public static readonly ResourcePackConfigPath = path.join(
    appDataDir,
    GlobalPath.ResourcePackDir,
    'active.json'
  );
  public static readonly ExtensionConfigPath = path.join(
    appDataDir,
    GlobalPath.ExtensionDir,
    'active.json'
  );
  public static readonly HttpGetUserAgent = `Mozilla/5.0 (${os.type()} ${os.release()}; ${os.arch()}) MajsoulServer/${'1.0.0'} Chrome/${'19.19.810'}`;
}
