---
id: go-backend-service-governance-example-2
title: "一个下游开始抖动，治理策略如何避免重试风暴？"
slug: go-backend-service-governance-example-2
tracks:
  - go-backend
category: service-governance
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "服务治理"
  - "超时预算"
  - "重试风暴"
  - "策略版本"
summary: "围绕服务治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一个下游开始抖动，治理策略如何避免重试风暴？

::candidate level="deep"::
先限制并发和重试，按错误类型与幂等性决定是否重放，再用熔断隔离持续失败。恢复时小流量半开探测，结合缓存或降级结果，避免所有实例同时放开。

::interviewer::
这项服务治理设计怎么证明不是纸上方案？

::candidate level="deep"::
Trace 记录 deadline、attempt 和治理策略版本，配合熔断状态、限流拒绝、下游 SLI 与配置审计定位。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
集中治理不能覆盖业务语义。支付与查询的重试边界不同，平台应提供安全默认值和约束，业务仍需声明幂等与降级策略。
