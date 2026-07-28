---
id: python-engineer-django-example-2
title: "Django 事务边界过大，会带来哪些线上问题？"
slug: python-engineer-django-example-2
tracks:
  - python-engineer
category: django
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Django"
  - "ORM"
  - "N+1 查询"
  - "事务边界"
summary: "围绕Django的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Django 事务边界过大，会带来哪些线上问题？

::candidate level="deep"::
长事务会占连接、延长锁和 MVCC 版本存活，远端调用失败还让数据库事务白等。事务只包必要写入，外部副作用放到提交后事件或任务；嵌套 atomic 也要理解 savepoint 边界。

::interviewer::
如果现场现象和预期不一致，Django怎么继续缩小范围？

::candidate level="deep"::
用 Django Debug Toolbar/SQL 日志、APM Trace、EXPLAIN 和锁等待验证；测试可对关键接口断言最大查询数。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
prefetch 会把数据拉到内存，大结果集未必更好。分批、聚合或重写查询要根据数据量验证，而不是机械消灭所有 N+1。
