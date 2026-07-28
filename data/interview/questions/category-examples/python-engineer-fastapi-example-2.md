---
id: python-engineer-fastapi-example-2
title: "async 接口里混入阻塞调用，会发生什么？"
slug: python-engineer-fastapi-example-2
tracks:
  - python-engineer
category: fastapi
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "FastAPI"
  - "依赖注入"
  - "异步接口"
  - "事件循环"
summary: "围绕FastAPI的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
async 接口里混入阻塞调用，会发生什么？

::candidate level="deep"::
阻塞调用会占住事件循环线程，同一 worker 上的其他协程都不能推进，表现为 CPU 不高但延迟一起上升。把阻塞 I/O 放线程池，CPU 任务放进程或任务队列，并给外部调用设 deadline。

::interviewer::
如果现场现象和预期不一致，FastAPI怎么继续缩小范围？

::candidate level="deep"::
看事件循环延迟、worker 并发、线程池队列、Trace 和阻塞栈；用并发压测比较单请求与整体 P99。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
把所有同步函数丢进线程池也会耗尽线程和连接。并发上限仍由数据库与下游容量决定，需要背压。
