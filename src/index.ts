#!/usr/bin/env node

import Erii from 'erii';
import fs from 'fs';
import { UserConfig } from './config';
import { ExtensionManager, LoadExtension } from './extension/extension';
import { appDataDir, Global, Logger } from './global';
import {
  LoadResourcePack,
  ResourcePackManager
} from './resourcepack/resourcepack';
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

// 加载资源包
LoadResourcePack();

// 加载扩展
LoadExtension();

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
    name: ['extension', 'ext'],
    description: 'Extension related commands'
  },
  (ctx, options) => {
    if (options.enable) {
      ExtensionManager.changeEnable(options.enable.toString(), true);
    } else if (options.disable) {
      ExtensionManager.changeEnable(options.enable.toString(), false);
    } else if (options.list) {
      Logger.info('Listing all extensions...');
      Object.values(ExtensionManager.getDetails())
        .sort((a, b) => a.sequence - b.sequence)
        .forEach(value => {
          if (value.errors.length === 0) {
            if (value.enabled) {
              Logger.success(
                `${value.sequence}. ${value.metadata.name}(${value.metadata.id}): Enabled`
              );
            } else {
              Logger.info(
                `114514. ${value.metadata.name}(${value.metadata.id}): Disabled`
              );
            }
          } else {
            Logger.error(
              `-1. ${value.metadata.name}(${value.metadata.id}): Error-Disabled`
            );
            value.errors.forEach((err, index) => {
              if (Array.isArray(err)) {
                err = err.join(', ');
              }
              Logger.error(`   (${index + 1}): ${err}`);
            });
          }
        });
    } else {
      ctx.showHelp();
    }
  }
);

Erii.addOption({
  name: 'enable',
  command: 'extension',
  description: 'Enable extension',
  argument: {
    name: 'extension_id',
    description: 'Extension id'
  }
});

Erii.addOption({
  name: 'disable',
  command: 'extension',
  description: 'Disable extension',
  argument: {
    name: 'extension_id',
    description: 'Extension id'
  }
});

Erii.addOption({
  name: 'list',
  command: 'extension',
  description: 'List extensions'
});

Erii.bind(
  {
    name: ['resourcepack', 'resource', 'res', 'resp'],
    description: 'ResourcePack related commands'
  },
  (ctx, options) => {
    if (options.enable) {
      ResourcePackManager.changeEnable(options.enable.toString(), true);
    } else if (options.disable) {
      ResourcePackManager.changeEnable(options.enable.toString(), false);
    } else if (options.list) {
      Logger.info('Listing all resourcepacks...');
      Object.values(ResourcePackManager.getDetails())
        .sort((a, b) => a.sequence - b.sequence)
        .forEach(value => {
          if (value.errors.length === 0) {
            if (value.enabled) {
              Logger.success(
                `${value.sequence}. ${value.metadata.name}(${value.metadata.id}): Enabled`
              );
            } else {
              Logger.info(
                `114514. ${value.metadata.name}(${value.metadata.id}): Disabled`
              );
            }
          } else {
            Logger.error(
              `-1. ${value.metadata.name}(${value.metadata.id}): Error-Disabled`
            );
            value.errors.forEach((err, index) => {
              if (Array.isArray(err)) {
                err = err.join(', ');
              }
              Logger.error(`   (${index + 1}): ${err}`);
            });
          }
        });
    } else {
      ctx.showHelp();
    }
  }
);

Erii.addOption({
  name: 'enable',
  command: 'resourcepack',
  description: 'Enable resourcepack',
  argument: {
    name: 'resourcepack_id',
    description: 'ResourcePack id'
  }
});

Erii.addOption({
  name: 'disable',
  command: 'resourcepack',
  description: 'Disable resourcepack',
  argument: {
    name: 'resourcepack_id',
    description: 'ResourcePack id'
  }
});

Erii.addOption({
  name: 'list',
  command: 'resourcepack',
  description: 'List resourcepacks'
});

Erii.bind(
  {
    name: ['launch', 'start'],
    description: 'Launch server'
  },
  () => {
    // 加载服务器路由规则并启动服务器
    Logger.success(`Listening at localhost:${UserConfig.port}...`);
    new MajsoulServer().listen(UserConfig.port);
  }
);

Erii.default(() => {
  Erii.showHelp();
});

Erii.okite();
