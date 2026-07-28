---
id: java-backend-social-example-2
title: "评论和点赞数高并发更新，怎样兼顾实时性与准确性？"
slug: java-backend-social-example-2
tracks:
  - java-backend
category: social
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "社交系统"
  - "时间线"
  - "热点用户"
  - "异步计数"
summary: "围绕社交系统的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
评论和点赞数高并发更新，怎样兼顾实时性与准确性？

::candidate level="deep"::
交互先写唯一事件或关系表保证去重，计数可以异步聚合并用缓存提供近实时展示，后台按事件重算校准。需要强语义的动作仍以主记录为准，不能把自增缓存当最终事实。

::interviewer::
这项社交系统设计怎么证明不是纸上方案？

::candidate level="deep"::
观察扇出队列堆积、热点分片、时间线 P99、重复事件和计数校准差异；按头部用户单独切片。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
混合扩散会增加读时合并和一致性复杂度。删除、取消关注、隐私变化都要定义传播时效，不能只优化发布峰值。
