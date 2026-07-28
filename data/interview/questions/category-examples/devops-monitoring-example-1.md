---
id: devops-monitoring-example-1
title: "告警很多但真正事故没人响应，先砍哪一类？"
slug: devops-monitoring-example-1
tracks:
  - devops
category: monitoring
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "监控告警"
  - "SLI/SLO"
  - "告警降噪"
  - "错误预算"
summary: "围绕监控告警的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
告警很多但真正事故没人响应，先砍哪一类？

::candidate level="core"::
先按过去一个月统计每条告警的触发次数、是否需要人工动作、是否对应用户影响。永远不处置的告警应删除或降级，重复描述同一故障的告警要按症状聚合，只有可执行且有负责人和手册的信号才适合叫醒值班人。

::interviewer::
别停在原理上，监控告警落到线上先看什么证据？

::candidate level="deep"::
用告警命中事故率、误报率、重复率、确认时间和处置结果评估治理；SLO 告警要能回放历史事故验证阈值。

::interviewer::
监控告警这套判断在哪个边界下会失效？

::candidate::
只看聚合 SLO 会漏掉小租户或单地域故障。全局指标之外还要按关键用户、地域和版本切片，并控制标签基数。
