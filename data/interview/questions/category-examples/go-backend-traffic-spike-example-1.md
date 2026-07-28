---
id: go-backend-traffic-spike-example-1
title: "流量十分钟内涨五倍，Go 服务先保护哪几个资源？"
slug: go-backend-traffic-spike-example-1
tracks:
  - go-backend
category: traffic-spike
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "流量突增"
  - "过载保护"
  - "自动扩容"
  - "服务降级"
summary: "围绕流量突增的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
流量十分钟内涨五倍，Go 服务先保护哪几个资源？

::candidate level="core"::
先保护下游连接、goroutine 和有界队列。入口按租户或接口限流，设置 deadline，拒绝低优先级请求；连接池与 worker 数不随请求无限增长。监控饱和度决定何时扩容，而不是只盯 CPU。

::interviewer::
这个流量突增方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
压测与线上都看请求率、P99、goroutine、队列、连接池、GC 和下游限流，版本扩容时间线要能解释恢复过程。

::interviewer::
流量突增发生部分失败时，系统怎样收敛？

::candidate::
只按 CPU 扩容会漏掉 I/O 等待和下游瓶颈。扩容也可能把数据库打穿，容量边界必须端到端计算。
