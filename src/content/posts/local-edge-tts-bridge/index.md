---
title: 给酒馆装一张免费的中文嘴：本地 edge-tts 桥从搭建到端到端打通
published: 2026-10-31
description: 微软 Edge TTS 免费、音质好、中文音色多，可酒馆自带的 Edge 插件已经废了——GEC 鉴权从 v1 升到 v2，它依赖的 Node 库停更了。这篇记录我怎么用 Python edge-tts 7.3.1 自建一座 300 行的本地桥、用 nssm 注册成开机自启服务、把 SillyTavern 的 OpenAI Compatible 链路打通，以及那个把真实报错吞进 DEVNULL 的坑：它让我对着「退出码 1，输出 0 字节」猜了整整一晚。
tags: [SillyTavern, TTS, edge-tts, Python, Windows服务, 排障]
category: 教程
draft: false
pinned: false
comment: true
---

我想让酒馆里的角色开口说话。

这个需求听起来要花钱。市面上的 TTS 服务——ElevenLabs、Azure、火山——音质都好，但都要 API key、都有额度上限。而我只是想在本地，让文字变成人声，一天几百句，不想每个月收一张账单。

系统自带的语音是免费的，但那个机械音一听就出戏。你让一个御姐角色用 Windows 的「慧慧」念台词，氛围全毁。

微软的 Edge TTS 是少数几个「免费、音质好、中文音色多」的选项。它本来是 Bing 翻译的朗读引擎，开放了 WebSocket 接口，社区做了封装库。酒馆也内置了 Edge 提供商，按理说装个插件就能用。

问题就出在这个「按理说」上。

## 一、先说结论：官方插件已经废了

我先试了酒馆官方的 Edge 插件。插件装了、依赖补了、`config.yaml` 里的 `enableServerPlugins` 也是开的，一调用就 500。

把两边的实现拉出来对比，才发现问题不在我这：

| | 端点 | Sec-MS-GEC 版本 |
| :--- | :--- | :--- |
| Node `msedge-tts@2.0.4`（插件依赖） | `wss://speech.platform.bing.com/...` | `1-143.0.3650.96` |
| Python `edge-tts` 7.3.1 | 同上 | `2-143.0.3650.75` |

**微软把鉴权从 GEC v1 升到了 v2，v1 直接被拒。** 插件依赖的 `msedge-tts` 停更了，没跟上。

所以这不是配置问题，是上游协议变了。Python 的 `edge-tts` 已经跟进到 7.3.1，那就用它。

> [!NOTE]
> 这件事也回头解释了我更早遇到的一批 `NoAudioReceived` 报错：那不是随机的网络抖动，而是微软切换鉴权算法期间的典型表现。你以为是自己的网不好，其实是上游在换锁。

## 二、先摸清链路：酒馆并不直接连你的桥

动手之前有个反直觉的点得先讲清楚，不然后面会白测。

酒馆界面上的「OpenAI Compatible」，**不是浏览器直连你填的地址**。它先把请求发给酒馆自己的服务端，由 Node 服务端再去 fetch 你填的端点：

```
浏览器（酒馆界面）
   ↓  选 OpenAI Compatible，填端点
酒馆 Node 服务端   POST /api/openai/custom/generate-voice
   ↓  服务端转发 {input, voice, speed, model, response_format}
本地桥 127.0.0.1:8010   POST /v1/audio/speech
   ↓  spawn 子进程
edge-tts CLI  →  微软 WSS  →  返回 mp3
```

看懂这张图，就知道要打通的是三段：**服务化、改酒馆配置、过鉴权**。少一段都测不通。

## 三、第一步：建独立 venv

