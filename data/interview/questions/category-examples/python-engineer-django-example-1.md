---
id: python-engineer-django-example-1
title: "Django ORM 出现 N+1 查询，怎么发现和修？"
slug: python-engineer-django-example-1
tracks:
  - python-engineer
category: django
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Django"
  - "ORM"
  - "N+1 查询"
  - "事务边界"
summary: "围绕Django的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Django ORM 出现 N+1 查询，怎么发现和修？

::candidate level="core"::
在测试和 Trace 中统计单请求 SQL 数，找到循环里触发的延迟加载。外键一对一用 select_related，多值关系用 prefetch_related，并只取必要字段；优化后检查查询数和结果是否一致。

::interviewer::
别停在原理上，Django落到线上先看什么证据？

::candidate level="deep"::
用 Django Debug Toolbar/SQL 日志、APM Trace、EXPLAIN 和锁等待验证；测试可对关键接口断言最大查询数。

::interviewer::
Django这套判断在哪个边界下会失效？

::candidate::
prefetch 会把数据拉到内存，大结果集未必更好。分批、聚合或重写查询要根据数据量验证，而不是机械消灭所有 N+1。
