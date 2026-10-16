# todo list

水蓝色的私人共享清单。输入名字即可使用，无需注册。

## 免费部署到 Cloudflare

使用 Cloudflare Workers Free + D1，在免费额度内无需月费。
在 Cloudflare Workers & Pages 连接此 GitHub 仓库，应用名设置为 todo-list。
预构建资源已包含，Build command 留空，Deploy command 设置为 `npm run deploy`。
部署脚本创建或复用 todo-list-data 数据库，并应用 migrations/ 中的迁移。
首次部署期间数据库初始化可能短暂返回 503；迁移完成后才算可用。
不要选择付费升级；免费额度耗尽时可能暂时不可用。
中国大陆与美国连通性仍需实际测试，不承诺跨境稳定性。

原 Render 配置保留供备用，它是付费方案，不属于本次免费部署。

## 使用

打开首页创建新清单；分享或收藏包含 # 后所有内容的完整链接。
对方通过同一条链接输入名字即可访问。完整链接就是查看和编辑权限，名字不是身份验证。
事项内容在浏览器内通过 AES-256-GCM 加密；服务器仅存事项密文，不存解密密钥。
解密密钥与访问凭证在链接片段中，丢失无法找回。请勿公开分享完整清单链接。

## 本地运行

安装 Node.js 24，运行 `node server.mjs`，打开 http://127.0.0.1:8080 。
预构建资源已包含，不需要安装依赖。数据库位于 private-data/，不会提交到仓库。

## 修改源码

React 和 TypeScript 源码在 source/。修改后运行 `npm install`、`npm run build`。
部署前请提交更新后的 public/ 与 secure-api.mjs。

本项目未使用第三方字体、分析脚本或第三方登录。生产环境必须使用 HTTPS。
请保留持久化数据目录并定期做一致性备份。完整链接持有者都能编辑；不限制为恰好两个人。
