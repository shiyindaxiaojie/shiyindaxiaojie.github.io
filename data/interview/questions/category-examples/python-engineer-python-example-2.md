---
id: python-engineer-python-example-2
title: "Python 服务 CPU 飙高，怎么区分代码热点和依赖阻塞？"
slug: python-engineer-python-example-2
tracks:
  - python-engineer
category: python
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Python"
  - "GIL"
  - "并发模型"
  - "性能分析"
summary: "围绕Python的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Python 服务 CPU 飙高，怎么区分代码热点和依赖阻塞？

::candidate level="deep"::
先看进程 CPU、负载和事件循环延迟，再用 py-spy/cProfile 找栈与热点。依赖阻塞通常表现为 CPU 不满、连接池等待或线程卡在 I/O；若 CPU 满且样本集中在 Python 函数，才是计算热点。

::interviewer::
如果现场现象和预期不一致，Python怎么继续缩小范围？

::candidate level="deep"::
保留 py-spy 火焰图、线程/协程栈、事件循环延迟、连接池和 Trace，压测验证模型变化后的吞吐与尾延迟。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
多进程会增加内存和数据传输，asyncio 中一次阻塞调用会卡住整个事件循环。模型选择要跟任务性质和库支持匹配。
