## 推荐：天枢 API

**多模型 AI API 中转站** —— 一个地址、一个 key，同时打通 Claude / GPT / Gemini / Grok / DeepSeek / 智谱。

我用它替代了「三个平台账号 + 三张账单 + 三套 SDK」的日常，接口是 OpenAI 兼容协议，改一行 `base_url` 就能接上，酒馆、Cherry Studio、AI IDE 都通。

### 注册入口

👉 **[点这里注册天枢 API](https://tianshuapi.top/register?aff=5WPDRMS3UJT9)**

> 这是推广链接：通过它注册我会拿到一点返佣，**你的价格不变**。

### 为什么推荐它

- **分组和倍率全公开**，30 个分组、倍率 0.06 ~ 3.2，不用猜钱花在哪
- **每个分组有实时成功率**（不用登录就能查），挑之前能先看它今天稳不稳
- **三套协议头都认** —— `Authorization: Bearer`、`x-api-key`、`x-goog-api-key`，所以 OpenAI / Claude / Gemini 的客户端可以直连
- **邮箱注册**，没有邀请码门槛
- 支持 MCP

<details>
<summary>折腾党可以自己拉数据看（不用登录）</summary>

```bash
curl https://tianshuapi.top/api/v1/model-plaza
```

返回 30 个分组，每个带 `rate_multiplier`、`success_rate_24h`、`average_first_token_ms_24h`。自己跑一遍比看任何推荐都靠谱。
</details>

### 挑之前请先读这两条

**一、倍率低不等于好用。** 便宜的分组成功率可能只有一半，一次失败的请求浪费的是钱和十几秒。先看成功率，再挑便宜的。

**二、有些场景不要用中转。** 公司数据、客户隐私、涉密内容、需要 SLA 或发票的场合 —— 请走官方。中转站的价值是**低成本试错**，不是替代生产环境。

### 相关文章

- [一个 key 打通 Claude、GPT、Gemini：我的 AI API 中转站选站清单](/posts/tianshu-api-relay/)
- [把 Grok 4.7 接进酒馆的踩坑全记录](/posts/grok-tavern-debug/)

---

> 本站推荐内容均为本人真实使用，优缺点一并写明。若发现推荐的服务出现跑路、涨价或明显降智，我会更新这一页。