不在系统 Python 里装。理由和站上那篇[短信桥](https://du-19.top/posts/sms-code-bridge/)一样：常驻小工具最怕半年后想起来用、结果依赖装不上了。独立 venv 是一个可删除的沙盒，坏了删掉重建，不污染别的项目。

```powershell
python -m venv C:\Users\<你>\.dsh\edge-tts-venv
C:\Users\<你>\.dsh\edge-tts-venv\Scripts\python.exe -m pip install edge-tts==7.3.1
```

装完先别急着写桥。**先证明库本身能出声。**

```powershell
C:\Users\<你>\.dsh\edge-tts-venv\Scripts\edge-tts.exe `
  --voice zh-CN-XiaoxiaoNeural `
  --text "连通性测试。" `
  --write-media test.mp3
```

拿到一个 18 KB 的 mp3，说明库、网络、微软端点三者都通。

> [!TIP]
> 先验证最底层，再往上叠。如果 CLI 都不出声，后面写再多代码都是白搭——而且你会在「网络不通」和「代码写错」之间反复横跳，因为两边都能解释「没有声音」。

## 四、第二步：写桥

桥的核心就一件事：把 OpenAI 的 `/v1/audio/speech` 协议，翻译成 edge-tts 的一次调用。

选型上做了一个刻意的决定：**纯标准库，不引框架。** `http.server.ThreadingHTTPServer` 加一个 `BaseHTTPRequestHandler` 就够了。不需要 Flask，不需要 FastAPI，复制一个 `.py` 文件到任何装过 Python 的机器上都能跑。

路由只有四条：

| 方法 | 路径 | 作用 |
| :--- | :--- | :--- |
| GET | `/health` | 存活检查 |
| GET | `/v1/models` | 给客户端看的模型名 |
| GET | `/v1/audio/voices` | 音色列表 |
| POST | `/v1/audio/speech` | 合成 |

请求体只认三个字段：`input`、`voice`、`speed`。`model` 和 `response_format` 直接忽略——酒馆会带，但 edge-tts 用不上。

两个实现细节值得说。

**长文本分块。** edge-tts 单次合成的文本有上限，太长会断。按句号、问号、感叹号切成 1200 字一块，逐块合成后拼接。

**语速换算。** OpenAI 协议里 `speed` 是倍率（1.0 = 原速），edge-tts 要的是百分比（`+50%`）。做一个映射：`1.0 → +0%`、`1.5 → +50%`、`0.5 → -50%`。

合成时用子进程调 CLI，而不是在桥进程里 `import edge_tts` 直接 `await`。看起来绕，但有原因：这个桥是长期驻留的 Windows 服务，主进程里跑异步事件循环容易被服务管理器干扰；独立子进程则是一次性的，失败即退出，干净。

## 五、第三步：nssm 注册成服务

桥写好了，怎么让它一直活着？

双击 `start-bridge.bat` 是个办法，但开机不会自动跑，崩了也没人管。Windows 服务是正解，nssm 是最省事的封装：

```powershell
nssm install EdgeTtsBridge "C:\...\edge-tts-venv\Scripts\python.exe" "C:\...\bridge.py"
nssm set EdgeTtsBridge AppDirectory "C:\...\edge-tts-bridge"
nssm set EdgeTtsBridge Start SERVICE_AUTO_START
nssm start EdgeTtsBridge
```

几个必须配的项：

| 项 | 值 | 为什么 |
| :--- | :--- | :--- |
| 启动类型 | `Automatic` | 开机自启 |
| 工作目录 | 桥所在目录 | 否则相对路径全错 |
| 标准输出/错误 | `stdout.log` / `stderr.log` | 服务没有控制台，输出必须落盘 |
| 日志轮转 | 1 MB | 不然日志能撑爆磁盘 |

验证：

```powershell
Get-Service EdgeTtsBridge
# Status: Running  /  StartType: Automatic

netstat -ano | findstr :8010
# TCP  127.0.0.1:8010  ...  LISTENING
```

## 六、第四步：端到端实测

两道关。

**第一道，直打桥：**

```json
POST http://127.0.0.1:8010/v1/audio/speech
{"input":"你好，这是酒馆语音合成的端到端测试。","voice":"zh-CN-XiaoxiaoNeural","speed":1.0}
```

返回 `200 / 40464 字节 / 2.25 秒 / audio/mpeg`，文件头 `ff f3` 是合法的 MPEG 帧同步字。

**第二道，经酒馆。** 这一步撞了个 403。

我先打的是 `/api/openai/custom/generate-voice`，403 Forbidden。第一反应是白名单，查了 `config.yaml`，`127.0.0.1` 明明在里面。

真正的原因是 CSRF：酒馆这个接口要 `X-CSRF-Token`。先 `GET /csrf-token` 拿 token，带在头上才放行：

```bash
token=$(curl -s http://127.0.0.1:8000/csrf-token | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -X POST http://127.0.0.1:8000/api/openai/custom/generate-voice \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $token" \
  -d '{"provider_endpoint":"http://127.0.0.1:8010/v1/audio/speech","model":"tts-1","input":"测试","voice":"zh-CN-XiaoxiaoNeural","response_format":"mp3","speed":1}'
```

过了这关，`200 / 46368 字节 / 2.25 秒`。

再把服务 Stop → Start 重测一遍，仍然 200。确认重启后能自愈。

## 七、最深的坑：报错被自己吞了

上面写得顺，但真实的开发过程不是这样。

第一版桥跑起来后，日志里反复出现：

```
edge-tts 退出码 1，输出 0 字节
```

就这一行。没有堆栈，没有原因。

我盯着这行猜了很久：版本？网络？文本太长？后来去翻代码，才发现问题出在自己写的这一句：

```python
proc = subprocess.Popen(cmd, ..., stderr=subprocess.DEVNULL)
```

**所有报错，全进了黑洞。**

修复很简单——把 stderr 重定向到临时文件，读完再删：

```python
fd, err_path = tempfile.mkstemp(suffix=".err", prefix="edge_")
proc = subprocess.Popen(cmd, ..., stderr=fd)
code = proc.wait(timeout=timeout)
with open(err_path, "r", encoding="utf-8", errors="replace") as f:
    err = f.read()
os.remove(err_path)
return code, err
```

改完之后，故意用一个不存在的音色触发失败，日志里立刻现形：

```
edge_tts.exceptions.NoAudioReceived: No audio was received.
```

> [!CAUTION]
> 这一课比任何技术细节都重要：**DEVNULL 是最昂贵的调试税。**
>
> 你以为自己在「清理输出」，其实是在扔掉唯一的线索。任何长期驻留的服务，第一件事是把 stderr 接出来——哪怕只是落到一个临时文件里。

## 八、NoAudioReceived 到底为什么

拿到真实报错之后，问题变成：同一个库、同一个版本，为什么 CLI 直连能出声，桥里就收不到音频？

我列了一张排除表，一条条实测：

| 假设 | 实测 | 结论 |
| :--- | :--- | :--- |
| 版本问题 | 7.3.1 在 00:36 装好，失败从 00:47 开始，同一版本 | 排除 |
| 代码问题 | `bridge.py` 最后修改后没再动，同一份代码现在稳定成功 | 排除 |
| 文本太长 | 10 / 200 / 1000 / 3000 / 6000 字全部成功 | 排除 |
| 并发 | 12 并发全过 | 排除 |
| 请求太密 | 连续 30 次无间隔快打，0 失败 | 排除 |
| 环境变量代理 | `trust_env=True` 对 wss 不生效，死代理照样成功 | 排除 |
| 音色非法 | `zh-CN-NotExistNeural` 稳定复现 `NoAudioReceived` | 唯一能复现的触发条件 |

`NoAudioReceived` 的含义是「WebSocket 握手成功，但微软没有吐回任何音频帧」，属于上游或网络侧的临时拒绝。我在本地压测复现不出来，最可能的两个原因是：

1. 当时翻墙开着，TUN 模式在网络层劫持，wss 走了境外出口被微软拒；
2. 端点侧限流。

而原来的重试策略是失败后 1.5 秒就重试——硬重试只会在限流期把它放大成连败。改成递增退避：第 2 次等 2 秒，第 3 次等 6 秒。

> [!WARNING]
> 还有个细节：酒馆的 `voiceMap` 里 `[Default Voice]` 原本是字符串 `"disabled"`。如果某个角色没单独指定音色，这个值会原样传给桥，变成一个非法音色——正好命中上面那张表里**唯一能复现**的条件。
>
> 所以接入后，记得给每个角色显式指定合法音色，别留默认值。

## 九、现在它长什么样

| 指标 | 数值 |
| :--- | :--- |
| 中文音色 | 14 个（Xiaoxiao / Yunxi / Yunyang / Xiaoyi / liaoning-Xiaobei / HK-HiuGaai 等） |
| 单句合成 | 约 2.25 秒（40 字左右） |
| 成本 | 0 |
| 启动 | 开机自启（nssm `Automatic`） |
| 依赖 | edge-tts 7.3.1 + Python 3.13 |
| 接口 | OpenAI `/v1/audio/speech`，酒馆原生支持 |

> [!NOTE]
> 为什么用 OpenAI Compatible，而不是酒馆内置的 Edge？因为内置 Edge 走的就是那个已经废掉的 `msedge-tts`。
>
> 用 OpenAI Compatible 接自建桥，等于借用一套标准协议，把微软的私有实现藏在自己的服务后面——哪天 edge-tts 又变了，我只需要改桥，不用动酒馆。

## 十、复盘

| 环节 | 症状 | 根因 | 解法 |
| :--- | :--- | :--- | :--- |
| 官方插件 | `/generate` 500 | `msedge-tts` 停更，GEC v1 被拒 | 自建桥，用 edge-tts 7.3.1 |
| 桥 | 退出码 1，输出 0 字节 | stderr 被 `DEVNULL` 吞掉 | stderr 重定向到临时文件 |
| 桥 | `NoAudioReceived` | 上游/网络临时拒绝，非法音色可复现 | 递增退避重试；给角色指定合法音色 |
| 酒馆 | 403 | 缺 `X-CSRF-Token` | 先取 `/csrf-token` 再带头发请求 |
| 服务 | 开机不自启 | 只双击了 bat | nssm 注册 `Automatic` 服务 |

## 十一、几句话

这次最值钱的不是那 300 行代码，是两条教训。

**第一，先证明最底层能跑。** CLI 能出声，再去写封装；不然你会把「网络不通」误判成「代码写错」，在两个层面来回跳。

**第二，别把日志调成静音。** `DEVNULL` 那一行，是这个项目里唯一真正的 Bug，而它坏的不是功能，是让我看不见功能为什么坏。

还有一个关于排障的体会：当我列完那张七行的排除表，我才意识到，我花在「猜」上的时间，远多于花在「证伪」上的时间。猜十次不如测一次。排除法慢，但它会把你稳稳地带到答案面前，而不是让你在十个可能性之间反复横跳。

---

现在这座桥常驻在后台：开机自启，端口 8010，酒馆刷新一下，音色下拉里就是 14 个中文声音。

我给几个角色分别配了 Xiaoxiao 和 Yunxi。夜里关掉屏幕，戴上耳机，她们就会开口。

不用 API key，不用额度，不会月底收到账单。

> [!CAUTION]
> 本站分享的内容均为个人实战经验记录。文中涉及的本地路径、端口、服务名等均可按需替换。
>
> 若你要把这类服务暴露到公网，务必加上鉴权，并且不要在公开渠道泄露你自己的同类凭据。
