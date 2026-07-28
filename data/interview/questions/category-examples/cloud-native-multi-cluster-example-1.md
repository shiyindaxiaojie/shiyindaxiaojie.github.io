---
id: cloud-native-multi-cluster-example-1
title: "多集群到底按地域、租户还是故障域拆，怎么选？"
slug: cloud-native-multi-cluster-example-1
tracks:
  - cloud-native
category: multi-cluster
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "多集群治理"
  - "故障域"
  - "流量切换"
  - "RPO/RTO 指标"
summary: "围绕多集群治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
多集群到底按地域、租户还是故障域拆，怎么选？

::candidate level="core"::
先明确拆分动机。合规和时延通常按地域，强隔离按租户或业务等级，升级与容量风险按故障域；不要为了“多集群”而拆，否则配置、身份和发布复杂度会先翻倍。

::interviewer::
这个多集群治理方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
演练要记录健康探测、DNS/全局负载均衡收敛时间、目标集群水位、数据复制延迟和业务 SLI。

::interviewer::
多集群治理发生部分失败时，系统怎样收敛？

::candidate::
把集群当成完全可替换单元的前提是配置、密钥、镜像和数据依赖都已复制。任何隐含的单集群资源都会让切换方案失效。
