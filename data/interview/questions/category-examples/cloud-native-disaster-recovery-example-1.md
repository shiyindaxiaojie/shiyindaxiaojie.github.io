---
id: cloud-native-disaster-recovery-example-1
title: "双地域部署不等于容灾，真正切换前还缺哪些条件？"
slug: cloud-native-disaster-recovery-example-1
tracks:
  - cloud-native
category: disaster-recovery
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "容灾恢复"
  - "RPO/RTO 指标"
  - "跨地域"
  - "切换演练"
summary: "围绕容灾恢复的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
双地域部署不等于容灾，真正切换前还缺哪些条件？

::candidate level="core"::
还要验证数据复制、密钥与配置同步、全局流量入口、目标地域容量、依赖可用性和操作权限。最关键的是定期在业务链路上做切换演练，否则备用地域可能只在架构图里存在。

::interviewer::
这个容灾恢复方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
每次演练记录故障发现、决策、流量收敛、数据追平和业务恢复时间，并核对关键交易的一致性与补偿日志。

::interviewer::
容灾恢复发生部分失败时，系统怎样收敛？

::candidate::
控制面、身份系统或 DNS 可能成为跨地域共享单点。容灾设计要逐项检查依赖是否真的隔离，而不是只复制业务 Pod。
