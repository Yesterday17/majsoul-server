#!/usr/bin/env node

import Erii from 'erii';
import fs from 'fs';
import { UserConfig } from './config';
import { appDataDir, Global, Logger } from './global';
import { MajsoulServer } from './server';

if (!fs.existsSync(appDataDir)) {
  Logger.error('Data 目录不存在！', true);
}

UserConfig.LoadConfigJson();

if (!fs.existsSync(Global.ExtensionFolderPath)) {
  fs.mkdirSync(Global.ExtensionFolderPath);
}

if (!fs.existsSync(Global.ResourceFolderPath)) {
  fs.mkdirSync(Global.ResourceFolderPath);
}

process.on('uncaughtException', err => {
  Logger.error(`uncaughtException: ${err.name} - ${err.message}`);
});

Erii.setMetaInfo({
  version: '1.0.0',
  name: 'majsoul-server'
});

Erii.bind(
  {
    name: ['help', 'h'],
    description: 'Show help documentation',
    argument: {
      name: 'command',
      description: 'Show help of a specified command'
    }
  },
  ctx => ctx.showHelp()
);

Erii.bind(
  {
    name: ['version'],
    description: 'Show version'
  },
  ctx => ctx.showVersion()
);

Erii.bind(
  {
    name: ['launch', 'start'],
    description: 'Launch server'
  },
  () => {
    // 加载服务器路由规则并启动服务器
    Logger.success(`Listening at http://localhost:${UserConfig.port}/`);
    new MajsoulServer().listen(UserConfig.port);
  }
);

Erii.default(() => {
  Erii.showHelp();
});

Erii.okite();
