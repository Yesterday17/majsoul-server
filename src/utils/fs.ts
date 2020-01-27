import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';

// fs.mkdir 的 Promise 形式
export function mkdirPromise(dirname: string) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirname, err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

// fs.stst 的 Promise 形式
export function statPromise(dirname: string): Promise<fs.Stats> {
  return new Promise((resolve, reject) => {
    fs.stat(dirname, (err, stats) => {
      if (err) {
        reject(err);
      }
      resolve(stats);
    });
  });
}

// 递归创建目录，异步方法
export async function mkdirs(dirname: string): Promise<void> {
  try {
    await statPromise(dirname);
  } catch (e) {
    await mkdirs(path.dirname(dirname));
    await mkdirPromise(dirname).catch(() => {});
  }
}

// 递归创建目录，同步方法
export function mkdirsSync(dirname: string) {
  try {
    fs.statSync(dirname);
  } catch (error) {
    mkdirsSync(path.dirname(dirname));
    fs.mkdirSync(dirname);
  }
}

// 写入本地文件
export async function writeFile(
  to: string,
  data: Buffer | string,
  encoding = 'binary'
): Promise<void> {
  await mkdirs(path.dirname(to));
  return new Promise((resolve, reject) => {
    fs.writeFile(to, data, encoding, err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

// 读取本地文件
export function readFile(filepath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

// 同步删除文件夹
export function removeDirSync(dir: string) {
  let command = '';
  if (process.platform === 'win32') {
    command = `rmdir /s/q "${dir}"`;
  } else {
    command = `rm -rf "${dir}"`;
  }
  childProcess.execSync(command);
}

// https://stackoverflow.com/a/26038979
export function copyFileSync(source: string, target: string) {
  let targetFile = target;

  //if target is a directory a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

export function copyFolderSync(source: string, target: string) {
  let files: string[] = [];

  // check if folder needs to be created or integrated
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(file => {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

export function getFoldersSync(folder: string): string[] {
  const folders: string[] = [];
  fs.readdirSync(folder).forEach(file => {
    if (fs.statSync(path.join(folder, file)).isDirectory()) {
      folders.push(file);
    }
  });
  return folders;
}
