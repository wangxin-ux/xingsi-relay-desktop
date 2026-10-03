# 星际中转站 · 星思中转助手

<p align="center"><img src="packages/ui/src/assets/xingji-logo.png" width="96" alt="星际中转站" /></p>

面向星思中转用户的桌面 AI 编程与办公客户端，基于 [ZCode 3.14.3](https://github.com/zai-org/ZCode) 修改。仓库提供客户端与 Agent 源码；中转站服务端不包含在本仓库中。

[English](README.en.md) · [上游运行说明](README.upstream.md) · [修改规格](docs/specs/xingsi-relay-login.md)

## 功能

- 中转站账号登录，自动读取用户自己的可用密钥与模型，无需手动填写 API Key。
- 每次启动先登录；侧栏显示当前账号，退出登录返回登录页。
- 显示真实套餐剩余额度，支持手动和每分钟刷新；100% 对应满绿条。
- 编程与办公模式切换位于输入框权限选项右侧；模型按钮及切换提示只显示模型名称。
- 自定义名称、紫色星环图标、大 X 启动画面；Agent 自称“星思中转助手”。
- 内置“星思中转指导指南”，保留插件、技能、MCP 和工具调用能力。
- 品牌客户端禁用上游自动更新，设置独立的数据根目录。

## 克隆

```bash
git clone https://github.com/wangxin-ux/xingsi-relay-desktop.git
cd xingsi-relay-desktop
```

默认中转站为 `https://xing.xinxinyuntu.top`，用户需要有效账号与模型权限。客户端不附带管理员账号、密码、API Key 或测试数据。站点套餐和模型费用由站点服务决定。

## 开发与构建

准备 Git、Node.js **24.14.0**、pnpm **10.33.2**；版本以 `mise.toml` 和 `package.json` 为准。

```bash
pnpm bootstrap
pnpm dev:desktop
```

`dev:desktop` 会构建本地 Agent 并启动 Electron。修改 Agent 身份提示后，需要重新构建 Agent、重启客户端；只构建界面不会更新 Agent。

```bash
# 显式构建并暂存本地 Agent
node scripts/build-desktop-agent-cli.mjs

# 检查
pnpm typecheck
pnpm lint
pnpm architecture:check --changed

# 中转登录、额度、登录态与品牌回归测试
pnpm exec tsx --test packages/desktop/test/xingsiRelay.test.ts packages/desktop/test/xingsiRelaySession.test.ts packages/desktop/test/xingsiBrandIdentity.test.ts

# 构建桌面界面及宿主
pnpm --filter @zcode/desktop build:no-runtime-assets
```

打包入口沿用 `pnpm bundle:desktop`，完整资源准备和平台依赖见[上游说明](README.upstream.md)。部分工具依赖上游下载资源，其可用性由对应资源和平台决定。这里发布的是开发中的源码；本次上传没有重新生成或发布安装包。

## 更换自己的中转站

当前适配 **sub2api** 的账号、订阅与密钥 API，以及 OpenAI 兼容的 `/v1/models`、`/v1/chat/completions`。

- 登录与额度：`packages/desktop/src/main/xingsiRelay.ts`。
- 登录后模型配置：`packages/ui/src/hooks/useXingsiRelayLogin.ts`。
- 品牌和图标：`packages/desktop/scripts/desktop-product-identity.mjs`、`packages/desktop/build/`、`packages/ui/src/assets/`。
- Agent 身份：`apps/zcode-cli/packages/core/src/context/sections/identity.ts` 与 `cli-prefix.ts`。

更换站点需要同步调整适配器 origin、模型 API 地址和品牌配置。其他中转架构需要适配接口，不能只修改网址。HTTP 请求头是协议内容，不要把英文请求头标识替换成中文展示文案。

## 开源许可与来源

客户端修改继续采用 **Apache-2.0**，详见 [LICENSE](LICENSE)。保留 [NOTICE.md](NOTICE.md) 和 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)；第三方组件仍采用各自许可证。

这是第三方修改项目，与上游官方产品分别维护。上游基线为 `zai-org/ZCode` 的 `29628c9a` 提交（3.14.3）。本仓库以新的源码快照发布，保留上游完整源码和来源说明，不包含本机调试文件与历史用户数据。
