---
title: 运维工程师面试宝典（二）：Kubernetes 排障与面试表达
published: 2026-09-29
description: 系列第二篇。覆盖 Service 与 Endpoint 的关系、CrashLoopBackOff 排查、Deployment 发布失败定位、为什么不直接改 Pod（声明式管理）、Pod Pending 与 Events 解读、Taint 与 Toleration 的设计思想；后半部分讲面试表达：线上面试使用 AI 辅助的风险、专业术语纠正表、通用排查框架，以及为什么不要硬装会。
tags: [运维, 面试, Kubernetes, 容器, 调度, 教程]
category: 教程
draft: false
pinned: false
---

面试官问：「Pod 日志报 `connection refused`，你觉得是哪里的问题？」

我说：「先看 etcd 健不健康。」

他停了两秒，说：「etcd 跟业务连数据库，有什么关系？」

那两秒是我整场面试最难受的两秒。

etcd 是 Kubernetes 控制面的数据库，存的是 Pod、Deployment、Service、ConfigMap 这些东西的状态。它不是业务 Pod 连 MySQL 时要过的组件。我把「集群的数据库」和「业务的数据库」混成了一个。

这篇就是从那道题开始的。前半部分讲 K8S 排障，后半部分讲表达，都是真实被问到、真实答错过的。

## 一、Kubernetes 排障

### 1.1 Service 和 Endpoint 是什么关系

这题不是考你会不会敲 `kubectl get svc`，是看**你理不理解 Service 为什么能找到 Pod**。

一句话：

> **Service 提供稳定的访问入口，Endpoint 维护后端真正提供服务的 Pod 地址列表。**

为什么需要 Service？因为 Pod 的 IP 不稳定。

```
mysql-1   10.1.1.10
mysql-2   10.1.1.11
mysql-3   10.1.1.12
```

业务要是直连 `10.1.1.10`，这个 Pod 一重启 IP 就变了，配置得跟着改。

```
业务 Pod
    |
    ↓
database Service (10.96.0.10)   ← 业务只需要记这个
    |
    ↓
mysql Pod (10.1.1.10 / .11 / .12)
```

Endpoint 补上另一环：Service 只知道「我要一个叫 database 的入口」，不知道「哪些 Pod 在给我提供服务」。这个映射由 Endpoint 维护。

```
database Service
Endpoints:
10.1.1.10:3306
10.1.1.11:3306
10.1.1.12:3306
```

> 「Service 提供稳定的网络访问入口，通过 ClusterIP 让客户端访问后端服务，不用关注 Pod IP 变化。Endpoint 维护 Service 对应的后端 Pod 地址列表，Service 根据 Endpoint 把流量转发到实际提供服务的 Pod。如果 Service 存在但 Endpoint 为空，通常说明后端 Pod 没被正确关联，需要检查 Pod 状态、Label 和 Service Selector。」

排障时怎么用：

```
kubectl get endpoints database
```

- 显示 `ENDPOINTS: <none>`：Service 后面没有 Pod，回头查 Pod 状态、Label、selector
- 有 Endpoint：Service 找到 Pod 了，继续查数据库进程、端口、网络策略

### 1.2 connection refused，第一嫌疑人不是 etcd

> [!CAUTION]
> **错误方向：怀疑 etcd。**
>
> etcd 存的是集群对象状态，它不是业务 Pod 访问数据库时的依赖。这两件事只是名字里都有「数据库」。

正确的排查顺序：

```bash
kubectl logs <pod>                  # ① 确认报错：应用启动了，但连不上数据库
kubectl get svc                     # ② Service 是否存在
kubectl describe svc database       # ② ClusterIP 是否正常
kubectl get endpoints database      # ③ 关键！是否 <none>
kubectl get pods                    # ④ 数据库 Pod 状态
kubectl logs database-pod           # ④ 数据库自身是否启动失败
kubectl exec -it web-pod -- bash    # ⑤ 进业务 Pod 测连通
nc -zv database-service 3306        # ⑤
```

