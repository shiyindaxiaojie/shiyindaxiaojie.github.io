---
id: cloud-native-production-scale-example-2
title: "集群规模扩大后，控制面和业务面分别先暴露什么问题？"
slug: cloud-native-production-scale-example-2
tracks:
  - cloud-native
category: production-scale
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "生产规模"
  - "控制面"
  - "调度延迟"
  - "故障域"
summary: "围绕生产规模的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
集群规模扩大后，控制面和业务面分别先暴露什么问题？

::candidate level="deep"::
控制面看 API 请求、etcd 延迟、调度队列和控制器 workqueue；业务面看 IP、镜像拉取、DNS、存储和节点资源碎片。两边要分开容量建模，否则应用抖动容易被误判为控制面故障。

::interviewer::
如果继续追数字，生产规模要拿出哪组证据？

::candidate level="deep"::
用 API Server/etcd 指标、调度时延、Pod 启动分位数和节点饱和度证明规模瓶颈，并与版本或扩容时间线对齐。

::interviewer::
生产规模最容易被忽略的边界是什么？

::candidate::
单个超大集群节省管理成本，却扩大故障域和升级风险。拆集群也会增加治理复杂度，边界应由租户、地域和故障隔离需求决定。
