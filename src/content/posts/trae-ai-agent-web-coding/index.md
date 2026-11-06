---
title: 我用 Trae 做了一个会调用工具的流式 AI Agent：从天气卡片到双工具循环
published: 2026-11-07
description: 一次完整的 AI 编程实战记录：用 Trae 从零搭起 Vite + React + Node 项目，接入天气 API、时间与计算器工具，修好 Windows 进程残留，再把一次性回复改成 SSE 流式输出。重点不是复制代码，而是学会看 diff、看日志和验证链路。
tags: [Trae, AI Agent, Web开发, Node.js, React, 流式输出, SSE]
category: 教程
draft: false
pinned: false
---

> [!TIP]
> 这篇记录的是一次从零开始的练习：我没有先搭一个大项目，而是先让页面跑起来，再逐步加天气请求、后端工具调用和流式输出。每一步都保留了能复现的命令和验证方式。

## 先说结果：一个小项目里跑通了什么

最后得到的是一个本地 Web 应用：

```text
浏览器 :5173
   ↓ Vite 代理
Node 后端 :3001
   ├── 普通聊天接口
   ├── SSE 流式聊天接口
   ├── get_current_time 工具
   └── calculate 工具
```

它能做三件事：

- 页面加载后从 Open-Meteo 获取北京的实时温度和湿度；
- 用户问“现在几点”时，由模型决定调用时间工具；
- 用户提出需要计算的问题时，由模型调用安全的计算器，再把结果组织成自然语言。

最后又把后端的模型回复改成了流式输出。回复不再等全部生成完才出现，而是逐段进入页面。

## 第一步：先把项目跑起来

我先准备了 Node、npm 和 Git：

```text
Node v24.20.0
npm 11.19.0
git 2.55.0.windows.5
```

项目目录是：

```text
C:\Users\杜建国\Documents\web-练习-01
```

判断一个目录是不是项目根目录很简单：看里面有没有 `package.json`。这个文件里记录了依赖和命令，`npm run dev` 也是从它读取启动脚本。

最初的项目只有一个 React 页面。先跑通页面，再让 AI 修改，是为了把问题拆小：如果第一步就把前端、后端、数据库和部署全塞进去，出了问题很难判断是哪一层坏了。

## 第二步：天气请求的三个状态

天气功能使用 Open-Meteo，不需要 API Key。前端请求：

```text
https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current=temperature_2m,relative_humidity_2m&timezone=Asia/Shanghai
```

天气卡片没有只写“请求成功”的路径，而是明确处理了三种状态：

| 状态 | 页面显示 |
|---|---|
| loading | 正在获取天气… |
| success | 温度和湿度 |
| error | 获取天气失败 + 重试按钮 |

重试不是刷新整个页面，而是改变一个 `reloadKey`，让 `useEffect` 重新发起请求。这种写法把“重新请求”做成了一个明确的状态变化。

验证失败路径时，我在浏览器开发者工具里切换到 Offline，再点重试。页面确实显示错误提示，没有白屏。

> [!NOTE]
> 开发者工具里的 Network 面板只记录面板打开之后发生的请求。排查时先点 `Fetch/XHR`，再勾选“保留日志”，最后触发一次操作。只看页面上的错误，通常不够定位问题。

## 第三步：把工具接进后端

前端不直接携带 API Key。密钥放在项目根目录的 `.env` 里，并且 `.gitignore` 明确忽略 `.env`：

```text
LLM_API_KEY=你的密钥
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

真正的请求路径是：

```text
浏览器 → Vite 代理 → Node 后端 → 大模型 API
```

后端先把工具清单发给模型。模型如果决定调用工具，后端执行工具，再把结果作为 `role: tool` 的消息回喂给模型。

第一个工具是 `get_current_time`。它返回机器当前时间，模型本身不可能提前知道秒数，所以这是一个很好的验收工具。

第二个工具是 `calculate`。它没有使用 `eval` 或 `new Function`，而是先做允许字符校验，再用递归下降解析器计算表达式：

```text
只允许数字、小数点、+、-、*、/、括号和空格
```

出现其他字符就返回“表达式非法”。工具结果先保持结构化，模型负责把它翻译成人话。

## 第四步：为什么要把 if 改成 while

最初的后端只处理一轮工具调用：

```text
第一次问模型 → 执行工具 → 再问一次模型 → 结束
```

这会漏掉一种情况：模型看完第一个工具的结果后，还想再调用第二个工具。于是把逻辑改成最多 5 轮：

```text
while step < MAX_STEPS:
    问模型
    如果要工具：执行并回喂，继续
    如果不要工具：返回最终回答
