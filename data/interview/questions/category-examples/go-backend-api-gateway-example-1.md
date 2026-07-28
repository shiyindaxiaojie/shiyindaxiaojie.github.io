---
id: go-backend-api-gateway-example-1
title: "API 网关怎样统一鉴权和限流，又不把业务规则全塞进去？"
slug: go-backend-api-gateway-example-1
tracks:
  - go-backend
category: api-gateway
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "API 网关"
  - "鉴权限流"
  - "配置下发"
  - "故障隔离"
summary: "围绕API 网关的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
API 网关怎样统一鉴权和限流，又不把业务规则全塞进去？

::candidate level="core"::
网关负责身份验证、通用授权上下文、路由、协议转换和粗粒度限流；资源级业务授权仍由服务判断。策略要版本化并可灰度，身份上下文经过签名传递，后端不能信任客户端自带头。

::interviewer::
这条API 网关链路上线后，用什么证据验证设计？

::candidate level="deep"::
查看网关自身 SLI、配置版本、路由命中、限流拒绝、上游错误和端到端 Trace，压测还要覆盖配置热更新。

::interviewer::
API 网关里最容易漏掉的失败分支是什么？

::candidate::
网关层重试会放大下游流量，插件过多也会拉高尾延迟。通用能力每增加一项，都要有性能预算和故障隔离。
