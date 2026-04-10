---
title: Simple Guides for Mizuki
published: 2024-04-01
description: "如何使用这个博客模板."
image: "./cover.webp"
tags: ["Mizuki", "Blogging", "Customization"]
category: Guides
draft: false
---



这个博客模板基于  [Astro](https://astro.build/).构建。本指南中未提及的内容，你可以在  [Astro Docs](https://docs.astro.build/).中找到答案。
## 文章头部配置

```yaml
---
title: My First Blog Post
published: 2023-09-09
description: This is the first post of my new Astro blog.
image: ./cover.jpg
tags: [Foo, Bar]
category: Front-end
draft: false
---
```




| 属性          | 说明 |
| :------------ | :------------------------------------------------------------------------------------------------- |
| `title`       | 文章标题 |
| `published`   | 文章发布日期 |
| `pinned`      | 是否将该文章置顶在文章列表顶部 |
| `priority`    | 置顶文章的优先级，数值越小优先级越高（0、1、2……） |
| `description` | 文章简短描述，会在首页展示 |
| `image`       | 文章封面图片路径<br/>1. 以 `http://` 或 `https://` 开头：使用网络图片<br/>2. 以 `/` 开头：对应 `public` 目录下的图片<br/>3. 无前缀：相对于当前 Markdown 文件的相对路径 |
| `tags`        | 文章标签 |
| `category`    | 文章分类 |
| `licenseName` | 文章内容的开源协议名称 |
| `author`      | 文章作者 |
| `sourceLink`  | 文章内容的原文链接或参考链接 |
| `draft`       | 是否为草稿，草稿状态的文章不会在页面中显示 |
## 文章文件存放位置


文章文件需放在 src/content/posts/ 目录下。你也可以创建子目录，更好地组织文章和相关资源文件。


```
src/content/posts/
├── post-1.md
└── post-2/
    ├── cover.webp
    └── index.md
```
