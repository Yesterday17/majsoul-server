# majsoul-server
从 雀魂 Plus 中单独拆分出来的 MITM 服务端。

## 使用

```bash
# clone
git clone https://github.com/Yesterday17/majsoul-server
cd majsoul-server

# start
yarn debug
```

## 部署

以 [Caddy](https://caddyserver.com/v1/) 为例。其中 `{domain}` 换成你自己的域名，`{port}` 换成你设置的端口号：

```conf
{domain} {
  gzip

  proxy / localhost:{11451} {
    header_upstream -Origin
  }
}
```