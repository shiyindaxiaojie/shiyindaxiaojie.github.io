---
id: cloud-native-observability-example-1
title: "可观测性为什么不能只看日志和 CPU 告警？"
slug: cloud-native-observability-example-1
tracks:
  - cloud-native
category: observability
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "可观测性"
  - "指标日志 Trace"
  - "SLI/SLO"
  - "链路追踪"
summary: "围绕可观测性的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
可观测性为什么不能只看日志和 CPU 告警？

::candidate level="core"::
日志描述离散事件，指标给出整体趋势，Trace 还原单次请求的依赖与耗时。只有 CPU 和日志，既不知道用户是否受影响，也很难发现请求在哪一跳排队；先定义 SLI，再为诊断补齐三类信号。

::interviewer::
别停在原理上，可观测性落到线上先看什么证据？

::candidate level="deep"::
同一个 trace_id 应能关联网关、服务与依赖日志，指标按版本和区域切片；采样率、丢弃量和时钟偏差也必须可见。

::interviewer::
可观测性这套判断在哪个边界下会失效？

::candidate::
高基数标签会拖垮指标系统，全量 Trace 又成本过高。要区分聚合维度与事件字段，并用头部、尾部和错误采样组合。
