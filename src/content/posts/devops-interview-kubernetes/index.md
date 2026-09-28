---
title: 运维工程师面试宝典（二）：Kubernetes 排障与面试表达
published: 2026-09-29
description: 系列第二篇。覆盖 Service 与 Endpoint 的关系、CrashLoopBackOff 排查、Deployment 发布失败定位、为什么不直接改 Pod（声明式管理）、Pod Pending 与 Events 解读、Taint 与 Toleration 的设计思想；后半部分讲面试表达：线上面试使用 AI 辅助的风险、专业术语纠正表、通用排查框架，以及为什么不要硬装会。
tags: [运维, 面试, Kubernetes, 容器, 调度, 教程]
category: 教程
draft: false
pinned: false
---

# 一、Kubernetes 排障篇

## 1.1 Service 和 Endpoint 到底什么关系

面试官问这个问题，不是要你背 `kubectl get svc`，而是看**你理不理解 Service 为什么能找到 Pod**。

**一句话版本**：

> **Service 提供稳定的访问入口，Endpoint 维护后端真正提供服务的 Pod 地址列表。**

**为什么需要 Service？** 因为 Pod 不稳定：

```
mysql-1   10.1.1.10
mysql-2   10.1.1.11
mysql-3   10.1.1.12
```

没有 Service 的话，业务直连 `10.1.1.10`，Pod 一重启 IP 就变了。所以：

```
业务 Pod
    |
    ↓
database Service (10.96.0.10)   ← 业务只需要记这个
    |
    ↓
mysql Pod (10.1.1.10 / .11 / .12)
```

**Endpoint 的作用**：Service 只知道"我要一个叫 database 的入口"，但不知道"哪些 Pod 给我提供服务"。这个映射由 Endpoint 维护：

```
database Service
Endpoints:
10.1.1.10:3306
10.1.1.11:3306
10.1.1.12:3306
```

**面试版回答**：

> "Service 提供稳定的网络访问入口，通过 ClusterIP 等方式让客户端访问后端服务，而不需要关注 Pod IP 的变化。Endpoint 负责维护 Service 对应的后端 Pod 地址列表，Service 根据 Endpoint 将流量转发到实际提供服务的 Pod。如果 Service 存在但是 Endpoint 为空，通常说明后端 Pod 没有被正确关联，需要检查 Pod 状态、Label 和 Service Selector。"

**排障时怎么用**：

```
kubectl get endpoints database
```

- `ENDPOINTS: <none>` → Service 后面没有 Pod，查 Pod 状态、Label、selector
- 有 Endpoint → Service 已找到 Pod，继续查数据库进程、端口、网络策略

## 1.2 Pod 日志 connection refused，先怀疑 etcd 吗

**面试官问法**：Pod 日志显示 `connection refused: database service`，你认为是什么问题？

> [!CAUTION]
> **错误方向：怀疑 etcd。**
> etcd 是 **Kubernetes 控制面的数据库**，保存的是 Pod / Deployment / Service / ConfigMap / Secret 这些集群对象状态，**它不是业务 Pod 访问数据库时直接依赖的组件**。

**正确排查顺序**：

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

**面试版回答**：

> "如果 Pod 日志显示 connection refused，我首先不会判断是 etcd 问题，而会认为应用依赖的数据库服务不可用。我会检查数据库 Service、Endpoints、数据库 Pod 状态以及网络连通性。如果发现 Service 没有后端 Endpoint，再进一步检查 Label 和 Selector 配置。如果数据库正常，再排查网络策略或防火墙问题。"

> [!NOTE]
> PV/PVC 也不是完全无关——数据库 Pod 可能因为存储挂载失败起不来。但对于 `connection refused` 这个报错，**排查优先级低于 Service 和数据库本身**。这就是"优先级判断"能力。

## 1.3 Deployment 更新后新 Pod 启动失败

**面试官问法**：Deployment 更新后，新 Pod 启动失败，旧 Pod 还在运行。你怎么判断是镜像问题、配置问题还是应用问题？

**先理解为什么旧 Pod 还在跑**：Deployment 默认 **RollingUpdate（滚动更新）** 策略，设计目的就是避免一次性停掉所有旧业务。

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

**三种问题怎么区分**（看 `kubectl describe pod` 的 Events）：

| Events 报错 | 问题类型 | 检查方向 |
|---|---|---|
| `Failed to pull image` | 镜像问题 | 镜像地址、镜像是否存在、仓库认证 |
| `ConfigMap not found` / `Secret not found` | 配置问题 | 配置资源是否存在、名称是否正确 |
| `Container exited with code 1` / `CrashLoopBackOff` | 应用问题 | `kubectl logs` 看应用日志 |

**面试版回答**：

