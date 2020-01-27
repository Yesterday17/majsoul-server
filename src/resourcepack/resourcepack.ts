import { Global } from '../global';
import { getFoldersSync } from '../utils/fs';
import manager from './manager';

export let ResourcePackManager: manager;

export function LoadResourcePack() {
  // 初始化 manager
  ResourcePackManager = new manager(Global.ResourcePackConfigPath);

  // 加载配置
  ResourcePackManager.loadEnabled();

  // 扫描目录
  const resourcepacks: string[] = getFoldersSync(Global.ResourceFolderPath);
  resourcepacks.forEach(resp => ResourcePackManager.load(resp));
  ResourcePackManager.enableFromConfig();
  ResourcePackManager.save();
}
