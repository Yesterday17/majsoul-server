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
  LocalDir: '/static',
  ResourcePackDir: 'resourcepack',
  ExtensionDir: 'extension'
};

export const RemoteDomains = [
  { id: 0, name: 'zh', domain: 'https://www.majsoul.com/1' },
  { id: 1, name: 'jp', domain: 'https://game.mahjongsoul.com' },
  { id: 2, name: 'en', domain: 'https://mahjongsoul.game.yo-star.com' }
];

export class Global {
  public static XOR_KEY = 73;
  public static EXTEND_RES_KEYWORD = 'extendRes';
  public static ResourcePackConfigPath = '';
  public static ExtensionConfigPath = '';
  public static UserConfigPath = path.join(appDataDir, 'config.json');
  public static LocalCachePath = path.join(appDataDir, GlobalPath.LocalDir);
  public static ResourceFolderPath = path.join(
    appDataDir,
    GlobalPath.ResourcePackDir
  );
  public static ExtensionFolderPath = path.join(
    appDataDir,
    GlobalPath.ExtensionDir
  );
  public static HttpGetUserAgent = `Mozilla/5.0 (${os.type()} ${os.release()}; ${os.arch()}) MajsoulServer/${'1.0.0'} Chrome/${'19.19.810'}`;
}

export function InitGlobal() {
  [Global.ResourcePackConfigPath, Global.ExtensionConfigPath] = [
    GlobalPath.ResourcePackDir,
    GlobalPath.ExtensionDir
  ].map(dir => path.join(appDataDir, dir, 'active.json'));
}