> "如果 Deployment 更新后新 Pod 启动失败，我不会立即删除旧 Pod，而是先通过 `kubectl get pod` 查看状态，然后使用 `kubectl describe pod` 查看 Events，根据报错判断方向。如果是镜像拉取失败，检查镜像地址和仓库权限；如果是 ConfigMap、Secret 等配置问题，检查配置资源；如果容器启动后退出，则通过 `kubectl logs` 查看应用日志。同时观察 Deployment 的 rollout 状态，必要时进行回滚。"

## 1.4 为什么不直接改 Pod（声明式管理）

这是 K8S 面试的经典分水岭题。

> [!CAUTION]
> 别说"任何时候都不能临时改 Pod"——**这个说法太绝对**。
> 准确表述是：**生产环境的正式变更不应该直接改 Pod**。

**核心原因**：

```
Deployment
     ↓
ReplicaSet
     ↓
    Pod
```

Pod 是"最终产物"，由 Deployment 控制。你直接 `kubectl edit pod pod-A`：

- 当前 Pod 临时变化
- **Deployment 不知道这个变化**
- Pod 被删除或重新调度后，**新 Pod 还是按 Deployment 原来的配置创建**

也就是说：

> **你改了实际运行中的 Pod，但是没有改"期望状态"。**

这正是 Kubernetes 的核心理念：**声明期望状态，让控制器不断把实际状态调整到期望状态**（声明式管理 / Declarative Management）。

**可以临时操作 Pod 的例外**：

```bash
kubectl exec -it pod-name -- bash    # 临时排查，看日志、环境 ✅
kubectl describe pod pod-name        # 查看状态 ✅
kubectl run test-nginx --image=nginx # 开发环境测试 ✅
```

**正式变更**（镜像版本、环境变量、资源限制、nodeSelector、affinity）应该改 Deployment YAML 然后 `kubectl apply`。

**面试版回答**：

> "不建议直接修改 Pod，因为 Pod 通常是由 Deployment、ReplicaSet 等控制器管理的，直接修改单个 Pod 会导致配置漂移，而且 Pod 被删除或重新调度后，修改可能会丢失。正确方式是修改 Deployment 的 YAML 配置，通过 `kubectl apply` 更新 Deployment，由 Deployment 控制器创建新的 ReplicaSet，并按照滚动更新策略逐步创建新的 Pod，同时逐步退出旧 Pod，这样整个变更过程更加可控，也方便回滚。"

**加分句**：

> "同时可以通过 rollout history 查看版本，并且必要时执行 rollback 回滚。"

> [!WARNING]
> **用词纠正**：不要说"修改 Deployment 后创建新的节点"。
> 修改 Deployment 创建的是**新的 Pod**，不是新的节点（Node）。
> **Node 是集群里的服务器资源**，不会因为改 Deployment 而创建。这个错误会直接暴露概念不清。

## 1.5 Pod 一直 Pending 怎么排查

**面试官问法**：K8S 里有 Pod 一直处于 Pending，你会怎么排查？

**核心顺序**：

> **Pending → 调度 → 节点资源 / 亲和性 / 污点容忍 → PVC → 其他**

**面试版回答**：

> "如果 Kubernetes 里面有 Pod 一直处于 Pending 状态，我会先通过 `kubectl describe pod` 查看 Pod 的详细信息，重点看 Events，确认是不是调度失败。然后再根据具体原因排查，比如节点资源不足、节点的 taint 和 Pod 的 toleration 不匹配、nodeSelector 或亲和性配置导致没有合适的节点。如果 Pod 涉及 PVC，还要检查存储是否正常、PVC 是否绑定。最后结合节点状态和集群资源情况进一步定位。"

**如果面试官问"那你第一条命令是什么"**：

> "我第一步会执行 `kubectl describe pod <pod名> -n <命名空间>`，重点看 Events，因为 Pending 的具体原因通常会在调度事件里体现。"

> [!NOTE]
> **注意点**：不要一上来就说"Pod 之间的网络问题"。
> Pod 都还没调度起来、没运行，网络不是 Pending 的第一优先级。

## 1.6 读懂 Events：0/3 nodes are available

**面试官给出**：

```text
0/3 nodes are available:
2 node(s) had untolerated taint,
1 node(s) didn't match Pod's node affinity/selector.
```

**逐句拆解**：

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

**调度过程**：

```
Pod 来了
  ↓
调度器检查 3 个节点
  ↓
node-01 ❌ 污点，没有容忍
node-02 ❌ 污点，没有容忍
node-03 ❌ 不符合 nodeSelector / affinity
  ↓
没有可用节点 → Pod Pending
```

**面试版回答**：

> "这个事件说明不是 CPU 或内存资源问题，而是调度条件不满足。两个节点因为存在 Pod 未容忍的 Taint 被排除，另一个节点因为不满足 Pod 的 nodeSelector 或 affinity 条件被排除，所以调度器没有找到合适节点。"

