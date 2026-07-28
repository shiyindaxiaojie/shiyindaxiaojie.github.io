---
id: ai-agent-cost-latency-example-1
title: "Agent 响应太慢，先并行、换小模型还是减少上下文？"
slug: ai-agent-cost-latency-example-1
tracks:
  - ai-agent
category: cost-latency
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "成本与延迟"
  - "模型路由"
  - "Token 预算"
  - "端到端延迟"
summary: "围绕成本与延迟的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Agent 响应太慢，先并行、换小模型还是减少上下文？

::candidate level="core"::
先用 Trace 拆出检索、模型首 token、生成、工具和串行等待。独立工具可并行，简单步骤可路由小模型，冗余上下文先裁剪；没有阶段数据就直接换模型，可能省了生成却仍卡在工具。

::interviewer::
这个成本与延迟方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
记录每阶段延迟、首 token、输入输出 token、缓存命中、工具次数和单任务成本，按任务类型看 P95/P99。

::interviewer::
成本与延迟发生部分失败时，系统怎样收敛？

::candidate::
并行会增加峰值资源与重复调用，小模型也可能因错误重试更贵。优化以任务成功下的单位成本为目标，不只看单次价格。
