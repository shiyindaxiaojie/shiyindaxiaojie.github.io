---
id: go-backend-performance-result-example-2
title: "吞吐翻倍后，怎么确认没有用更高尾延迟和内存换来的？"
slug: go-backend-performance-result-example-2
tracks:
  - go-backend
category: performance-result
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "性能结果"
  - "pprof 分析"
  - "基准测试"
  - "尾延迟"
summary: "围绕性能结果的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
吞吐翻倍后，怎么确认没有用更高尾延迟和内存换来的？

::candidate level="deep"::
同时比较 P50/P99、错误率、GC、RSS、goroutine 和下游负载，并做持续压测。只看平均吞吐会掩盖排队和长尾；资源成本也应按每请求归一化。

::interviewer::
如果继续追数字，性能结果要拿出哪组证据？

::candidate level="deep"::
保留 benchstat、pprof、压测模型和线上灰度指标，确保优化前后输入数据、并发和依赖条件一致。

::interviewer::
性能结果最容易被忽略的边界是什么？

::candidate::
微基准结果不能直接代表服务收益。编译器优化、逃逸、缓存和真实 I/O 都可能改变结论，最终以端到端 SLI 为准。
