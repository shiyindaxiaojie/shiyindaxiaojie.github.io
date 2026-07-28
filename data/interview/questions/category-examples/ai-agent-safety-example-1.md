---
id: ai-agent-safety-example-1
title: "Agent 怎么防 Prompt Injection 把检索内容变成指令？"
slug: ai-agent-safety-example-1
tracks:
  - ai-agent
category: safety
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Agent 安全"
  - "Prompt Injection"
  - "权限隔离"
  - "安全护栏"
summary: "围绕Agent 安全的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Agent 怎么防 Prompt Injection 把检索内容变成指令？

::candidate level="core"::
把检索文本明确标为不可信数据，模型只能从中提取证据，不能执行其中的指令。真正的权限在执行层：工具白名单、参数验证、最小凭证和高风险确认。输入检测是补充，不是唯一防线。

::interviewer::
别停在原理上，Agent 安全落到线上先看什么证据？

::candidate level="deep"::
用攻击样本、越权集成测试、工具审计和红队记录验证；每次被拒绝的调用要能说明触发了哪条策略。

::interviewer::
Agent 安全这套判断在哪个边界下会失效？

::candidate::
没有一种过滤器能识别所有注入。安全依赖分层隔离与最小副作用，即使模型被诱导，执行层也不能越权。
