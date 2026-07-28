---
id: devops-monitoring-example-2
title: "怎么把 CPU 告警升级成面向用户影响的 SLO 告警？"
slug: devops-monitoring-example-2
tracks:
  - devops
category: monitoring
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "监控告警"
  - "SLI/SLO"
  - "告警降噪"
  - "错误预算"
summary: "围绕监控告警的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
怎么把 CPU 告警升级成面向用户影响的 SLO 告警？

::candidate level="deep"::
CPU 是原因候选，不是用户结果。先为请求成功率和延迟定义 SLI，再按错误预算燃烧速度做快慢窗口告警；CPU、连接池和队列深度留作诊断信号，只有它们明确威胁 SLO 时才升级。

::interviewer::
如果现场现象和预期不一致，监控告警怎么继续缩小范围？

::candidate level="deep"::
用告警命中事故率、误报率、重复率、确认时间和处置结果评估治理；SLO 告警要能回放历史事故验证阈值。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
只看聚合 SLO 会漏掉小租户或单地域故障。全局指标之外还要按关键用户、地域和版本切片，并控制标签基数。
