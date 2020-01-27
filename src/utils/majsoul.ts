import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { UserConfig } from '../config';
import {
  appDataDir,
  Global,
  GlobalPath,
  Logger,
  RemoteDomains
} from '../global';
import { readFile, writeFile } from './fs';

// 加密或者解密文件
export function XOR(buffer: Buffer): Buffer {
  const array: number[] = [];
  for (let index = 0; index < buffer.length; index++) {
    const byte = buffer.readUInt8(index);
    array.push(Global.XOR_KEY ^ byte);
  }
  return Buffer.from(array);
}

// 判断请求资源是否是加密资源
export function isEncryptRes(originalUrl: string): boolean {
  return originalUrl.includes(Global.EXTEND_RES_KEYWORD);
}

// 判断请求是否为路由路径
export function isPath(originalUrl: string): boolean {
  return (
    originalUrl.endsWith('\\') ||
    originalUrl.endsWith('/') ||
    originalUrl.includes('?')
  );
}

/**
 * 读取远程的官方资源数据
 * @param url 原始请求的相对路径
 * @param encrypt 是否是加密数据
 */
export async function getRemoteSource(
  url: string,
  encrypt = false
): Promise<{ code: number; data: Buffer }> {
  const remoteUrl = getRemoteUrl(url);
  const resp = await fetch(remoteUrl, {
    headers: {
      'User-Agent': Global.HttpGetUserAgent
    }
  });

  const statusCode = resp.status;
  const fileData = await resp.buffer();
  if (statusCode === 302 || statusCode === 301) {
    return getRemoteSource(resp.headers['location'], encrypt);
  } else {
    if (statusCode < 200 || statusCode >= 400) {
      Logger.warning(
        `从远端服务器请求 ${remoteUrl} 失败, statusCode = ${statusCode}`
      );
    }
    return {
      code: resp.status,
      data: encrypt ? XOR(fileData) : fileData
    };
  }
}

// 将 path 转换为远程 URL
export function getRemoteUrl(originalUrl: string): string {
  return (
    RemoteDomains[UserConfig.serverToPlay].domain +
    originalUrl.replace(/^\/\d\/?/g, '')
  );
}

// 从远程 URI 转成本地存储路径
export function getLocalURI(originalUrl: string): string {
  const dirBase = path.join(appDataDir, GlobalPath.LocalDir);
  const result = /^([^?]+)(\?.*)?$/.exec(originalUrl);
  if (result != null) {
    return path.join(dirBase, UserConfig.serverToPlay.toString(), result[1]);
  } else {
    return '';
  }
}

// 获取资源，当本地存在时优先使用本地缓存
export async function getRemoteOrCachedFile(
  url: string,
  encode = true,
  callback: (data: Buffer) => Buffer = data => data
): Promise<{ code: number; data: Buffer | string }> {
  const originalUrl = url.replace(/^\/\d\//g, '');
  const isEncrypted = isEncryptRes(originalUrl);
  const isRoutePath = isPath(originalUrl);
  const localPath = getLocalURI(originalUrl);
  const ret: { code: number; data: Buffer } = {
    code: 0,
    data: Buffer.from('')
  };

  let originData: Buffer | undefined = undefined;

  if (!isRoutePath && fs.existsSync(localPath)) {
    try {
      originData = await readFile(localPath);
    } catch (e) {
      Logger.error(e);
    }
  }

  // 当上述 readFile 出现异常时或上述 if 条件不符合时向远端服务器请求
  if (originData === undefined) {
    try {
      const remoteSource = await getRemoteSource(
        originalUrl,
        isEncrypted && !isRoutePath
      );
      ret.code = remoteSource.code;
      let data = remoteSource.data;
      if (!isRoutePath && remoteSource.code.toString()[0] !== '4') {
        data = callback(remoteSource.data);
        writeFile(localPath, data);
      }
      originData = data;
    } catch (e) {
      return { code: 403, data: e };
    }
  }
  let responseData: Buffer;
  if (encode) {
    responseData = encodeData(originData);
    if (isEncrypted) {
      responseData = XOR(responseData);
    }
  } else {
    responseData = originData;
  }
  ret.data = responseData;
  return ret;
}

// 主进程获取资源
export async function fetchAnySite(url: string, encoding = 'binary') {
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

export function getExportFileExtension(dir: string) {
  const extMap = new Map([
    ['resourcepack.json', 'mspr'],
    ['tool.json', 'mspt'],
    ['extension.json', 'mspe'],
    ['execute.json', 'mspe'],
    ['mod.json', 'mspm']
  ]);

  let ret = '';
  extMap.forEach(
    (ext, filename) =>
      (ret = fs.existsSync(path.resolve(dir, filename)) ? ext : ret)
  );
  return ret;
}
