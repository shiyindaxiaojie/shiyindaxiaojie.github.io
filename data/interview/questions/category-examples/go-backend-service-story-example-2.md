---
id: go-backend-service-story-example-2
title: "反问 Go 服务值班时，怎样看出排障体系是否成熟？"
slug: go-backend-service-story-example-2
tracks:
  - go-backend
category: service-story
stage: reverse
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "Go 服务"
  - "服务边界"
  - "pprof 分析"
  - "线上排障"
summary: "围绕Go 服务的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
反问 Go 服务值班时，怎样看出排障体系是否成熟？

::candidate level="deep"::
可以问最近一次线上事故先由什么信号发现、值班人拿到哪些 profile 和 Trace、恢复后改了什么。若排障仍依赖登录机器临时猜测，说明工具链与责任边界还没有沉淀。

::interviewer::
如果继续追数字，Go 服务要拿出哪组证据？

::candidate level="deep"::
可信回答能给出事故时间线、pprof 或 Trace 的获取方式、值班手册和复盘行动项，而不是只说“有完善监控”。

::interviewer::
Go 服务最容易被忽略的边界是什么？

::candidate::
监控齐全也可能无法复现低概率问题。继续确认 profile 的采样成本、数据保留时长和紧急调试权限。
