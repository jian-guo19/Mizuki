---
title: Markdown Extended Features
published: 2024-05-01
updated: 2024-11-29
description: '阅读更多关于降价的功能在Mizuki'
image: ''
tags: [Demo, Example, Markdown, Mizuki]
category: 'Examples'
draft: false 
---

## GitHub Repository Cards
您可以添加链接到GitHub存储库的动态卡，在页面加载时，存储库信息从GitHub API中提取。

::github{repo="LyraVoid/Mizuki"}

用代码创建一个GitHub存储库卡 `::github{repo="LyraVoid/Mizuki"}`.

```markdown
::github{repo="LyraVoid/Mizuki"}
```

## Admonitions

支持以下类型的警告: `note` `tip` `important` `warning` `caution`

:::note

突出显示用户应该考虑的信息.


:::tip

可选信息，以帮助用户更成功权衡。


:::important

用户所需的关键信息。


:::warning

由于一些潜在风险，需要用户立即关注的关键内容。


:::caution

注意到某个行为的负面潜在后果。


### Basic Syntax

```markdown
:::note
Highlights information that users should take into account, even when skimming.
:::

:::tip
Optional information to help a user be more successful.
:::
```

### Custom Titles

警告的标题可以自定义。

:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::

```markdown
:::note[MY CUSTOM TITLE]
This is a note with a custom title.
:::
```

### GitHub Syntax

> [!TIP]
> [The GitHub syntax](https://github.com/orgs/community/discussions/16925) is also supported.

```
> [!NOTE]
> The GitHub syntax is also supported.

> [!TIP]
> The GitHub syntax is also supported.
```

### Spoiler

你可以在文本中添加剧透。文本还支持**Markdown**语法。

语法 :spoiler[is hidden **ayyy**]!

```markdown
The content :spoiler[is hidden **ayyy**]!
