---
id: cloud-native-service-mesh-example-1
title: "服务网格适合解决哪些流量治理问题，又不适合解决什么？"
slug: cloud-native-service-mesh-example-1
tracks:
  - cloud-native
category: service-mesh
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "服务网格"
  - "Sidecar"
  - "mTLS"
  - "流量治理"
summary: "围绕服务网格的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
服务网格适合解决哪些流量治理问题，又不适合解决什么？

::candidate level="core"::
网格适合统一处理 mTLS、服务身份、流量分配、重试与遥测，让业务不必重复实现。它解决不了错误的业务超时、数据一致性和服务边界；把所有故障都交给代理重试，反而会放大流量。

::interviewer::
别停在原理上，服务网格落到线上先看什么证据？

::candidate level="deep"::
比较启用前后的 P50/P99、代理资源、连接数和重试量；故障时检查 Envoy 指标、配置 dump、证书状态与应用 Trace。

::interviewer::
服务网格这套判断在哪个边界下会失效？

::candidate::
重试、超时和熔断若在客户端、网格和网关重复配置，会形成乘法效应。每一层的责任和总时间预算必须统一。
