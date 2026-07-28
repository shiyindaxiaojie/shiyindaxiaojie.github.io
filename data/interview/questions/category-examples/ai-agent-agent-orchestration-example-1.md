---
id: ai-agent-agent-orchestration-example-1
title: "Agent 编排里 Planner、Executor 和 Memory 怎么分工？"
slug: ai-agent-agent-orchestration-example-1
tracks:
  - ai-agent
category: agent-orchestration
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Agent 编排"
  - "Planner/Executor 分工"
  - "状态恢复"
  - "幂等工具"
summary: "围绕Agent 编排的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Agent 编排里 Planner、Executor 和 Memory 怎么分工？

::candidate level="core"::
Planner 产出受约束的步骤，Executor 校验参数并调用工具，Memory 保存任务所需状态与证据。三者通过明确 schema 交互，权限判断不能交给 Planner 的自然语言；每一步都应有预算、超时和可观测结果。

::interviewer::
别停在原理上，Agent 编排落到线上先看什么证据？

::candidate level="deep"::
Trace 按 run_id/step_id 记录计划版本、工具参数、token、耗时和状态，故障注入验证重启后的恢复与重复副作用。

::interviewer::
Agent 编排这套判断在哪个边界下会失效？

::candidate::
Memory 不是越多越好。长期记忆可能带入过期或敏感信息，必须有来源、作用域、过期和用户可控删除。
