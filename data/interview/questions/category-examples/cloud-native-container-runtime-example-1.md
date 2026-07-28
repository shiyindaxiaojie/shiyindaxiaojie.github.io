---
id: cloud-native-container-runtime-example-1
title: "一个 Pod 从镜像到容器启动，容器运行时做了什么？"
slug: cloud-native-container-runtime-example-1
tracks:
  - cloud-native
category: container-runtime
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "容器运行时"
  - "OCI"
  - "namespace 隔离"
  - "cgroup"
summary: "围绕容器运行时的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一个 Pod 从镜像到容器启动，容器运行时做了什么？

::candidate level="core"::
kubelet 通过 CRI 请求运行时准备 sandbox、拉取并解包镜像、创建容器配置，再由底层 runtime 建立 namespace、cgroup、挂载和进程。网络通常由 CNI 接入，存储由 CSI 挂载；Pod 启动慢要先知道卡在哪一段。

::interviewer::
别停在原理上，容器运行时落到线上先看什么证据？

::candidate level="deep"::
查看 kubelet Events、runtime 日志、镜像拉取耗时、CNI/CSI 指标和容器创建阶段，避免把所有 Pending 都归因调度。

::interviewer::
容器运行时这套判断在哪个边界下会失效？

::candidate::
镜像层太多或大文件频繁变化会让缓存失效；cgroup 限制配置不当会导致 throttling 或 OOM。优化必须对应具体启动证据。
