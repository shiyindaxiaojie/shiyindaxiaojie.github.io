---
id: ai-agent-multi-agent-example-1
title: "多 Agent 协作比单 Agent 多解决了什么问题？"
slug: ai-agent-multi-agent-example-1
tracks:
  - ai-agent
category: multi-agent
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "多 Agent"
  - "任务协调"
  - "冲突裁决"
  - "协作成本"
summary: "围绕多 Agent的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
多 Agent 协作比单 Agent 多解决了什么问题？

::candidate level="core"::
只有角色确实需要不同工具、上下文或并行能力时才拆。多 Agent 增加通信、token、延迟和失败面；若只是把一个 Prompt 分成几段，单 Agent 加明确步骤通常更简单。

::interviewer::
这条多 Agent链路上线后，用什么证据验证设计？

::candidate level="deep"::
Trace 展示每个 Agent 的输入、输出、工具、token、耗时与交接，和单 Agent 基线比较任务成功率及成本。

::interviewer::
多 Agent里最容易漏掉的失败分支是什么？

::candidate::
并行 Agent 可能同时产生副作用。写操作必须集中调度、幂等并按资源加锁，不能只依赖自然语言协商。
