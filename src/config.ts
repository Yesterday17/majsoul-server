import fs from 'fs';
import { Global } from './global';

class UserConfigData {
  port: number = 11451;

  LoadConfigJson() {
    if (fs.existsSync(Global.UserConfigPath)) {
      try {
        let config = JSON.parse(
          fs.readFileSync(Global.UserConfigPath, {
            encoding: 'utf-8'
          })
        ) as UserConfigData;

        this.port = config.port ?? this.port;
      } catch {}
    }
    this.SaveConfigJson();
  }

  SaveConfigJson() {
    fs.writeFileSync(Global.UserConfigPath, JSON.stringify(this, null, 2), {
      encoding: 'utf-8'
    });
  }
}

export const UserConfig: UserConfigData = new UserConfigData();