**追问题**：如果污点是合理的（GPU 节点不给普通业务用），但第三个节点的 nodeSelector 配置写错了，改 Pod 还是改节点？

> [!TIP]
> 关键思维：**不要急着回答"改谁"，先判断"到底是谁配置错了"。**
>
> - 如果是 **Pod 的 selector 写错** → 改 Pod（更准确说，改 Deployment）
> - 如果是 **节点标签打错** → 改节点标签，但要注意影响面（该节点上已运行的其他 Pod 是否受影响）
>
> 你说"改 Pod 影响更小"——这个**变更影响范围**的考量是对的，运维思维里很重要，但要先判断根因。

## 1.7 为什么污点在节点，容忍在 Pod

这道题考的是**设计思想**，比背命令值钱得多。

**核心原因**：**控制权应该在节点侧，而不是在 Pod 侧。**

- **Taint 设置在 Node 上**，意思是"这个节点有某种特殊属性，不希望普通 Pod 随便调度过来"
- **Toleration 设置在 Pod 上**，意思是"我知道这个条件，我允许进去"

**为什么不让 Pod 标"我不能去 node-01"？** 因为 Pod 是**需求方**，它并不知道：哪个节点适合它、哪些是生产节点、哪些是测试节点。让成百上千个 Pod 各自维护"我不能去哪"，管理会失控。

**现实场景**：公司有一台高性能 GPU 服务器 node-01。没有污点的话，普通 nginx 可能被调度上去，浪费昂贵资源。管理员给 GPU 节点加污点：

```bash
kubectl taint node node-01 gpu=true:NoSchedule
```

只有真正需要 GPU 的 Pod 才添加 toleration：

```yaml
tolerations:
- key: gpu
  value: true
```

**面试版回答**：

> "Kubernetes 将污点设计在 Node 上，是因为节点资源和节点属性属于集群管理员管理范围。Node 通过 Taint 表达'我不希望普通 Pod 调度到这里'，而 Pod 通过 Toleration 表示'我能够接受这个限制'。这种设计可以避免普通业务误占特殊节点资源，同时让调度策略更加集中管理。"

## 1.8 Insufficient cpu 是什么意思

> [!CAUTION]
> **不要直接说"CPU 爆满"。**
> `Insufficient cpu` 的准确含义是：**当前节点可分配给这个 Pod 的 CPU 资源不足**——不是节点整体 CPU 用满了，而是**剩余可分配量不满足 Pod 的 request**。

**追问：节点 CPU 不足，第一反应是重启节点吗？**

> [!IMPORTANT]
> **不要一上来就重启节点。**
> 现在只知道 Pod 是 Pending，还不知道具体原因。直接重启节点属于比较大的操作，生产环境可能反而造成业务影响。

正确方向：先看具体是资源真的不够，还是 Pod 的 requests 设置过大，再考虑扩容节点、调整 requests、或让 Pod 调度到其他节点。

**查看节点资源**：

```bash
kubectl top nodes              # 各节点 CPU / 内存实际使用
kubectl describe node <node>   # 看 Allocatable / Allocated resources
```

> [!NOTE]
> 注意 `kubectl top` 依赖 metrics-server。面试时可以说"通过 `kubectl top nodes` 查看各节点资源使用情况"，但如果被追问"为什么查不到"，要知道是 metrics-server 没装。

---


---

# 二、面试中的通用问题

## 2.1 线上面试能不能用 AI 辅助

先说结论：**技术上大概率看不出来，但行为上很容易暴露。**

面试官通常看不到你另一个窗口的 ChatGPT——除非你共享了整个桌面。但真正出问题的是这些信号：

| 暴露信号 | 为什么危险 |
|---|---|
| 回答明显延迟 | 简单问题也要停十几秒，像在等生成 |
| 表达风格突变 | 平时口语化，突然变成书面长句 |
| 回答过于"标准" | 流程背得很完整，一问"你实际遇到过吗"就断 |
| **无法处理追问** | **最容易暴露**，一追细节就露馅 |
| 前后不一致 | 先说"熟练"，问到命令变成"了解" |
| 技术深度超过简历 | 简历没涉及的领域突然能深入回答 |

> [!IMPORTANT]
> 最致命的是**追问**。你说"我做过数据恢复"，对方会问：恢复的是什么数据？用什么方式？用了多久？怎么验证完整性？——如果答案不是你真正经历过的，第三问必崩。

**正确用法是面试前准备，不是面试中代答。** 把真实经历整理成自己的表达，追问时才能接得住。

---



这一部分的每一条，都是从实际回答里被纠正出来的。技术可以补，表达习惯不改，面试照样丢分。

## 2.2 口头停顿要克制

原始回答长这样：

