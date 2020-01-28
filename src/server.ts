import http from 'http';
import Koa from 'koa';
import Router from 'koa-router';
import { ExtensionManager } from './extension/extension';
import { ResourcePackManager } from './resourcepack/resourcepack';
import { getRemoteOrCachedFile, getServer } from './utils/majsoul';
import { handleMime } from './utils/mime';

export class MajsoulServer {
  httpServer: http.Server;

  constructor() {
    const router = new Router({ prefix: '/:server' });
    const server = new Koa();

    // 注册资源包路由
    ResourcePackManager.register(server, router);

    // 注册扩展路由
    ExtensionManager.register(server, router);

    // 使用 koa-router 的路由
    server.use(router.routes());

    // 处理国服的 region/region.txt
    server.use(async (ctx, next) => {
      if (ctx.request.url.endsWith('/region.txt')) {
        ctx.response.status = 200;
        ctx.body = 'mainland';
      } else {
        await next();
      }
    });

    // 默认从远端获取文件
    server.use(async ctx => {
      let result = /^\/(zh|en|jp|0|1|2)$/.exec(ctx.request.url);
      if (result != null) {
        ctx.response.status = 301;
        ctx.redirect(`/${result[1]}/`);
        return;
      }

      result = /\/([^/]+)(\/.*)?/.exec(ctx.request.url);
      if (result != null) {
        const response = await getRemoteOrCachedFile(
          getServer(result[1]),
          (result[2] ?? '/').replace(/index.html$/, '')
        );

        ctx.response.status = response.code;
        ctx.body = response.data;
        handleMime(ctx);
      }
    });

    this.httpServer = http.createServer(server.callback());
  }

  listen(port: number) {
    this.httpServer.listen(port);
  }

  close() {
    this.httpServer.close();
  }
}
