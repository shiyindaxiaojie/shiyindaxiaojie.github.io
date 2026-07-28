---
id: devops-linux-example-1
title: "Linux load 很高但 CPU 不高，第一步看什么？"
slug: devops-linux-example-1
tracks:
  - devops
category: linux
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Linux"
  - "Load Average"
  - "磁盘 I/O"
  - "D 状态"
summary: "围绕Linux的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Linux load 很高但 CPU 不高，第一步看什么？

::candidate level="core"::
Load Average 统计的不只是正在占 CPU 的任务，还包括不可中断睡眠的任务。CPU 不高时，先用 vmstat 看 runnable、blocked 和 iowait，再用 ps 或 pidstat 找 D 状态进程；如果 blocked 持续升高，方向通常在磁盘、网络存储或内核等待。

::interviewer::
别停在原理上，Linux落到线上先看什么证据？

::candidate level="deep"::
证据至少包含 vmstat 1、iostat -x、pidstat -d 和问题时段的应用延迟；把进程 I/O 峰值与请求 Trace 时间线对齐。

::interviewer::
Linux这套判断在哪个边界下会失效？

::candidate::
容器里的 load 和宿主机资源可能不是同一个视角，还要核对 cgroup 限额、宿主机邻居噪声和云盘突发额度，避免在容器内误判。
