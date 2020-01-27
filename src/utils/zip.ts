import AdmZip from 'adm-zip';
import path from 'path';

// 压缩目录至 to
export function zipDir(from: string, to: string) {
  const zip = new AdmZip();
  zip.addLocalFolder(from, path.basename(from));
  zip.writeZip(to);
  return to;
}

// 解压压缩文件至 to
export function unzipDir(file: string, to: string) {
  const zip = new AdmZip(file);
  return new Promise((resolve, reject) => {
    zip.extractAllToAsync(to, true, err => {
      if (err) reject(err);
      else resolve(to);
    });
  });
}
