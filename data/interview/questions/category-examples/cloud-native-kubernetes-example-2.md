---
id: cloud-native-kubernetes-example-2
title: "一次滚动发布为什么会出现短暂 502，怎么定位？"
slug: cloud-native-kubernetes-example-2
tracks:
  - cloud-native
category: kubernetes
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Kubernetes"
  - "健康探针"
  - "滚动发布"
  - "优雅终止"
summary: "围绕Kubernetes的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一次滚动发布为什么会出现短暂 502，怎么定位？

::candidate level="deep"::
按流量链路排：新 Pod 是否 readiness 过早、旧 Pod 摘除是否晚于进程退出、负载均衡端点是否及时同步、preStop 与 terminationGracePeriod 是否覆盖连接排空。502 常来自生命周期与流量收敛时间没对齐。

::interviewer::
如果现场现象和预期不一致，Kubernetes怎么继续缩小范围？

::candidate level="deep"::
查看 Deployment rollout、Endpoints/EndpointSlice 变化、Pod Events、探针耗时和网关 502 时间线，证据要落到具体 Pod 与版本。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
即使探针正确，长连接和客户端 DNS 缓存仍可能把流量送到退出中的实例。优雅终止要覆盖协议与代理的真实行为。
