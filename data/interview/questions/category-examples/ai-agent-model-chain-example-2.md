---
id: ai-agent-model-chain-example-2
title: "反问模型链路时，怎样看出团队能复现线上坏答案？"
slug: ai-agent-model-chain-example-2
tracks:
  - ai-agent
category: model-chain
stage: reverse
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "模型链路"
  - "端到端 Trace"
  - "上下文"
  - "版本追踪"
summary: "围绕模型链路的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
反问模型链路时，怎样看出团队能复现线上坏答案？

::candidate level="deep"::
问一次请求是否记录 Prompt、模型参数、检索索引、工具输入输出和完整 Trace，线上失败多久能回放。若只保存最终文本，模型链路几乎无法复现。

::interviewer::
如果继续追数字，模型链路要拿出哪组证据？

::candidate level="deep"::
Trace 记录每阶段耗时、输入输出版本、token、检索命中与工具结果，评测样本能回放同一条链路。

::interviewer::
模型链路最容易被忽略的边界是什么？

::candidate::
链路版本必须整体可追溯。只记录模型名而不记录 Prompt、知识库和工具版本，线上问题无法复现。