> 「如果 Pod 日志显示 connection refused，我不会判断是 etcd 问题，而会认为应用依赖的数据库服务不可用。先检查数据库 Service、Endpoints、数据库 Pod 状态和网络连通性。如果 Service 没有后端 Endpoint，再查 Label 和 Selector。如果数据库正常，再排查网络策略或防火墙。」

> [!NOTE]
> PV/PVC 也不是完全无关。数据库 Pod 可能因为存储挂载失败起不来。
>
> 但对 `connection refused` 这个报错，它的排查优先级低于 Service 和数据库本身。这就是优先级判断能力。

### 1.3 更新后新 Pod 起不来，旧 Pod 还在跑

面试官问：Deployment 更新后新 Pod 启动失败，旧 Pod 还活着。你怎么判断是镜像、配置还是应用问题？

先解释为什么旧 Pod 还在：Deployment 默认用 **RollingUpdate（滚动更新）**，设计目的就是避免一次性把所有旧业务停掉。

```
旧版本 Pod (Pod-A / Pod-B / Pod-C)
       |
    更新 Deployment
       |
    创建新版本 Pod
       |
    新 Pod 启动失败
       |
    旧 Pod 继续提供服务   ← 这是特性，不是 bug
```

三种问题怎么分，看 `kubectl describe pod` 的 Events：

| Events 报错 | 问题类型 | 检查方向 |
|---|---|---|
| `Failed to pull image` | 镜像问题 | 镜像地址、是否存在、仓库认证 |
| `ConfigMap not found` / `Secret not found` | 配置问题 | 配置资源是否存在、名称对不对 |
| `Container exited with code 1` / `CrashLoopBackOff` | 应用问题 | `kubectl logs` 看应用日志 |

> 「新 Pod 启动失败时我不会立即删旧 Pod。先用 `kubectl get pod` 看状态，再用 `kubectl describe pod` 看 Events，按报错判断方向。镜像拉取失败就查镜像地址和仓库权限；ConfigMap、Secret 这类配置问题就查配置资源；容器启动后退出就看应用日志。同时观察 Deployment 的 rollout 状态，必要时回滚。」

### 1.4 为什么不直接改 Pod

这是 K8S 面试的经典分水岭题。

> [!CAUTION]
> 别说「任何时候都不能临时改 Pod」，太绝对。
>
> 准确说法是：**生产环境的正式变更，不应该直接改 Pod。**

原理在这儿：

```
Deployment
     ↓
ReplicaSet
     ↓
    Pod
```

Pod 是最终产物，由 Deployment 控制。你直接 `kubectl edit pod pod-A`：

- 当前这个 Pod 变了
- **Deployment 不知道**
- Pod 被删除或重新调度后，新 Pod 还是按 Deployment 原来的配置创建

也就是说：

> **你改了实际运行中的 Pod，但没改期望状态。**

这正是 Kubernetes 的核心理念：声明期望状态，让控制器不断把实际状态往期望状态上拉。

可以临时操作 Pod 的例外：

```bash
kubectl exec -it pod-name -- bash    # 临时排查，看日志、环境
kubectl describe pod pod-name        # 查看状态
kubectl run test-nginx --image=nginx # 开发环境测试
```

正式变更（镜像版本、环境变量、资源限制、nodeSelector、affinity）应该改 Deployment YAML，再 `kubectl apply`。

> 「不建议直接改 Pod。Pod 通常由 Deployment、ReplicaSet 这些控制器管理，直接改单个 Pod 会导致配置漂移，Pod 被删除或重新调度后修改就丢了。正确方式是改 Deployment 的 YAML，用 `kubectl apply` 更新，由控制器创建新的 ReplicaSet，按滚动更新策略逐步创建新 Pod、逐步退出旧 Pod。整个过程更可控，也方便回滚。」

加分句：「同时可以通过 rollout history 查看版本，必要时执行 rollback 回滚。」

> [!WARNING]
> **用词纠正**：不要说「修改 Deployment 后创建了新的节点」。
>
> 改 Deployment 创建的是**新的 Pod**，不是新的节点。Node 是集群里的服务器资源，不会因为你改配置就凭空多出来。这个错误会直接暴露概念不清。

