---
id: cloud-native-cost-optimization-example-1
title: "Kubernetes 成本上涨，怎么区分业务增长和资源浪费？"
slug: cloud-native-cost-optimization-example-1
tracks:
  - cloud-native
category: cost-optimization
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "成本优化"
  - "资源利用率"
  - "单位成本"
  - "弹性伸缩"
summary: "围绕成本优化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Kubernetes 成本上涨，怎么区分业务增长和资源浪费？

::candidate level="core"::
先按命名空间、工作负载和租户分摊成本，再把 CPU、内存、存储和网络用量与业务量归一化。总账上涨但每万请求成本下降可能是健康增长；长期 requests 利用率低、空闲节点多或跨区流量异常才是浪费线索。

::interviewer::
这个成本优化方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
用单位业务成本、requests 与实际用量分位数、节点装箱率、弹性事件和 SLO 对照验证，不能只看月账单。

::interviewer::
成本优化发生部分失败时，系统怎样收敛？

::candidate::
过度压缩余量会牺牲故障冗余和扩容反应时间。降本方案必须在单可用区故障和流量突增下重新做容量演练。
