---
id: go-backend-traffic-spike-example-2
title: "自动扩容来不及接住突发流量时，系统怎样降级？"
slug: go-backend-traffic-spike-example-2
tracks:
  - go-backend
category: traffic-spike
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "流量突增"
  - "过载保护"
  - "自动扩容"
  - "服务降级"
summary: "围绕流量突增的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
自动扩容来不及接住突发流量时，系统怎样降级？

::candidate level="deep"::
预留最小冗余，短突发用有界队列吸收，超过等待预算就快速失败或返回缓存/简化结果。扩容期间限制重试，并确保新实例预热完成后再接流量。

::interviewer::
如果现场验证这项流量突增判断，先看哪些指标或日志？

::candidate level="deep"::
压测与线上都看请求率、P99、goroutine、队列、连接池、GC 和下游限流，版本扩容时间线要能解释恢复过程。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
只按 CPU 扩容会漏掉 I/O 等待和下游瓶颈。扩容也可能把数据库打穿，容量边界必须端到端计算。
