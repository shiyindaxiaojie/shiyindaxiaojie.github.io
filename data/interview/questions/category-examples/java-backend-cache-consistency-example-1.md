---
id: java-backend-cache-consistency-example-1
title: "数据库更新成功后，缓存删失败了怎么办？"
slug: java-backend-cache-consistency-example-1
tracks:
  - java-backend
category: cache-consistency
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "缓存一致性"
  - "旁路缓存"
  - "延迟双删"
  - "版本校验"
summary: "围绕缓存一致性的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
数据库更新成功后，缓存删失败了怎么办？

::candidate level="core"::
常用路径是先更新数据库，再删除缓存；删失败不能静默，要通过事务消息、outbox 或重试任务继续失效，并给缓存合理 TTL。读请求回源后重建缓存，最终以数据库为准。

::interviewer::
这个缓存一致性方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
记录数据库提交版本、缓存值版本、删除重试和命中率；故障演练要覆盖删缓存失败、消息延迟和热点回源。

::interviewer::
缓存一致性发生部分失败时，系统怎样收敛？

::candidate::
强一致缓存代价很高。先定义允许多旧、持续多久和哪些字段绝不能旧，再选择旁路缓存、版本校验或直接读库。
