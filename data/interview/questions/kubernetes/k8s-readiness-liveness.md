---
id: k8s-readiness-liveness
title: Kubernetes 的 readiness 和 liveness probe 有什么本质区别？
slug: k8s-readiness-liveness
tracks:
  - cloud-native
  - devops
category: kubernetes
stage: technical
difficulty: intermediate
questionType: troubleshooting
frequency: high
tags:
  - kubernetes
  - probe
  - stability
summary: 重点在于业务流量接入和容器重启的边界，不是只背两个定义。
estimatedRead: 5
related:
  - cicd-blue-green-rollout
---

::interviewer::
readiness probe 和 liveness probe 的区别是什么？

::candidate level="core"::
`readiness` 决定 Pod 能不能接流量，`liveness` 决定容器是不是该被 kubelet 重启。

::interviewer::
为什么这两个探针经常被配坏？

::candidate::
因为很多人把“启动慢”“临时依赖抖动”“业务线程池打满”都粗暴当成 liveness 失败。  
结果本来只是短暂不可服务，却被反复重启，形成雪崩。

::candidate level="deep"::
工程上我会把启动阶段、预热阶段、稳态阶段拆开看。  
启动慢的服务优先用 `startupProbe` 兜底；  
readiness 只判断能否安全接流量；  
liveness 只处理“进程已经卡死、自恢复无望”的情况。

::note::
能讲出“错误 probe 会把服务自己打挂”，通常比背定义更有说服力。
