---
id: cloud-native-container-runtime-example-2
title: "镜像分层、namespace 和 cgroup 分别解决什么问题？"
slug: cloud-native-container-runtime-example-2
tracks:
  - cloud-native
category: container-runtime
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "容器运行时"
  - "OCI"
  - "namespace 隔离"
  - "cgroup"
summary: "围绕容器运行时的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
镜像分层、namespace 和 cgroup 分别解决什么问题？

::candidate level="deep"::
镜像分层复用不可变文件并支持写时复制；namespace 隔离进程看到的资源视图；cgroup 统计并限制 CPU、内存和 I/O。它们组合出容器边界，但共享内核意味着隔离并不等同虚拟机。

::interviewer::
如果现场现象和预期不一致，容器运行时怎么继续缩小范围？

::candidate level="deep"::
查看 kubelet Events、runtime 日志、镜像拉取耗时、CNI/CSI 指标和容器创建阶段，避免把所有 Pending 都归因调度。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
镜像层太多或大文件频繁变化会让缓存失效；cgroup 限制配置不当会导致 throttling 或 OOM。优化必须对应具体启动证据。
