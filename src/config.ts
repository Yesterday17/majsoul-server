import fs from 'fs';
import { Global } from './global';
import { fillObject } from './utils/object';

// 配置
export interface UserConfig {
  port: number;
  serverToPlay: 0 | 1 | 2;
}

// 默认配置
const defaultConfig: UserConfig = {
  port: 11451,
  serverToPlay: 0
};

// 冻结对象使其不可更改
Object.freeze(defaultConfig);

// 加载配置文件 json
export function LoadConfigJson(): UserConfig {
  let config = { ...defaultConfig };
  if (fs.existsSync(Global.UserConfigPath)) {
    try {
      config = JSON.parse(
        fs.readFileSync(Global.UserConfigPath, {
          encoding: 'utf-8'
        })
      );
      config = fillObject(config, defaultConfig) as UserConfig;
      SaveConfigJson(config);
    } catch {}
  }
  return config;
}

export function SaveConfigJson(config: UserConfig) {
  fs.writeFileSync(Global.UserConfigPath, JSON.stringify(config, null, 2), {
    encoding: 'utf-8'
  });
}

export const UserConfig: UserConfig = LoadConfigJson();
