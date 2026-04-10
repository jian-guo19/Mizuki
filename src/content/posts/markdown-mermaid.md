---
title: Markdown Mermaid
published: 2023-10-01
pinned: false
description: 一个简单的例子，一个Markdown博客文章与流程图.
tags: [Markdown, Blogging, Mermaid]
category: Examples
draft: false
---
# Complete Guide to Markdown with Mermaid Diagrams

本文演示了如何在Markdown文档中使用Mermaid创建各种复杂的图，包括流程图、序列图、类图和状态图。

## Flowchart Example

流程图非常适合用于表示过程或算法步骤




```mermaid
graph TD
    A[Start] --> B{Condition Check}
    B -->|Yes| C[Process Step 1]
    B -->|No| D[Process Step 2]
    C --> E[Subprocess]
    D --> E
    subgraph E [Subprocess Details]
        E1[Substep 1] --> E2[Substep 2]
        E2 --> E3[Substep 3]
    end
    E --> F{Another Decision}
    F -->|Option 1| G[Result 1]
    F -->|Option 2| H[Result 2]
    F -->|Option 3| I[Result 3]
    G --> J[End]
    H --> J
    I --> J
```

## Sequence Diagram Example

序列图显示了对象之间随时间的相互作用。

```mermaid
sequenceDiagram
    participant User
    participant WebApp
    participant Server
    participant Database

    User->>WebApp: Submit Login Request
    WebApp->>Server: Send Auth Request
    Server->>Database: Query User Credentials
    Database-->>Server: Return User Data
    Server-->>WebApp: Return Auth Result
    
    alt Auth Successful
        WebApp->>User: Show Welcome Page
        WebApp->>Server: Request User Data
        Server->>Database: Get User Preferences
        Database-->>Server: Return Preferences
        Server-->>WebApp: Return User Data
        WebApp->>User: Load Personalized Interface
    else Auth Failed
        WebApp->>User: Show Error Message
        WebApp->>User: Prompt Re-entry
    end
```

## Gantt Chart Example

甘特图非常适合显示项目进度和时间表。

```mermaid
gantt
    title Website Development Project Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d
    
    section Design Phase
    Requirements Analysis      :a1, 2023-10-01, 7d
    UI Design                 :a2, after a1, 10d
    Prototype Creation        :a3, after a2, 5d
    
    section Development Phase
    Frontend Development      :b1, 2023-10-20, 15d
    Backend Development       :b2, after a2, 18d
    Database Design           :b3, after a1, 12d
    
    section Testing Phase
    Unit Testing              :c1, after b1, 8d
    Integration Testing       :c2, after b2, 10d
    User Acceptance Testing   :c3, after c2, 7d
    
    section Deployment
    Production Deployment     :d1, after c3, 3d
    Launch                    :milestone, after d1, 0d
```

## Class Diagram Example

类图显示了系统的静态结构，包括类、属性、方法以及它们之间的关系。
```mermaid
classDiagram
    class User {
        +String username
        +String password
        +String email
        +Boolean active
        +login()
        +logout()
        +updateProfile()
    }
    
    class Article {
        +String title
        +String content
        +Date publishDate
        +Boolean published
        +publish()
        +edit()
        +delete()
    }
    
    class Comment {
        +String content
        +Date commentDate
        +addComment()
        +deleteComment()
    }
    
    class Category {
        +String name
        +String description
        +addArticle()
        +removeArticle()
    }
    
    User "1" -- "*" Article : writes
    User "1" -- "*" Comment : posts
    Article "1" -- "*" Comment : has
    Article "1" -- "*" Category : belongs to
```

## State Diagram Example

状态图显示对象在其生命周期中经历的状态序列。

```mermaid
stateDiagram-v2
    [*] --> Draft
    
    Draft --> UnderReview : submit
    UnderReview --> Draft : reject
    UnderReview --> Approved : approve
    Approved --> Published : publish
    Published --> Archived : archive
    Published --> Draft : retract
    
    state Published {
        [*] --> Active
        Active --> Hidden : temporarily hide
        Hidden --> Active : restore
        Active --> [*]
        Hidden --> [*]
    }
    
    Archived --> [*]
```

## Pie Chart Example

饼图是显示比例和百分比数据的理想选择。

```mermaid
pie title Website Traffic Sources Analysis
    "Search Engines" : 45.6
    "Direct Access" : 30.1
    "Social Media" : 15.3
    "Referral Links" : 6.4
    "Other Sources" : 2.6
```

## Conclusion

Mermaid是一个强大的工具，用于在Markdown文档中创建各种类型的图表。本文演示了如何使用流程图、序列图、甘特图、类图、状态图和饼图。这些关系图可以帮助您更清楚地表达复杂的概念、过程和数据结构。

要使用Mermaid，只需在代码块中指定Mermaid语言，并使用简洁的文本语法描述图。Mermaid会自动将这些描述转换成漂亮的可视化图表。

尝试在你的下一篇技术博客文章或项目文档中使用美人鱼图，它们会让你的内容更专业，更容易理解！