### 1.5 Pod 一直 Pending 怎么查

核心顺序：

> **Pending → 调度 → 节点资源 / 亲和性 / 污点容忍 → PVC → 其他**

> 「Pod 一直 Pending，我会先用 `kubectl describe pod` 看详细信息，重点看 Events，确认是不是调度失败。然后按具体原因排查：节点资源不足、节点 taint 和 Pod toleration 不匹配、nodeSelector 或亲和性导致没有合适节点。如果涉及 PVC，还要检查存储是否正常、PVC 是否绑定。最后结合节点状态和集群资源进一步定位。」

**「那你第一条命令是什么？」**

> 「第一步执行 `kubectl describe pod <pod名> -n <命名空间>`，重点看 Events。Pending 的具体原因通常在调度事件里写得很清楚。」

> [!NOTE]
> 别一上来就说 Pod 之间的网络问题。Pod 还没调度起来、还没运行，网络不是第一优先级。这个顺序说出来，就说明你真排过。

### 1.6 读懂 Events：0/3 nodes are available

面试官给出一条事件：

```text
0/3 nodes are available:
2 node(s) had untolerated taint,
1 node(s) didn't match Pod's node affinity/selector.
```

逐句拆：

| 节点 | 原因 | 含义 |
|---|---|---|
| 节点 1、2 | `untolerated taint` | 节点有污点，Pod 没有对应容忍 |
| 节点 3 | `didn't match node affinity/selector` | Pod 自己的调度限制，节点不满足 |

示意：

```yaml
# 节点（有污点）
taints:
- key=gpu
  effect=NoSchedule

# Pod（没有 gpu 对应的 tolerations）→ 不允许调度
```

```yaml
# Pod 要求
nodeSelector:
  disktype: ssd
# 实际节点
# node-03 labels: disktype=hdd   → 不满足
```

调度器看到的是这样：

```
Pod 来了
  ↓
检查 3 个节点
  ↓
node-01 ❌ 污点，没有容忍
node-02 ❌ 污点，没有容忍
node-03 ❌ 不符合 nodeSelector / affinity
  ↓
没有可用节点 → Pod Pending
```

> 「这个事件说明不是 CPU 或内存资源问题，是调度条件不满足。两个节点因为存在 Pod 未容忍的 Taint 被排除，另一个因为不满足 nodeSelector 或 affinity 被排除，所以调度器没找到合适节点。」

**追问**：如果污点是合理的（GPU 节点不给普通业务用），但第三个节点的 nodeSelector 配错了，改 Pod 还是改节点？

> [!TIP]
> 关键是别急着回答「改谁」，先判断「到底是谁配错了」。
>
> - **Pod 的 selector 写错**：改 Pod，更准确说是改 Deployment
> - **节点标签打错**：改节点标签，但要注意影响面，该节点上已运行的其他 Pod 会不会受牵连
>
> 你说「改 Pod 影响更小」，这个变更影响范围的考量是对的，运维思维里很重要。但前提是根因判断对了。

### 1.7 为什么污点在节点，容忍在 Pod

这题考设计思想，比背命令值钱。

核心原因：**控制权应该在节点侧，不在 Pod 侧。**

- **Taint 设在 Node 上**：「这个节点有特殊属性，不希望普通 Pod 随便调度过来」
- **Toleration 设在 Pod 上**：「我知道这个条件，我允许进去」

为什么不让 Pod 标「我不能去 node-01」？因为 Pod 是需求方，它不知道哪个节点适合它、哪些是生产节点、哪些是测试节点。让成百上千个 Pod 各自维护一份「我不能去哪」的清单，管理会失控。

现实场景：公司有一台高性能 GPU 服务器 node-01。没有污点的话，普通 nginx 可能被调度上去，把昂贵资源浪费掉。

```bash
kubectl taint node node-01 gpu=true:NoSchedule
```

只有真需要 GPU 的 Pod 才加容忍：

```yaml
tolerations:
- key: gpu
  value: true
```

