import fs from 'fs';
import { Global } from './global';
import { fillObject } from './utils/object';

// 配置
export interface UserConfig {
  port: number;
  serverToPlay: number;
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
  let config: UserConfig;
  if (!fs.existsSync(Global.UserConfigPath)) SaveConfigJson(defaultConfig);
  try {
    config = JSON.parse(
      fs.readFileSync(Global.UserConfigPath, {
        encoding: 'utf-8'
      })
    );
  } catch (e) {
    config = {} as UserConfig;
  }
  config = fillObject(config, defaultConfig) as UserConfig;
  SaveConfigJson(config);
  return config;
}

export function SaveConfigJson(config: UserConfig) {
  fs.writeFileSync(Global.UserConfigPath, JSON.stringify(config, null, 2), {
    encoding: 'utf-8'
  });
}

export const UserConfig: UserConfig = LoadConfigJson();
