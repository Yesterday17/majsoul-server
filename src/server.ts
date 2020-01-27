import http from 'http';
import Koa from 'koa';
import Router from 'koa-router';
import { UserConfig } from './config';
import { ExtensionManager } from './extension/extension';
import { Logger } from './global';
import { ResourcePackManager } from './resourcepack/resourcepack';
import { getRemoteOrCachedFile, isPath } from './utils/majsoul';

export function LoadServer() {
  const router = new Router();
  const server = new Koa();

  // 注册资源包路由
  ResourcePackManager.register(server, router);

  // 注册扩展路由
  ExtensionManager.register(server, router);

  // 使用 koa-router 的路由
  server.use(router.routes());

  // 处理国服的 region/region.txt
  server.use(async (ctx, next) => {
    if (
      UserConfig.serverToPlay === 0 &&
      ctx.request.originalUrl === '/region.txt'
    ) {
      ctx.res.statusCode = 200;
      ctx.body = 'mainland';
    } else {
      await next();
    }
  });

  // 默认从远端获取文件
  server.use(async ctx => {
    const isRoutePath = isPath(ctx.request.originalUrl);
    const resp = await getRemoteOrCachedFile(ctx.request.originalUrl);
    ctx.res.statusCode = resp.code;
    ctx.body = isRoutePath ? resp.data.toString('utf-8') : resp.data;
  });

  httpServer = http.createServer(server.callback());
}

export function ListenServer(port: number) {
  // 初始化本地镜像服务器，当端口被占用时会随机占用另一个端口
  httpServer.listen(port);
  httpServer.on('error', err => {
    Logger.error(err.message, true);
  });
}

export let httpServer: http.Server;