> 「Kubernetes 把污点设计在 Node 上，是因为节点资源和属性属于集群管理员的管理范围。Node 通过 Taint 表达『我不希望普通 Pod 调度到这里』，Pod 通过 Toleration 表示『我能接受这个限制』。这样能避免普通业务误占特殊节点资源，也让调度策略集中管理。」

### 1.8 Insufficient cpu 是什么意思

> [!CAUTION]
> 别直接说「CPU 爆满了」。
>
> `Insufficient cpu` 的准确含义是：**当前节点可分配给这个 Pod 的 CPU 不够**。不是节点整体 CPU 用满了，是剩余可分配量不满足 Pod 的 request。这两句话的区别，面试官一听就知道你有没有真看过 Events。

**追问：CPU 不足，第一反应是重启节点吗？**

> [!IMPORTANT]
> 不要一上来就重启节点。
>
> 现在只知道 Pod 是 Pending，具体原因还没定。重启节点是影响面很大的操作，生产环境可能反而造成业务中断。

正确方向：先看是资源真不够，还是 Pod 的 requests 设得太大，再考虑扩容节点、调整 requests，或者让 Pod 调度到别的节点。

```bash
kubectl top nodes              # 各节点 CPU / 内存实际使用
kubectl describe node <node>   # 看 Allocatable / Allocated resources
```

> [!NOTE]
> `kubectl top` 依赖 metrics-server。面试时可以说「用 `kubectl top nodes` 看节点资源使用」，但被追问「为什么查不到」时，要知道是 metrics-server 没装。

## 二、面试中的通用问题

### 2.1 线上面试能不能用 AI 辅助

结论：**技术上大概率看不出来，行为上很容易暴露。**

面试官通常看不到你另一个窗口的 ChatGPT，除非你共享了整个桌面。真正出问题的是这些信号：

| 暴露信号 | 为什么危险 |
|---|---|
| 回答明显延迟 | 简单问题也要停十几秒，像在等生成 |
| 表达风格突变 | 平时口语化，突然变成书面长句 |
| 回答过于「标准」 | 流程背得很完整，一问「你实际遇到过吗」就断 |
| **无法处理追问** | **最容易暴露**，一追细节就露馅 |
| 前后不一致 | 先说「熟练」，问到命令变成「了解」 |
| 技术深度超过简历 | 简历没涉及的领域突然能深入回答 |

> [!IMPORTANT]
> 最致命的是追问。你说「我做过数据恢复」，对方会问：恢复的是什么数据？用什么方式？用了多久？怎么验证完整性？
>
> 如果答案不是你真正经历过的，第三问必崩。

**正确用法是面试前准备，不是面试中代答。** 把真实经历整理成自己的表达，追问才接得住。

### 2.2 口头停顿要克制

原始回答长这样：

> 「呃，如果服务器变慢。那首先就应该从。比如这几个点，嗯，CPU 内存，磁盘 io。以及网络，嗯……」

技术内容全对，但听感是「没想清楚」。

> [!TIP]
> 不需要做到零停顿，但高频的「嗯 / 就是 / 相应的 / 呃」要刻意减少。
>
> 一个实用技巧：**宁可短暂停顿一秒，也不要用口头禅填充**。沉默一秒听起来像在思考，连续「嗯」听起来像在犹豫。

### 2.3 专业术语必须说准

这条比想象中重要。语音输入和口语习惯会带来大量「同一个词的不同说法」，在面试官耳朵里就是「你没实操过」。

高频错词对照：

| 容易说成 | 正确说法 | 为什么危险 |
|---|---|---|
| 「技术差」 | **技术栈** | 说「技术差」是直接负面自评 |
| 「current type」 | **crontab** | 定时任务题的核心词 |
| 「safe -S」/「safe 集群」 | **ceph -s** / **Ceph 集群** | Ceph 命令行工具的名字 |
| 「OST」 | **OSD** | Ceph 最核心的组件名 |
| 「X back」/「zabbix agent」 | **Zabbix** | 监控系统名 |
| 「promise 休斯」 | **Prometheus** | 监控系统名 |
| 「剖的」/「泡的」/「pond」 | **Pod** | K8S 最基础的单元 |
| 「cube city L」/「ctrl」 | **kubectl** | K8S 命令行工具 |
| 「node」说成「节点创建」 | 改 Deployment 创建的是**新 Pod** | 概念错误 |
| 「OS」说成「OSD」 | 两者完全不同 | 概念错误 |
| 「In Sir Frances CPU」 | **Insufficient cpu** | 事件关键词 |
| 「多数派」 | **quorum**（多数派机制） | 专业说法 |

