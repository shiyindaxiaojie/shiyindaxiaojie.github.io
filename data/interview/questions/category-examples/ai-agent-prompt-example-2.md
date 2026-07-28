---
id: ai-agent-prompt-example-2
title: "系统指令、用户输入和检索内容冲突时，谁优先？"
slug: ai-agent-prompt-example-2
tracks:
  - ai-agent
category: prompt
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Prompt"
  - "版本管理"
  - "回归评测"
  - "指令层级"
summary: "围绕Prompt的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
系统指令、用户输入和检索内容冲突时，谁优先？

::candidate level="deep"::
系统指令定义不可越过的安全和任务边界，开发者配置其下，用户输入表达需求，检索内容只作为不可信数据。内容之间用结构与标签隔离，检索文档里的指令不能提升权限。

::interviewer::
如果现场现象和预期不一致，Prompt怎么继续缩小范围？

::candidate level="deep"::
记录 Prompt hash、模型参数、工具版本、评测差异和线上版本切片指标；失败样本必须能用同一输入重放。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
模型行为不是完全确定的。回归要允许合理表达差异，但对事实、工具副作用和安全规则使用可判定断言。
