---
id: devops-linux-example-2
title: "磁盘 I/O 抖动导致接口变慢，怎么找到具体进程和请求？"
slug: devops-linux-example-2
tracks:
  - devops
category: linux
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Linux"
  - "Load Average"
  - "磁盘 I/O"
  - "D 状态"
summary: "围绕Linux的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
磁盘 I/O 抖动导致接口变慢，怎么找到具体进程和请求？

::candidate level="deep"::
排查链路可以压成：iostat 看设备延迟与队列 → pidstat -d 找读写进程 → lsof 或进程日志定位文件 → Trace 对齐慢请求。只看磁盘利用率不够，await、队列深度和单次 I/O 大小更能解释接口为什么抖。

::interviewer::
如果现场现象和预期不一致，Linux怎么继续缩小范围？

::candidate level="deep"::
证据至少包含 vmstat 1、iostat -x、pidstat -d 和问题时段的应用延迟；把进程 I/O 峰值与请求 Trace 时间线对齐。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
容器里的 load 和宿主机资源可能不是同一个视角，还要核对 cgroup 限额、宿主机邻居噪声和云盘突发额度，避免在容器内误判。
