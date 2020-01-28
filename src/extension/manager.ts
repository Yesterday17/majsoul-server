import fs from 'fs';
import Koa from 'koa';
import Router from 'koa-router';
import path from 'path';
import { format } from 'prettier';
import BaseManager from '../base/BaseManager';
import { Metadata } from '../base/Metadata';
import { UserConfig } from '../config';
import { appDataDir, GlobalPath, Logger } from '../global';
import { ResourcePackReplaceEntry } from '../resourcepack/manager';
import { ResourcePackManager } from '../resourcepack/resourcepack';
import { fetchData, getRemoteOrCachedFile, getServer } from '../utils/majsoul';
import * as schema from './schema.json';

export interface Extension extends Metadata {
  entry: string | string[];
  loadBeforeGame: boolean;
  applyServer: number[];
  resourcepack: Array<string | ResourcePackReplaceEntry>;
}

interface ExtensionLoader {
  codeVersion: string;
  hasLauncher: boolean;
  pre: string[];
  post: string[];
  launcher: string;
}

const defaultExtension: Extension = {
  id: 'majsoul_plus',
  version: '2.0.0',
  name: '未命名',
  author: '未知作者',
  description: '无描述',
  preview: 'preview.png',
  dependencies: {},

  entry: 'script.js',
  loadBeforeGame: false,
  applyServer: [0, 1, 2],
  resourcepack: []
};

Object.freeze(defaultExtension);

export default class MajsoulPlusExtensionManager extends BaseManager {
  private extensionScripts: Map<string, string[]> = new Map();
  private codejs = '';

  private useScriptPromises: Promise<void[]>[] = [];

  constructor(configPath: string) {
    super('extension', configPath, defaultExtension, schema);
  }

  load(id: string) {
    this.use(id, pack => {
      ResourcePackManager.loadExtensionPack(pack as Extension);
    });
  }

  enableFromConfig() {
    super.enableFromConfig();
    ResourcePackManager.setLoadedExtensions(this.getDetails());
  }

  clear() {
    super.clear();
    ResourcePackManager.clearExtensionPack();
    this.extensionScripts = new Map();
    this.codejs = '';
    this.useScriptPromises = [];
  }

  addScript(id: string, script: string) {
    const scripts = this.extensionScripts.get(id) || [];
    scripts.push(script);
    this.extensionScripts.set(id, scripts);
  }

