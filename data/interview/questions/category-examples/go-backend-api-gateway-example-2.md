---
id: go-backend-api-gateway-example-2
title: "网关成为所有请求入口后，怎么避免它变成单点和排障黑洞？"
slug: go-backend-api-gateway-example-2
tracks:
  - go-backend
category: api-gateway
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "API 网关"
  - "鉴权限流"
  - "配置下发"
  - "故障隔离"
summary: "围绕API 网关的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
网关成为所有请求入口后，怎么避免它变成单点和排障黑洞？

::candidate level="deep"::
数据面无状态、多实例跨故障域部署，配置下发有版本、校验和回退。每次请求透传 trace_id，并记录路由、上游、重试和耗时；控制面故障时数据面应继续使用最后一份有效配置。

::interviewer::
这项API 网关设计怎么证明不是纸上方案？

::candidate level="deep"::
查看网关自身 SLI、配置版本、路由命中、限流拒绝、上游错误和端到端 Trace，压测还要覆盖配置热更新。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
网关层重试会放大下游流量，插件过多也会拉高尾延迟。通用能力每增加一项，都要有性能预算和故障隔离。
