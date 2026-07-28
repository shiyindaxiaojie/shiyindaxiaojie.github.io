---
id: python-engineer-fastapi-example-1
title: "FastAPI 的依赖注入适合管理哪些资源边界？"
slug: python-engineer-fastapi-example-1
tracks:
  - python-engineer
category: fastapi
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "FastAPI"
  - "依赖注入"
  - "异步接口"
  - "事件循环"
summary: "围绕FastAPI的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
FastAPI 的依赖注入适合管理哪些资源边界？

::candidate level="core"::
依赖适合承载请求级认证、数据库 session、配置和可复用校验，并用 yield 在请求结束释放资源。依赖层次要浅且副作用清楚，不能把所有业务逻辑藏进隐式依赖。

::interviewer::
别停在原理上，FastAPI落到线上先看什么证据？

::candidate level="deep"::
看事件循环延迟、worker 并发、线程池队列、Trace 和阻塞栈；用并发压测比较单请求与整体 P99。

::interviewer::
FastAPI这套判断在哪个边界下会失效？

::candidate::
把所有同步函数丢进线程池也会耗尽线程和连接。并发上限仍由数据库与下游容量决定，需要背压。
