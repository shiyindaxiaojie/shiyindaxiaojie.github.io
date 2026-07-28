---
id: java-backend-idempotent-api-example-2
title: "幂等记录处于处理中，客户端重试时应该返回什么？"
slug: java-backend-idempotent-api-example-2
tracks:
  - java-backend
category: idempotent-api
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "接口幂等"
  - "幂等键"
  - "唯一约束"
  - "请求重放"
summary: "围绕接口幂等的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
幂等记录处于处理中，客户端重试时应该返回什么？

::candidate level="deep"::
若原请求仍在执行，返回明确的处理中状态和可查询地址，而不是再次执行业务或直接报失败。完成后重复请求返回同一业务结果；请求参数与原摘要不一致则拒绝复用该键。

::interviewer::
如果现场验证这项接口幂等判断，先看哪些指标或日志？

::candidate level="deep"::
压测并发相同幂等键，检查唯一约束、业务记录和返回结果；日志要能按幂等键串起首次请求、重试和最终状态。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
幂等记录需要生命周期。过早过期会允许旧请求重放，永久保存又成本过高，应依据业务可重试窗口和审计要求设定。
