---
id: ai-agent-safety-example-2
title: "用户输入、知识库和系统指令怎样隔离权限？"
slug: ai-agent-safety-example-2
tracks:
  - ai-agent
category: safety
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Agent 安全"
  - "Prompt Injection"
  - "权限隔离"
  - "安全护栏"
summary: "围绕Agent 安全的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
用户输入、知识库和系统指令怎样隔离权限？

::candidate level="deep"::
系统指令定义策略，用户输入表达任务，知识库提供数据，三者使用独立结构和来源标签。身份与授权上下文由服务端注入且不可由用户覆盖，输出到工具前再次做策略判断。

::interviewer::
如果现场现象和预期不一致，Agent 安全怎么继续缩小范围？

::candidate level="deep"::
用攻击样本、越权集成测试、工具审计和红队记录验证；每次被拒绝的调用要能说明触发了哪条策略。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
没有一种过滤器能识别所有注入。安全依赖分层隔离与最小副作用，即使模型被诱导，执行层也不能越权。
