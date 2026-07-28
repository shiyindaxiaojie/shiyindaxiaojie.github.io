---
id: java-backend-cache-consistency-example-2
title: "延迟双删为什么不是缓存一致性的万能答案？"
slug: java-backend-cache-consistency-example-2
tracks:
  - java-backend
category: cache-consistency
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "缓存一致性"
  - "旁路缓存"
  - "延迟双删"
  - "版本校验"
summary: "围绕缓存一致性的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
延迟双删为什么不是缓存一致性的万能答案？

::candidate level="deep"::
第二次删除的延迟很难覆盖所有读写耗时与主从延迟，还可能误删刚写入的新值。它只能缩短部分并发窗口，仍需版本号、消息失效、TTL 和对账处理失败路径。

::interviewer::
如果现场验证这项缓存一致性判断，先看哪些指标或日志？

::candidate level="deep"::
记录数据库提交版本、缓存值版本、删除重试和命中率；故障演练要覆盖删缓存失败、消息延迟和热点回源。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
强一致缓存代价很高。先定义允许多旧、持续多久和哪些字段绝不能旧，再选择旁路缓存、版本校验或直接读库。