> "呃，如果服务器变慢。那首先就应该从。比如这几个点，嗯，CPU 内存，磁盘 io。以及网络，嗯……"

技术内容是对的，但听感是"没想清楚"。

> [!TIP]
> 不需要做到零停顿，但**高频的"嗯 / 就是 / 相应的 / 呃"要刻意减少**。
> 一个实用技巧：**宁可短暂停顿一秒，也不要用口头禅填充**。沉默一秒听起来像在思考，连续"嗯"听起来像在犹豫。

## 2.3 专业术语必须说准

这一条比想象中重要得多。语音输入、口语习惯会带来大量"同一个词的不同说法"，在面试官耳朵里就是"你没实操过"。

整理一份**高频错词对照表**：

| 容易说成 | 正确说法 | 为什么危险 |
|---|---|---|
| "技术差" | **技术栈** | 说"技术差"是直接负面自评 |
| "current type" | **crontab** | 定时任务题的核心词 |
| "safe -S" / "safe 集群" | **ceph -s** / **Ceph 集群** | Ceph 命令行工具的名字 |
| "OST" | **OSD** | Ceph 最核心的组件名 |
| "X back" / "zabbix agent" | **Zabbix** | 监控系统名 |
| "promise 休斯" | **Prometheus** | 监控系统名 |
| "剖的" / "泡的" / "pond" | **Pod** | K8S 最基础的单元 |
| "cube city L" / "ctrl" | **kubectl** | K8S 命令行工具 |
| "node" 说成"节点创建" | 改 Deployment 创建的是**新 Pod**，不是新节点 | 概念错误 |
| "OS" 说成 "OSD" | 两者完全不同 | 概念错误 |
| "In Sir Frances CPU" | **Insufficient cpu** | 事件关键词 |
| "多数派" | **quorum**（多数派机制） | 专业说法 |

> [!NOTE]
> 面试前把这些词**朗读三遍**。很多人不是不会，是嘴没跟上。

## 2.4 通用排查顺序（万能框架）

当你不确定怎么答时，用这个框架组织语言，至少不会乱：

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

## 2.5 不要死背命令，要说清"为什么执行"

面试里出现过一次很有价值的质疑：

> "你确定在 Linux 系统的用户终端上可以直接用 `systemctl status ceph-osd@3` 吗？"

这个质疑是对的。`systemctl status ceph-osd@3` **不是所有 Ceph 环境都能直接用**，取决于安装方式。

> [!IMPORTANT]
> **知道"为什么执行这个命令"比死记命令更重要。**
> 面试时把不确定的命令说死，被追问就会很难看。稳妥的表述是在命令前加条件：
> *"如果是 systemd 管理的，可以使用 systemctl 查看……"*

同理，**Ceph 端口不要背固定数字**，要说明"通过 `ss -lntp` 和 Ceph 配置确认当前监听情况"。

## 2.6 不要硬装会

最典型的场景：简历里写的是 Ceph 和数据恢复经验，没有商业备份软件经验。

**错误做法**：面试官问 Veeam / NetBackup / 爱数，硬说自己"熟练"。

**正确做法**（主动交代 + 转化）：

> "我的经验更偏存储和基础设施这一侧，如果贵司使用的是专业备份软件，我之前没有长期使用过，但是我对备份恢复的基本流程以及 Linux、存储、网络这些基础比较熟悉，我认为上手会比较快。"

> [!TIP]
> 这个回答的结构是：**有真实经历 + 有边界 + 不吹牛 + 给面试官继续追问的空间**。
> 面试官听到"上手会比较快"会比听到"我熟练"更放心——因为前者经得起追问，后者一问就塌。

**把优势放在这些点上**：Linux + 存储 + K8S + 云平台 + 故障排查 + 数据恢复。

## 2.7 三个"不要"总结

| 不要 | 要 |
|---|---|
| 一听到现象就猜原因 | 先确认现象，再定位，用数据说话 |
| 上来就重启 / 扩容 / 改配置 | 先定位原因，再谈处理，并说明风险控制 |
| 为了显得会而硬背命令、硬装熟练 | 说清原理，不确定的加条件，不会的诚实交代 |

---


---

## 本篇小结

Kubernetes 这一块，分水岭不在会不会用 `kubectl`，而在**理不理解它为什么这么设计**。Service 为什么要配 Endpoint、污点为什么放在节点上、为什么不能直接改 Pod——这三个问题答得上来，面试官基本会认为你真的用过。

> [!TIP]
> 这是「运维工程师面试宝典」系列的第二篇。
> 上一篇：[（一）Linux 排障与监控选型](https://du-19.top/posts/devops-interview-linux/)
> 下一篇：[（三）Ceph 存储、灾备与数据恢复](https://du-19.top/posts/devops-interview-ceph/)
