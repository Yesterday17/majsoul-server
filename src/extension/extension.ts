import { Global } from '../global';
import { getFoldersSync } from '../utils/fs';
import manager from './manager';

export let ExtensionManager: manager;

export function LoadExtension() {
  // 初始化 manager
  ExtensionManager = new manager(Global.ExtensionConfigPath);

  // 加载配置
  ExtensionManager.loadEnabled();

  // 扫描目录
  const extension: string[] = getFoldersSync(Global.ExtensionFolderPath);
  extension.forEach(extension => ExtensionManager.load(extension));
  ExtensionManager.enableFromConfig();
  ExtensionManager.save();
}