> [!NOTE]
> 面试前把这些词朗读三遍。很多人不是不会，是嘴没跟上。

### 2.4 通用排查框架

不确定怎么答的时候，用这个框架组织语言，至少不会乱：

```
监控指标 → 系统资源 → 进程/服务 → 网络 → 日志 → 定位并处理
```

不同题型的具体顺序：

| 题型 | 顺序 |
|---|---|
| 服务异常 | 进程存在？→ 端口监听？→ 绑定地址对？→ 应用日志？→ 依赖服务？ |
| K8S Pod Pending | describe 看 Events → 调度 → 资源/亲和性/污点 → PVC |
| K8S 发布失败 | get pod 看状态 → describe 看 Events → 分镜像/配置/应用 → 回滚 |
| Ceph 故障 | Ceph 状态 → OSD 进程 → 网络连通 → TCP/端口 → 日志 → 磁盘 IO |
| 磁盘 IO | iostat 确认 → iotop 定位进程 → lsof 看文件 → 判断业务影响 → 处理 |
| 备份失败 | 任务日志 → 网络 → 存储空间 → 权限账号 → 源端状态 → 验证恢复 |

### 2.5 别死背命令，要说清为什么执行

面试里出现过一次很有价值的质疑：

> 「你确定在 Linux 的用户终端上可以直接用 `systemctl status ceph-osd@3` 吗？」

这个质疑是对的。这条命令不是所有 Ceph 环境都能直接用，取决于安装方式。

> [!IMPORTANT]
> 知道「为什么执行这个命令」比背住命令重要得多。
>
> 把不确定的命令说死，被追问就会很难看。稳妥的表述是在命令前加条件：「如果是 systemd 管理的，可以用 systemctl 查看……」
>
> 同理，Ceph 端口不要背固定数字，要说「通过 `ss -lntp` 和 Ceph 配置确认当前监听情况」。

### 2.6 不要硬装会

最典型的场景：简历写的是 Ceph 和数据恢复经验，没有商业备份软件经验。

**错误做法**：面试官问 Veeam、NetBackup、爱数，硬说「熟练」。

**正确做法**是主动交代，再转化：

> 「我的经验更偏存储和基础设施这一侧。如果贵司用的是专业备份软件，我之前没有长期使用过，但对备份恢复的基本流程、以及 Linux、存储、网络这些基础比较熟悉，我认为上手会比较快。」

> [!TIP]
> 这个回答的结构是：有真实经历、有边界、不吹牛、给面试官继续追问的空间。
>
> 面试官听到「上手会比较快」比听到「我熟练」更放心。前者经得起追问，后者一问就塌。

优势放在这些点上：Linux、存储、K8S、云平台、故障排查、数据恢复。

### 2.7 三个不要

| 不要 | 要 |
|---|---|
| 一听到现象就猜原因 | 先确认现象，再定位，用数据说话 |
| 上来就重启、扩容、改配置 | 先定位原因，再谈处理，并说明风险控制 |
| 为了显得会而硬背命令、硬装熟练 | 说清原理，不确定的加条件，不会的诚实交代 |

## 本篇小结

Kubernetes 这块，分水岭不在会不会敲 `kubectl`，在**理不理解它为什么这么设计**。

Service 为什么要配 Endpoint、污点为什么放在节点上、为什么不能直接改 Pod，这三个问题答得上来，面试官基本会认为你真用过。

> [!TIP]
> 这是「运维工程师面试宝典」系列的第二篇。
> 上一篇：[（一）Linux 排障与监控选型](https://du-19.top/posts/devops-interview-linux/)
> 下一篇：[（三）Ceph 存储、灾备与数据恢复](https://du-19.top/posts/devops-interview-ceph/)
