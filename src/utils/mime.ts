import * as Koa from 'koa';
import * as mime from 'mime-types';

export function handleMime(ctx: Koa.Context) {
  let type = mime.lookup(ctx.request.url);
  if (type !== false) {
    ctx.set('Content-Type', type);
  }
}
