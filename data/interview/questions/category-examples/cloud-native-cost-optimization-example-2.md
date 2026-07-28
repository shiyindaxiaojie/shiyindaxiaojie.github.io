---
id: cloud-native-cost-optimization-example-2
title: "降本时先调 requests、做弹性，还是换实例规格？"
slug: cloud-native-cost-optimization-example-2
tracks:
  - cloud-native
category: cost-optimization
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "成本优化"
  - "资源利用率"
  - "单位成本"
  - "弹性伸缩"
summary: "围绕成本优化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
降本时先调 requests、做弹性，还是换实例规格？

::candidate level="deep"::
先修明显错误的 requests/limits，让调度数据可信；再用 HPA/VPA 或定时弹性适配波动；最后根据稳定负载选择实例与预留资源。顺序反过来，可能只是把过量申请搬到更便宜的机器。

::interviewer::
如果现场验证这项成本优化判断，先看哪些指标或日志？

::candidate level="deep"::
用单位业务成本、requests 与实际用量分位数、节点装箱率、弹性事件和 SLO 对照验证，不能只看月账单。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
过度压缩余量会牺牲故障冗余和扩容反应时间。降本方案必须在单可用区故障和流量突增下重新做容量演练。
