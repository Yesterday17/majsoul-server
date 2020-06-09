import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { appDataDir, Global, GlobalPath, Logger } from '../global';
import { readFile, writeFile } from './fs';

interface RemoteDomain {
  id: number;
  name: string;
  domain: string;
}

export const RemoteDomains: RemoteDomain[] = [
  { id: 0, name: 'zh', domain: 'https://game.maj-soul.com/1' },
  { id: 1, name: 'jp', domain: 'https://game.mahjongsoul.com' },
  { id: 2, name: 'en', domain: 'https://mahjongsoul.game.yo-star.com' }
];

export function getServer(id: number | string): RemoteDomain {
  if (typeof id === 'string') {
    if (id.length == 1) id = Number(id);
    else if (id.length == 2) return RemoteDomains.filter(d => d.name === id)[0];
    else return RemoteDomains.filter(d => d.domain === id)[0];
  }
  return RemoteDomains[id];
}

// 判断请求是否为路由路径
export function isPath(url: string): boolean {
  return url.endsWith('\\') || url.endsWith('/') || url.includes('?');
}

/**
 * 读取远程的官方资源数据
 * @param url 原始请求的相对路径
 * @param encrypt 是否是加密数据
 */
export async function getMajsoul(
  server: RemoteDomain,
  url: string,
  encrypt = false
): Promise<{ code: number; data: Buffer }> {
  const remoteUrl = getRemoteUrl(server.domain, url);
  const response = await fetch(remoteUrl);

  const status = response.status;
  const data = await response.buffer();
  if (status === 301 || status === 302) {
    return getMajsoul(server, response.headers['location']);
  } else {
    return {
      code: status,
      data: data
    };
  }
}

// 将 path 转换为远程 URL
export function getRemoteUrl(domain: string, originalUrl: string): string {
  return domain + originalUrl.replace(/^\/\d\/?/g, '');
}

// 从远程 URI 转成本地存储路径
export function getLocalURI(prefix: string, originalUrl: string): string {
  const dirBase = path.join(appDataDir, GlobalPath.LocalDir);
  const result = /^([^?]+)(\?.*)?$/.exec(originalUrl);
  return result !== null ? path.join(dirBase, prefix, result[1]) : '';
}

// 获取资源，当本地存在时优先使用本地缓存
export async function getRemoteOrCachedFile(
  server: RemoteDomain,
  url: string,
  encode = true,
  callback: (data: Buffer) => Buffer = data => data
): Promise<{ code: number; data: Buffer | string }> {
  const originalUrl = url.replace(/^\/\d\//g, '');
  const isRoutePath = isPath(originalUrl);
  const localPath = getLocalURI(server.id.toString(), originalUrl);

  let statusCode = 200;

  let originData: Buffer | undefined = undefined;
  let responseData: Buffer;

  if (!isRoutePath && fs.existsSync(localPath)) {
    try {
      originData = await readFile(localPath);
    } catch {}
  }

  // 当上述 readFile 出现异常时或上述 if 条件不符合时向远端服务器请求
  if (originData === undefined) {
    try {
      const response = await getMajsoul(server, originalUrl, !isRoutePath);
      statusCode = response.code;
      let data = response.data;
      if (!isRoutePath && response.code.toString()[0] !== '4') {
        data = callback(response.data);
        writeFile(localPath, data);
      }
      originData = data;
    } catch (e) {
      return { code: 403, data: e };
    }
  }
  if (encode) {
    responseData = encodeData(originData);
  } else {
    responseData = originData;
  }
  return {
    code: statusCode,
    data: isRoutePath ? responseData.toString('utf-8') : responseData
  };
}

// 主进程获取资源
export async function fetchData(url: string, encoding = 'binary') {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': Global.HttpGetUserAgent
    }
  });
  return (await resp.buffer()).toString(encoding);
}

export function encodeData(
  data: Buffer | string,
  encoding: BufferEncoding = 'binary'
) {
  if (typeof data === 'string') {
    return Buffer.from(data, encoding);
  } else {
    return Buffer.from(data);
  }
}
