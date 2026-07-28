---
id: cloud-native-service-mesh-example-2
title: "Sidecar 模式会带来哪些性能和排障成本？"
slug: cloud-native-service-mesh-example-2
tracks:
  - cloud-native
category: service-mesh
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "服务网格"
  - "Sidecar"
  - "mTLS"
  - "流量治理"
summary: "围绕服务网格的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Sidecar 模式会带来哪些性能和排障成本？

::candidate level="deep"::
每个请求多经过代理，会增加 CPU、内存和尾延迟，也多一套配置与证书生命周期。排障时要区分应用、入站代理、出站代理和控制面，配置下发延迟本身也可能制造局部不一致。

::interviewer::
如果现场现象和预期不一致，服务网格怎么继续缩小范围？

::candidate level="deep"::
比较启用前后的 P50/P99、代理资源、连接数和重试量；故障时检查 Envoy 指标、配置 dump、证书状态与应用 Trace。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
重试、超时和熔断若在客户端、网格和网关重复配置，会形成乘法效应。每一层的责任和总时间预算必须统一。
