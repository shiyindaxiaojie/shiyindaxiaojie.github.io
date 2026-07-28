---
id: cloud-native-observability-example-2
title: "一次跨服务超时，指标、日志和 Trace 怎么配合收敛？"
slug: cloud-native-observability-example-2
tracks:
  - cloud-native
category: observability
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "可观测性"
  - "指标日志 Trace"
  - "SLI/SLO"
  - "链路追踪"
summary: "围绕可观测性的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一次跨服务超时，指标、日志和 Trace 怎么配合收敛？

::candidate level="deep"::
先用入口错误率和延迟确认范围，再从慢 Trace 找共同依赖，最后用该依赖的指标判断是容量、错误还是排队，并回到结构化日志看具体错误码。顺序是从全局到样本再到细节。

::interviewer::
如果现场现象和预期不一致，可观测性怎么继续缩小范围？

::candidate level="deep"::
同一个 trace_id 应能关联网关、服务与依赖日志，指标按版本和区域切片；采样率、丢弃量和时钟偏差也必须可见。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
高基数标签会拖垮指标系统，全量 Trace 又成本过高。要区分聚合维度与事件字段，并用头部、尾部和错误采样组合。
