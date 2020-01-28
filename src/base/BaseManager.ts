import Ajv from 'ajv';
import fs from 'fs';
import Koa from 'koa';
import Router from 'koa-router';
import path from 'path';
import semver from 'semver';
import { appDataDir, Logger } from '../global';
import { removeDirSync } from '../utils/fs';
import { fillObject } from '../utils/object';
import { Metadata } from './Metadata';

export interface LoadDetails {
  [pack: string]: {
    enabled: boolean;
    sequence: number;
    errors: Array<string | string[]>;
    metadata: Metadata;
  };
}

export default abstract class BaseManager {
  protected name: string;
  protected configPath: string;
  protected defaultObject: Metadata;
  protected schema: {};
  protected loadedMap: Map<string, Metadata> = new Map();
  protected loadedDetails: LoadDetails = {};
  private enabled: string[] = [];

  constructor(
    name: string,
    configPath: string,
    defaultObj: Metadata,
    schema: {}
  ) {
    this.name = name;
    this.configPath = configPath;
    this.defaultObject = defaultObj;
    this.schema = schema;
  }

  loadEnabled() {
    if (fs.existsSync(this.configPath)) {
      try {
        this.enabled = JSON.parse(
          fs.readFileSync(this.configPath, { encoding: 'utf-8' })
        );
      } catch (err) {
        Logger.error(`加载已启用拓展失败: ${err}`);
        this.enabled = [];
      }
    } else {
      this.enabled = [];
    }
    this.save();
  }

  use(id: string, callback: (pack: Metadata) => void = () => {}) {
    // 拓展 ID 检查
    if (!id.match(/^[_a-zA-Z0-9]+$/)) {
      Logger.debug(`invalid ${this.name} id： ${id}`);
      return this;
    }

    const folder = path.resolve(appDataDir, this.name, id);
    const cfg = path.resolve(folder, `${this.name}.json`);

    // 拓展目录存在性
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      Logger.debug(`${id} folder not found: ${folder}`);
      return this;
    }

    // 拓展配置文件存在性
    if (!fs.existsSync(cfg) || !fs.statSync(cfg).isFile()) {
      Logger.debug(`${id} configuration file not found: ${cfg}`);
      return this;
    }

    // 获得拓展
    let pack: Metadata;
    try {
      pack = JSON.parse(
        fs.readFileSync(cfg, {
          encoding: 'utf-8'
        })
      );
    } catch (e) {
      Logger.error(`JSON 解析失败(${cfg}): ${e}`);
      return this;
    }

    // 填入默认数据
    fillObject(pack, this.defaultObject);

    // ID 与目录名必须保持一致
    if (pack.id !== id) {
      Logger.debug(
        `folder name & id mismatch: folder name is ${id}, but id is ${pack.id}`
      );
      return this;
    }

    // id 唯一性检查
    // 理论上应该不存在，因为是按照目录名的
    if (this.loadedMap.has(pack.id)) {
      Logger.debug(`${this.name} already loaded or duplicated id: ${id}`);
      return this;
    }

    // JSON Schema
    const ajv = new Ajv();
    const valid = ajv
      .addSchema(this.schema, this.name)
      .validate(this.name, pack);
    if (!valid) {
      Logger.debug(`failed to load ${this.name} ${id}: json schema failed`);
      Logger.debug(JSON.stringify(ajv.errors, null, 2));
      return this;
    }

    // version validate
    if (!semver.valid(pack.version)) {
      Logger.debug(
        `failed to load ${this.name} ${id}: broken version ${pack.version}`
      );
      return this;
    }

    // 检查依赖
    if (pack.dependencies) {
      for (const dep in pack.dependencies) {
        // 依赖版本表示不合法
        if (semver.validRange(pack.dependencies[dep]) === null) {
          Logger.debug(
            `failed to load ${this.name} ${id}: broken dependency version ${pack.dependencies[dep]}`
          );
          return this;
        }
      }
    }

    callback(pack);

    this.loadedMap.set(id, pack);
    this.loadedDetails[id] = {
      enabled: false,
      metadata: pack,
      sequence: 0,
      errors: []
    };

    return this;
  }

  enableFromConfig() {
    const validatedEnabled: string[] = [];
    this.enabled.forEach(id => {
      const value = this.loadedDetails[id];

      // active.json 中数据出错
      if (!value) {
        return;
      }

      if (value.enabled) {
        validatedEnabled.push(id);
        return;
      }

      const meta = value.metadata;

      for (const dep in meta.dependencies) {
        // 依赖未找到
        if (!this.loadedMap.has(dep)) {
          Logger.debug(`dependency of ${id} not found: ${dep}`);
          value.errors.push(['dependencyNotFound', dep]);
        } else if (dep !== 'majsoul_plus' && !this.loadedDetails[dep].enabled) {
          Logger.debug(`dependency of ${id} not enabled: ${dep}`);
          value.errors.push(['dependencyNotEnabled', dep]);
        } else {
          // 解析依赖版本范围
          const range = new semver.Range(meta.dependencies[dep]);
          // 检查依赖版本
          const dependency = this.loadedMap.get(dep);
          if (dependency && !semver.satisfies(dependency.version, range)) {
            Logger.debug(
              `dependency version of ${id} mismatch: loaded ${dep}:${dependency.version}, but required ${dep}:${meta.dependencies[dep]}`
            );
            value.errors.push([
              'dependencyVersionMismatch',
              dep,
              meta.dependencies[dep],
              dependency.version
            ]);
          }
        }
      }

      if (value.errors.length === 0) {
        validatedEnabled.push(id);
        this.loadedDetails[id].enabled = true;
      }
    });

    // 确定顺序
    validatedEnabled.forEach((id, index) => {
      this.loadedDetails[id].sequence = index + 1;
    });
    this.enabled = validatedEnabled;
  }

  register(server: Koa, router: Router) {}

  getDetail(id: string) {
    return this.loadedDetails[id].metadata;
  }

  getDetails(): LoadDetails {
    return this.loadedDetails;
  }

  disable(id: string) {
    const toDisable = this.loadedDetails[id];
    if (toDisable.enabled) {
      const dependents = Object.values(this.loadedDetails).filter(pack =>
        pack.enabled ? !!pack.metadata.dependencies[id] : false
      );
      dependents.forEach(dep => this.disable(dep.metadata.id));
    }
    toDisable.sequence = 0;
    toDisable.enabled = false;
    this.enabled = this.enabled.filter(item => item !== id);
  }

  disableAll() {
    for (const id in this.loadedDetails) {
      if (this.loadedDetails[id]) {
        this.loadedDetails[id].enabled = false;
        this.loadedDetails[id].errors = [];
      }
    }
    this.enabled = [];
  }

  enable(id: string) {
    this.loadedDetails[id].errors = [];
    this.enabled.push(id);
    this.enableFromConfig();
  }

  enableAll() {
    for (const id in this.loadedDetails) {
      if (this.loadedDetails[id]) {
        this.loadedDetails[id].enabled = true;
        this.loadedDetails[id].errors = [];
      }
    }
  }

  clear() {
    this.loadedMap = new Map();
    this.loadedDetails = {};
    this.enabled = [];
  }

  save() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.enabled, null, 2), {
      encoding: 'utf-8'
    });
  }

  changeEnable(id: string, enabled: boolean) {
    enabled ? this.enable(id) : this.disable(id);
    this.save();
  }

  removePack(id: string) {
    this.disable(id);
    removeDirSync(path.resolve(appDataDir, this.name, id));
    this.save();
    this.clear();
  }
}
