---
id: ai-agent-cost-latency-example-2
title: "怎样给一次 Agent 任务设置 token 和工具预算？"
slug: ai-agent-cost-latency-example-2
tracks:
  - ai-agent
category: cost-latency
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "成本与延迟"
  - "模型路由"
  - "Token 预算"
  - "端到端延迟"
summary: "围绕成本与延迟的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
怎样给一次 Agent 任务设置 token 和工具预算？

::candidate level="deep"::
按任务价值和风险设置最大轮次、token、工具次数、总 deadline 与金额成本。接近预算时停止探索、返回已有结果或请求用户缩小问题，而不是无限自我反思。

::interviewer::
如果现场验证这项成本与延迟判断，先看哪些指标或日志？

::candidate level="deep"::
记录每阶段延迟、首 token、输入输出 token、缓存命中、工具次数和单任务成本，按任务类型看 P95/P99。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
并行会增加峰值资源与重复调用，小模型也可能因错误重试更贵。优化以任务成功下的单位成本为目标，不只看单次价格。