  async useScript(folder: string, extension: Extension) {
    if (!Array.isArray(extension.entry)) {
      extension.entry = [extension.entry] as string[];
    }

    const err = false;

    const useScript = async (entry: string) => {
      if (err) return;

      // 加载远程脚本 远程脚本不缓存
      if (entry.match(/^https?:\/\//)) {
        const script = await fetchData(entry, 'utf-8');
        this.addScript(extension.id, script);
      } else {
        // 本地脚本
        const p = path.resolve(
          appDataDir,
          GlobalPath.ExtensionDir,
          folder,
          entry
        );
        if (!fs.existsSync(p)) {
          Logger.error(`未找到本地脚本: ${entry}`);
          return;
        }

        try {
          const script = fs.readFileSync(p, { encoding: 'utf-8' });
          this.addScript(extension.id, script);
        } catch (e) {
          Logger.error(`属于 ${extension.name} 的脚本 ${p} 加载失败: ${e}`);
          this.addScript(
            extension.id,
            `// failed to load extension ${extension.name} from ${p}: ${e}`
          );
        }
      }
    };

    return Promise.all(extension.entry.map(useScript));
  }

  register(server: Koa, router: Router) {
    // 加载扩展脚本
    for (const key in this.loadedDetails) {
      if (this.loadedDetails[key]) {
        const pack = this.loadedDetails[key];
        if (
          pack.enabled &&
          (pack.metadata as Extension).applyServer.includes(
            UserConfig.serverToPlay
          )
        ) {
          this.useScriptPromises.push(
            this.useScript(pack.metadata.id, pack.metadata as Extension)
          );
        }
      }
    }

    router.get('/:version/code.js', async (ctx, next) => {
      if (this.codejs !== '') {
        ctx.response.status = 200;
        ctx.body = this.codejs;
      }

      const loader: ExtensionLoader = {
        codeVersion: ctx.params.version,
        hasLauncher: false,
        pre: [],
        post: [],
        launcher: ''
      };

      Array.from(this.extensionScripts.keys())
        .filter(key => this.loadedDetails[key].sequence > 0)
        .sort(
          (a, b) =>
            this.loadedDetails[a].sequence - this.loadedDetails[b].sequence
        )
        .forEach(id => {
          // 当未加载时跳出
          if (!this.loadedDetails[id].enabled) return;

          const extension = this.loadedDetails[id].metadata as Extension;
          if (extension.applyServer.includes(UserConfig.serverToPlay)) {
            if (!loader.hasLauncher && id.endsWith('_launcher')) {
              loader.hasLauncher = true;
              loader.launcher = id;
              return;
            } else if (loader.hasLauncher && id.endsWith('_launcher')) {
              Logger.error(`存在多个启动器拓展！`, true);
            }
            if (extension.loadBeforeGame) {
              loader.pre.push(id);
            } else {
              loader.post.push(id);
            }
          }
        });

      this.codejs = `const Majsoul_Plus = {};
Majsoul_Plus.$ = ${JSON.stringify(loader, null, 2)};
[...Majsoul_Plus.$.pre, ...Majsoul_Plus.$.post, ...(Majsoul_Plus.$.hasLauncher ? [Majsoul_Plus.$.launcher] : [])].forEach(ext => Majsoul_Plus[ext] = {});

(async () => {
  const $ = Majsoul_Plus.$;
  await Promise.all(
    ['console', 'fetch'].map(name => addScript(\`majsoul_plus/plugin/\${name}.js\`))
  );

  await addScript(\`majsoul_plus/\${$.codeVersion}/code.js\`);

  await Promise.all(
    $.pre.map(ext => addScript(\`majsoul_plus/extension/scripts/\${ext}/\`))
  );

  if ($.hasLauncher) {
    await addScript(\`majsoul_plus/extension/scripts/\${$.launcher}/\`)
  } else {
    new GameMgr();
  }

  await Promise.all(
    $.post.map(ext => addScript(\`majsoul_plus/extension/scripts/\${ext}/\`))
  );
})()

function addScript(url) {
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = url;
    tag.async = false;
    tag.onload = resolve;
    tag.onerror = reject;
    document.head.appendChild(tag);
  });
}
`;
      ctx.response.status = 200;
      ctx.res.setHeader('Content-Type', 'application/javascript');
      ctx.body = format(this.codejs, { parser: 'babel' });
    });

    // 获取扩展基本信息
    router.get(`/majsoul_plus/extension/:id`, async (ctx, next) => {
      if (ctx.params.id === 'scripts') {
        await next();
        return;
      }

      ctx.response.status = this.loadedMap.has(ctx.params.id) ? 200 : 404;
      ctx.body = this.loadedMap.has(ctx.params.id)
        ? JSON.stringify(this.loadedMap.get(ctx.params.id), null, 2)
        : 'Not Found';
    });

    router.get(`/majsoul_plus/extension/scripts/:id`, async (ctx, next) => {
      if (!this.loadedMap.has(ctx.params.id)) {
        ctx.response.status = 404;
        return;
      }

      // 等待所有脚本加载完成
      await Promise.all(this.useScriptPromises);

      const extension = this.loadedMap.get(ctx.params.id) ?? defaultExtension;
      const scripts = this.extensionScripts.get(ctx.params.id) ?? [];

      ctx.response.status = 200;
      ctx.res.setHeader('Content-Type', 'application/javascript');
      ctx.body = format(
        `/**
* Extension： ${extension.id}
* Author: ${extension.author}
* Version: ${extension.version}
*/
((context, console, fetchSelf) => {
     ${scripts
       .map(
         script => `  try {
     ${script}
  } catch(e) {
    console.error('Unresolved Error', e);
  }`
       )
       .join('\n')}
})(
  Majsoul_Plus.${extension.id},
  extensionConsole('${extension.id}'),
  extensionFetch('${extension.id}')
);`,
        { parser: 'babel' }
      );
    });

    router.get(`/majsoul_plus/:version/code.js`, async (ctx, next) => {
      const url = ctx.request.url.replace(
        new RegExp(`^/${ctx.params.server}/majsoul_plus`),
        ''
      );
      const code = (
        await getRemoteOrCachedFile(
          getServer(ctx.params.server),
          url,
          false,
          data =>
            getServer(ctx.params.server).id === 0
              ? Buffer.from(
                  data
                    .toString('utf-8')
                    .replace(/\.\.\/region\/region\.txt/g, 'region.txt')
                )
              : data
        )
      ).data.toString('utf-8');
      ctx.res.setHeader('Content-Type', 'application/javascript');
      ctx.body = code.substr(0, code.length - 'new GameMgr();'.length + 2);
    });

    router.get('/majsoul_plus/plugin/console.js', async (ctx, next) => {
      const result = format(
        `
        const extensionConsole = id => {
          return new Proxy(
            {},
            {
              get: (target, name) => {
                return typeof console[name] !== 'function'
                  ? () => undefined
                  : (...args) => {
                      if (args.length === 0) return undefined
                      else if (typeof args[0] === 'string')
                        args[0] = \`[\${id}] \${args[0]}\`
                      else args = [\`[\${id}]\`, ...args]
                      return console[name].apply(this, args)
                    }
              }
            }
          )
        }
      `,
        { parser: 'babel' }
      );
      ctx.response.status = 200;
      ctx.res.setHeader('Content-Type', 'application/javascript');
      ctx.body = result;
    });

    router.get('/majsoul_plus/plugin/fetch.js', async (ctx, next) => {
      ctx.response.status = 200;
      ctx.res.setHeader('Content-Type', 'application/javascript');
      ctx.body = `window.extensionFetch = id => {
  return (input, init) => {
    if (typeof input !== 'string') {
      return
    }
    return fetch(\`majsoul_plus/extension/\${id}/\${input}\`, init)
  }
}`;
    });
  }

  changeEnable(id: string, enabled: boolean) {
    super.changeEnable(id, enabled);
    ResourcePackManager.setLoadedExtensions(this.loadedDetails);
  }

  removePack(id: string) {
    super.removePack(id);
    ResourcePackManager.setLoadedExtensions(this.loadedDetails);
  }
}
