---
id: java-backend-social-example-1
title: "热点用户发一条动态，千万粉丝时间线怎么扩散？"
slug: java-backend-social-example-1
tracks:
  - java-backend
category: social
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "社交系统"
  - "时间线"
  - "热点用户"
  - "异步计数"
summary: "围绕社交系统的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
热点用户发一条动态，千万粉丝时间线怎么扩散？

::candidate level="core"::
普通用户可以写扩散，把动态 ID 推入粉丝收件箱；超级热点用户改成读扩散或混合模式，避免一次发布产生巨量写。时间线只存索引和游标，正文走缓存，拉取时合并多路并处理删除与屏蔽。

::interviewer::
这条社交系统链路上线后，用什么证据验证设计？

::candidate level="deep"::
观察扇出队列堆积、热点分片、时间线 P99、重复事件和计数校准差异；按头部用户单独切片。

::interviewer::
社交系统里最容易漏掉的失败分支是什么？

::candidate::
混合扩散会增加读时合并和一致性复杂度。删除、取消关注、隐私变化都要定义传播时效，不能只优化发布峰值。
