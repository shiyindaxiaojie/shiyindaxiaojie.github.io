---
id: devops-kubernetes-example-2
title: "Pod 一直重启，怎么判断是应用崩溃、探针误杀还是资源限制？"
slug: devops-kubernetes-example-2
tracks:
  - devops
category: kubernetes
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Kubernetes"
  - "健康探针"
  - "Pod 重启"
  - "OOMKilled 排查"
summary: "围绕Kubernetes的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Pod 一直重启，怎么判断是应用崩溃、探针误杀还是资源限制？

::candidate level="deep"::
先看容器上次退出原因和 exit code，再看 Events、探针失败记录和资源指标。OOMKilled 指向内存限制，exit 137 还要结合 kubelet 与内核日志；探针失败但进程日志正常，则检查超时、initial delay、CPU throttling 和探针端点本身。

::interviewer::
如果现场现象和预期不一致，Kubernetes怎么继续缩小范围？

::candidate level="deep"::
证据链是 kubectl describe → previous logs → Events → cgroup/容器资源指标 → 探针端点耗时，必要时再看节点 kubelet 日志。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
调大探针超时只能遮住症状。若启动或健康检查依赖远端数据库，故障域被错误耦合，配置再宽也会在大面积抖动时失效。