```

每轮都必须带工具清单，assistant 的 `tool_calls` 消息和每个 `tool_call_id` 也必须原样保留。否则模型看不到上一轮发生了什么，或者上游 API 会因为消息配对错误返回 400。

测试时，终端里出现了两行日志：

```text
[工具] get_current_time {}
[工具] calculate {"expression":"23*23*7919"}
```

这才是多轮工具调用通过的证据。答案算对不能单独证明工具真的被调用，因为模型自己也可能心算出来。

> [!WARNING]
> 没有日志时，不要把“答案看起来正确”当成工具调用证据。验证 Agent 最可靠的方式，是在工具执行点打印工具名、参数、开始时间和结果。

## 第五步：SSE 流式输出

一次性接口的体验是：后端等模型全部说完，前端一次性收到 JSON。

流式接口改成 SSE：

```text
后端收到一段 → res.write 一段
前端收到一段 → 立刻更新最后一条消息
```

后端响应头必须是：

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
```

每个 SSE 事件以两个换行结束：

```text
data: {"type":"delta","text":"你"}\n\n
```

前端不能再用 `res.json()`，因为它会等完整响应结束。正确做法是：

```js
const reader = res.body.getReader()
const decoder = new TextDecoder('utf-8')
```

读取时要给 `decoder.decode` 传 `{ stream: true }`。汉字在 UTF-8 中是多字节字符，网络块可能切在一个汉字中间；不保留解码器状态，就可能出现乱码。

前端还要维护一个 `buffer`，按 `\n\n` 切出完整 SSE 事件，再解析其中的 `data:` 行。每收到一个增量，就用函数式 `setMessages(prev => ...)` 替换最后一条 assistant 消息的内容。

> [!CAUTION]
> 流式更新不能使用旧闭包里的 `messages`。否则多次更新之间会互相覆盖，最终页面可能只剩最后一个字。要用函数式状态更新，并且替换最后一条消息，而不是不断新增消息。

## 第六步：生产模式和路径安全

开发时用 Vite 的 5173 端口。生产模式则先构建：

```powershell
npm run build
npm run server
```

Node 后端同时承担两件事：

- `/api/*` 继续处理聊天接口；
- 其他 GET 请求从 `dist/` 返回构建后的前端文件。

我还加了三项处理：

1. `dist` 不存在时，明确提示先运行 `npm run build`；
2. 找不到文件时回退到 `dist/index.html`，保证前端路由刷新不 404；
3. 解析最终路径，拒绝 `../` 路径穿越。

最后一项用下面的请求验证：

```text
GET /../../.env → 403 Forbidden
```

`.env` 没有被读取，也没有泄露 API Key。

## 第七步：Windows 下的进程坑

我还遇到过一个很典型的问题：`npm run dev:all` 同时启动前端和后端后，按 Ctrl+C，父进程退出了，但 5173 和 3001 仍然被占用。

原因是 Windows 下使用：

```js
spawn(command, args, { shell: true })
```

中间会多一层 `cmd.exe`。普通的 `child.kill()` 只杀到中间层，里面的 Node 子进程还在。

修法是 Windows 下使用：

```text
taskkill /PID <pid> /T /F
```

`/T` 会连整棵子进程树一起结束。否则下一次启动时就会遇到：

```text
EADDRINUSE: address already in use :::3001
```

遇到端口占用时，先查：

```powershell
netstat -ano | findstr :3001
```

再按 PID 杀整棵树，不要只杀最外层进程。

## 现在这套 Agent 到了什么程度

它已经不是一个只会返回固定文本的页面了：

| 能力 | 状态 |
|---|---|
| React 页面 | 已有 |
| 真实天气 API | 已有，含加载和失败状态 |
| 后端模型代理 | 已有 |
| `.env` 密钥隔离 | 已有 |
| 时间工具 | 已有 |
| 安全计算器 | 已有，不使用 eval |
| 多轮工具调用 | 已有，最多 5 轮 |
| SSE 流式输出 | 已有 |
| 生产构建 | 已有 |
| 静态文件托管 | 已有 |
| 路径穿越防护 | 已验证 |

最开始我只是想在 Trae 里改一个页面，后来顺手把一个小型 Agent 的核心结构搭出来了。真正值得留下的不是某一段代码，而是一条排查习惯：先确认进程和端口，再看请求状态；先修观测手段，再讨论根因；答案正确不算工具调用证据，日志才算。

> [!TIP]
> 今天可以复现的最小路径：在项目目录运行 `npm run build`，再运行 `npm run server`，打开 `http://localhost:3001`。要验证流式，观察回复是否逐段出现；要验证工具，观察终端里的 `[工具]` 日志。

文章草稿文件：`C:\Users\杜建国\Documents\deepseek-harness\default-workspace\du-19.top-文章草稿-ai-agent-web-coding\index.md`
