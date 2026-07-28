---
id: cloud-native-multi-cluster-example-2
title: "一个集群失联后，流量和工作负载怎样安全迁移？"
slug: cloud-native-multi-cluster-example-2
tracks:
  - cloud-native
category: multi-cluster
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "多集群治理"
  - "故障域"
  - "流量切换"
  - "RPO/RTO 指标"
summary: "围绕多集群治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一个集群失联后，流量和工作负载怎样安全迁移？

::candidate level="deep"::
控制面失联不等于业务立刻不可用。先由全局流量层摘除不健康入口，再检查目标集群容量、数据依赖和版本兼容，最后按批次恢复工作负载。无状态服务可快切，有状态服务必须受 RPO/RTO 约束。

::interviewer::
如果现场验证这项多集群治理判断，先看哪些指标或日志？

::candidate level="deep"::
演练要记录健康探测、DNS/全局负载均衡收敛时间、目标集群水位、数据复制延迟和业务 SLI。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
把集群当成完全可替换单元的前提是配置、密钥、镜像和数据依赖都已复制。任何隐含的单集群资源都会让切换方案失效。
