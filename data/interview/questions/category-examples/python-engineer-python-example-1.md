---
id: python-engineer-python-example-1
title: "Python 的 GIL 限制了什么，并发模型怎么选？"
slug: python-engineer-python-example-1
tracks:
  - python-engineer
category: python
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Python"
  - "GIL"
  - "并发模型"
  - "性能分析"
summary: "围绕Python的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Python 的 GIL 限制了什么，并发模型怎么选？

::candidate level="core"::
CPython 的 GIL 让一个进程内同一时刻只有一个线程执行 Python 字节码，I/O 等待时会释放，因此线程适合阻塞 I/O，不适合纯 Python CPU 密集。CPU 任务用多进程、原生扩展或任务队列，asyncio 适合大量可协作 I/O。

::interviewer::
别停在原理上，Python落到线上先看什么证据？

::candidate level="deep"::
保留 py-spy 火焰图、线程/协程栈、事件循环延迟、连接池和 Trace，压测验证模型变化后的吞吐与尾延迟。

::interviewer::
Python这套判断在哪个边界下会失效？

::candidate::
多进程会增加内存和数据传输，asyncio 中一次阻塞调用会卡住整个事件循环。模型选择要跟任务性质和库支持匹配。
