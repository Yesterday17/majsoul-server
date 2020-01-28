import { UserConfig } from './config';
import { LoadExtension } from './extension/extension';
import { LoadResourcePack } from './resourcepack/resourcepack';
import { MajsoulServer } from './server';

// 加载资源包
LoadResourcePack();

// 加载扩展
LoadExtension();

// 加载服务器路由规则 并 启动服务器
new MajsoulServer().listen(UserConfig.port);
