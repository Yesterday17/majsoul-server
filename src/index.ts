import { UserConfig } from './config';
import { LoadExtension } from './extension/extension';
import { InitGlobal } from './global';
import { LoadResourcePack } from './resourcepack/resourcepack';
import { ListenServer, LoadServer } from './server';

// 初始化全局变量
InitGlobal();

// 加载资源包
LoadResourcePack();

// 加载扩展
LoadExtension();

// 加载服务器路由规则
LoadServer();

// 启动服务器
ListenServer(UserConfig.port);
