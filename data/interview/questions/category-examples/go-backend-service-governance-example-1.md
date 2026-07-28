---
id: go-backend-service-governance-example-1
title: "服务治理平台怎样发现超时配置彼此冲突？"
slug: go-backend-service-governance-example-1
tracks:
  - go-backend
category: service-governance
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "服务治理"
  - "超时预算"
  - "重试风暴"
  - "策略版本"
summary: "围绕服务治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
服务治理平台怎样发现超时配置彼此冲突？

::candidate level="core"::
采集入口、服务和依赖的 deadline、重试与熔断配置，按调用拓扑计算总预算；上游时间小于下游或多层重试相乘时直接提示。治理不只是下发参数，还要能看到实际生效版本。

::interviewer::
这条服务治理链路上线后，用什么证据验证设计？

::candidate level="deep"::
Trace 记录 deadline、attempt 和治理策略版本，配合熔断状态、限流拒绝、下游 SLI 与配置审计定位。

::interviewer::
服务治理里最容易漏掉的失败分支是什么？

::candidate::
集中治理不能覆盖业务语义。支付与查询的重试边界不同，平台应提供安全默认值和约束，业务仍需声明幂等与降级策略。
