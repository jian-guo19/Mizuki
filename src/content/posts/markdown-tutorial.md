---
title: Markdown Tutorial
published: 2025-01-20
pinned: true
description: 一个简单的Markdown博客文章的例子。
tags: [Markdown, Blogging]
category: Examples
licenseName: "Unlicensed"
author: emn178
sourceLink: "https://github.com/emn178/markdown"
draft: false
---

# Markdown Tutorial

一份 Markdown 示例展示了如何编写 Markdown 文件。本文档整合了核心语法与扩展功能（GMF）。

- [块级元素](#block-elements)
  - [段落和换行符](#paragraphs-and-line-breaks)
  - [标题](#headers)
  - [引用块](#blockquotes)
  - [列表](#lists)
  - [代码块](#code-blocks)
  - [分割线](#horizontal-rules)
  - [表格](#table)
- [行内元素](#span-elements)
  - [链接](#links)
  - [强调](#emphasis)
  - [代码](#code)
  - [图片](#images)
  - [删除线](#strikethrough)
- [其他](#miscellaneous)
  - [自动链接](#automatic-links)
  - [反斜杠转义](#backslash-escapes)
- [行内 HTML](#inline-html)

## Block Elements

### 段落和换行符

#### 段落

HTML 标签: `<p>`

一个或多个空行。（空白行是指只包含**space**或**tab**的行。）

Code:

    This will be
    inline.

    This is second paragraph.

Preview:

---

This will be
inline.

This is second paragraph.

---

#### 换行符

HTML 标签: `<br />`

以两个或多个空格结束一行。

Code:

    This will be not
    inline.

Preview:

---

This will be not  
inline.

---

### 标题

Markdown支持两种样式的标题，Setext和atx。

#### Setext

HTML 标签: `<h1>`, `<h2>`

使用  等号（=） 下划线表示 `<h1>` 短横线（-） 下划线表示 `<h2>` ，符号数量不限。

Code:

    This is an H1
    =============
    This is an H2
    -------------

Preview:

---

# This is an H1

## This is an H2

---

#### atx

HTML Tags: `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`

在行首使用 1–6 个井号（#），分别对应 `<h1>` 至 `<h6>` 六级标题。
Code:

    # This is an H1
    ## This is an H2
    ###### This is an H6

Preview:

---

# This is an H1

## This is an H2

###### This is an H6

---

你也可以选择闭合 atx 风格的标题。结尾的#号数量不必与开头的#号数量一致。

Code:

    # This is an H1 #
    ## This is an H2 ##
    ### This is an H3 ######

Preview:

---

# This is an H1

## This is an H2

### This is an H3

---

### 引用块

HTML 标签: `<blockquote>`

Markdown 使用电子邮件风格的 > 符号来表示引用块。如果手动换行并在每一行前都加上 >，显示效果会更美观。

Code:

    > This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
    > consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
    > Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.
    >
    > Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
    > id sem consectetuer libero luctus adipiscing.

Preview:

---

> This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
> consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
> Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.
>
> Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
> id sem consectetuer libero luctus adipiscing.

---

Markdown 允许你偷懒，只在手动换行段落的第一行前面加上 > 即可。

Code:

    > This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
    consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
    Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.

    > Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
    id sem consectetuer libero luctus adipiscing.

Preview:

---

> This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
> consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
> Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.

> Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
> id sem consectetuer libero luctus adipiscing.

---

引用块可以嵌套（即在引用块内再嵌套一层引用），只需增加对应的 > 层级即可。

Code:

    > This is the first level of quoting.
    >
    > > This is nested blockquote.
    >
    > Back to the first level.

Preview:

---

> This is the first level of quoting.
>
> > This is nested blockquote.
>
> Back to the first level.

---

引用块内可以包含其他 Markdown 元素，包括标题、列表和代码块。

Code:

    > ## This is a header.
    >
    > 1.   This is the first list item.
    > 2.   This is the second list item.
    >
    > Here's some example code:
    >
    >     return shell_exec("echo $input | $markdown_script");

Preview:

---

> ## This is a header.
>
> 1.  This is the first list item.
> 2.  This is the second list item.
>
> Here's some example code:
>
>     return shell_exec("echo $input | $markdown_script");

---

### 列表

Markdown 支持有序列表（带数字）和无序列表（带项目符号）。

#### 无序列表

HTML 标签: `<ul>`

无序列表可以使用星号（*）、加号（+）和短横线（-）来标记。

Code:

    *   Red
    *   Green
    *   Blue

Preview:

---

- Red
- Green
- Blue

---

等同于：

Code:

    +   Red
    +   Green
    +   Blue

以及：

Code:

    -   Red
    -   Green
    -   Blue

#### 有序列表

HTML 标签: `<ol>`

有序列表使用数字后跟句号：

Code:

    1.  Bird
    2.  McHale
    3.  Parish

Preview:

---

1.  Bird
2.  McHale
3.  Parish

---

如果写出类似这样的内容，有可能会意外触发有序列表：

Code:

    1986. What a great season.

Preview:

---

1986. What a great season.

---

你可以用 ** 反斜杠转义（\）** 来避开这个点号：

Code:

    1986\. What a great season.

Preview:

---

1986\. What a great season.

---

#### 缩进格式

##### 引用块

如果要在列表项内嵌套引用块，引用块的 > 符号需要进行缩进：

Code:

    *   A list item with a blockquote:

        > This is a blockquote
        > inside a list item.

Preview:

---

- A list item with a blockquote:

  > This is a blockquote
  > inside a list item.

---

##### 代码块

若要在列表项内嵌套代码块，代码块需要缩进两层—— 即 8 个空格 或 两个制表符（Tab）：

Code:

    *   A list item with a code block:

            <code goes here>

Preview:

---

- A list item with a code block:

      <code goes here>

---

##### 嵌套列表

Code:

    * A
      * A1
      * A2
    * B
    * C

Preview:

---

- A
  - A1
  - A2
- B
- C

---

### 代码块

HTML 标签: `<pre>`

块的每一行缩进至少 4个空格 或  1个制表符（Tab） 。
Code:

    This is a normal paragraph:

        This is a code block.

Preview:

---

This is a normal paragraph:

    This is a code block.

---

代码块会一直持续到遇到非缩进行（或文章末尾）为止。
在代码块内部，**& 符号（&）和尖括号（<和>）** 会被自动转换为 HTML 实体字符。

Code:

        <div class="footer">
            &copy; 2004 Foo Corporation
        </div>

Preview:

---

    <div class="footer">
        &copy; 2004 Foo Corporation
    </div>

---

下面的围栏代码块和语法高亮属于扩展语法，你也可以用这种方式来编写代码块。


#### 围栏代码块

只需要将代码用 ``` 包裹起来（如下所示），就不必再缩进 4 个空格。

Code:

    Here's an example:

    ```
    function test() {
      console.log("notice the blank line before this function?");
    }
    ```

Preview:

---

这是个例子：

```
function test() {
  console.log("notice the blank line before this function?");
}
```

---

#### 语法高亮

在围栏代码块中，可添加可选的语言标识符以启用语法高亮 ([Support Languages](https://github.com/github/linguist/blob/master/lib/linguist/languages.yml)).

Code:

    ```ruby
    require 'redcarpet'
    markdown = Redcarpet.new("Hello World!")
    puts markdown.to_html
    ```

Preview:

---

```ruby
require 'redcarpet'
markdown = Redcarpet.new("Hello World!")
puts markdown.to_html
```

---

### 分割线

HTML 标签: `<hr />`
在一行中单独放置三个或更多的短横线（-）、星号（*）或下划线（_）。符号之间可以添加空格。

Code:

    * * *
    ***
    *****
    - - -
    ---------------------------------------
    ___

Preview:

---

---

---

---

---

---

---

---

### 表格

HTML 标签: `<table>`

这属于扩展语法。
使用 ** 竖线（|）分隔列，用短横线（-）分隔表头，并通过冒号（:）** 设置对齐方式。
两侧的竖线（|）和对齐设置均为可选。每个单元格至少需要3 个分隔符来区分表头。
Code:

```
| Left | Center | Right |
|:-----|:------:|------:|
|aaa   |bbb     |ccc    |
|ddd   |eee     |fff    |

 A | B
---|---
123|456


A |B
--|--
12|45
```

Preview:

---

| Left | Center | Right |
| :--- | :----: | ----: |
| aaa  |  bbb   |   ccc |
| ddd  |  eee   |   fff |

| A   | B   |
| --- | --- |
| 123 | 456 |

| A   | B   |
| --- | --- |
| 12  | 45  |

---

## 行内元素

### 链接

HTML 标签: `<a>`

Markdown 支持两种链接样式：行内式和参考式。

#### 行内式

行内式内容规范如下: `[Link Text](URL "Title")`

"Title"是可选的

Code:

    This is [an example](http://example.com/ "Title") inline link.

    [This link](http://example.net/) has no title attribute.

Preview:

---

This is [an example](http://example.com/ "Title") inline link.

[This link](http://example.net/) has no title attribute.

---

如果引用的是同一服务器上的本地资源，可以使用相对路径：

Code:

    See my [About](/about/) page for details.

Preview:

---

See my [About](/about/) page for details.

---

#### 参考式链接

你可以预先定义链接引用，格式如下： `[id]: URL "Title"`
标题同样是可选的。随后引用该链接时，格式为： `[Link Text][id]`

Code:

    [id]: http://example.com/  "Optional Title Here"
    This is [an example][id] reference-style link.

Preview:

---

[id]: http://example.com/ "Optional Title Here"

This is [an example][id] reference-style link.

---

具体规则如下：
- 方括号内填写链接标识符（不区分大小写，左侧最多可缩进 3 个空格）；
- 紧跟一个冒号；
- 接着是一个或多个空格（或制表符）；
- 然后是链接的 URL；
- 链接 URL 可以选择性地用尖括号包裹；
- 最后可选择性地添加链接标题属性，用双引号、单引号或圆括号包裹均可。
以下三种链接定义是等效的：

Code:

    [foo]: http://example.com/  "Optional Title Here"
    [foo]: http://example.com/  'Optional Title Here'
    [foo]: http://example.com/  (Optional Title Here)
    [foo]: <http://example.com/>  "Optional Title Here"

如果使用空的方括号，链接文本本身就会被当作标识符使用。

Code:

    [Google]: http://google.com/
    [Google][]

Preview:

---

[Google]: http://google.com/

[Google][]

---

### 强调

HTML 标签: `<em>`, `<strong>`

Markdown 使用星号（*）和下划线（_）表示强调。
使用单个符号会被解析为 `<em>`。成对符号会被解析为 `<strong>`。

Code:

    *single asterisks*

    _single underscores_

    **double asterisks**

    __double underscores__

Preview:

---

_single asterisks_

_single underscores_

**double asterisks**

**double underscores**

---

但如果 (*) 或 (_) 两边都有空格，就会被当作普通星号或下划线处理。
你也可以用反斜杠转义：

Code:

    \*this text is surrounded by literal asterisks\*

Preview:

---

\*this text is surrounded by literal asterisks\*

---

### 代码

HTML 标签: `<code>`

用 ** 反引号（`）** 将其包裹起来即可。

Code:

    Use the `printf()` function.

Preview:

---

Use the `printf()` function.

---

如果想在代码行内插入反引号本身，可以用多个反引号作为首尾分隔符：

Code:

    ``There is a literal backtick (`) here.``

Preview:

---

``There is a literal backtick (`) here.``

---

包裹行内代码的反引号分隔符前后可以加空格 —— 开头一个、结尾一个。这样就能在代码行内的开头或结尾直接使用反引号了。
Code:

    A single backtick in a code span: `` ` ``

    A backtick-delimited string in a code span: `` `foo` ``

Preview:

---

A single backtick in a code span: `` ` ``

A backtick-delimited string in a code span: `` `foo` ``

---

### 图片

HTML 标签: `<img />`

Markdown 的图片语法借鉴了链接语法，支持两种样式：行内式和参考式。


#### 行内式

行内图片语法如下：`![Alt text](URL "Title")`

"Title"为可选内容。

Code:

    ![Alt text](/path/to/img.jpg)

    ![Alt text](/path/to/img.jpg "Optional title")

Preview:

---

![Alt text](https://s2.loli.net/2024/08/20/5fszgXeOxmL3Wdv.webp)

![Alt text](https://s2.loli.net/2024/08/20/5fszgXeOxmL3Wdv.webp "Optional title")

---

具体格式说明：
- 英文感叹号：!
- 接着一对方括号，里面是图片的 alt 替代文本
- 接着一对圆括号，里面是图片 URL 或路径，以及可选的标题属性（用双引号或单引号包裹）


#### 参考式

参考式图片语法如下： `![Alt text][id]`

Code:

    [img id]: https://s2.loli.net/2024/08/20/5fszgXeOxmL3Wdv.webp  "Optional title attribute"
    ![Alt text][img id]

Preview:

---

[img id]: https://s2.loli.net/2024/08/20/5fszgXeOxmL3Wdv.webp "Optional title attribute"

![Alt text][img id]

---

### 删除线

HTML 标签: `<del>`

这属于扩展语法。
GitHub Flavored Markdown（GFM）添加了删除线语法。

Code:

```
~~Mistaken text.~~
```

Preview:

---

~~Mistaken text.~~

---

## 杂项

### 自动链接

Markdown 支持一种快捷方式来为 URL 和邮箱地址创建 “自动链接”：只需将 URL 或邮箱地址用尖括号包裹即可。

Code:

    <http://example.com/>

    <address@example.com>

Preview:

---

<http://example.com/>

<address@example.com>

---

GFM 会自动为标准 URL 生成链接。

Code:

```
https://github.com/emn178/markdown
```

Preview:

---

https://github.com/emn178/markdown

---

### 反斜杠转义

Markdown 允许你使用反斜杠转义，来输出那些在语法里原本有特殊含义的字符本身。

Code:

    \*literal asterisks\*

Preview:

---

\*literal asterisks\*

---

Markdown 支持对以下字符使用反斜杠进行转义:

Code:

    \   backslash
    `   backtick
    *   asterisk
    _   underscore
    {}  curly braces
    []  square brackets
    ()  parentheses
    #   hash mark
    +   plus sign
    -   minus sign (hyphen)
    .   dot
    !   exclamation mark

## 行内 HTML

对于 Markdown 语法没有覆盖到的标签，直接写 HTML 即可。不需要添加前缀或分隔符来标记 “切换到 HTML 模式”，直接使用标签就行。

Code:

    This is a regular paragraph.

    <table>
        <tr>
            <td>Foo</td>
        </tr>
    </table>

    This is another regular paragraph.

Preview:

---

This is a regular paragraph.

<table>
    <tr>
        <td>Foo</td>
    </tr>
</table>

This is another regular paragraph.

---

注意：在块级 HTML 标签内部，Markdown 格式语法不会被解析。
与块级标签不同，行内级 HTML 标签内部，Markdown 语法会正常解析。

Code:

    <span>**Work**</span>

    <div>
        **No Work**
    </div>

Preview:

---

<span>**Work**</span>

<div>
  **No Work**
</div>
***
