import http from 'http';
import Koa from 'koa';
import Router from 'koa-router';
import { getRemoteOrCachedFile, getServer } from './utils/majsoul';
import { handleMime } from './utils/mime';

export class MajsoulServer {
  httpServer: http.Server;

  constructor() {
    const router = new Router({ prefix: '/:server' });
    const server = new Koa();

    // 使用 koa-router 的路由
    server.use(router.routes());

    // 默认从远端获取文件
    server.use(async ctx => {
      let result = /^\/(zh|en|jp|0|1|2)$/.exec(ctx.request.url);
      if (result != null) {
        ctx.response.status = 301;
        ctx.redirect(`/${result[1]}/`);
        return;
      }

      result = /\/([^/]+)(\/.*)/.exec(ctx.request.url);
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
