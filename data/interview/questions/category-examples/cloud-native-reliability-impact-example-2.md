---
id: cloud-native-reliability-impact-example-2
title: "稳定性指标变好，怎么排除只是流量变化造成的？"
slug: cloud-native-reliability-impact-example-2
tracks:
  - cloud-native
category: reliability-impact
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "稳定性结果"
  - "错误预算"
  - "对照验证"
  - "恢复时间"
summary: "围绕稳定性结果的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
稳定性指标变好，怎么排除只是流量变化造成的？

::candidate level="deep"::
选择相同业务周期和流量区间做前后对比，按版本、租户或集群切片；如果有灰度组，可以用新旧路径同时期对照。仅拿改造前一个大促与改造后淡季相比，结论没有说服力。

::interviewer::
如果继续追数字，稳定性结果要拿出哪组证据？

::candidate level="deep"::
证据应包含 SLI 基线、事故记录、变更时间和对照组；同时检查告警口径是否改变，避免靠少报事故让数字变好看。

::interviewer::
稳定性结果最容易被忽略的边界是什么？

::candidate::
可靠性提升可能以资源成本或交付速度为代价。要把冗余、保护策略和人工维护成本一起说明，不能只展示单一指标。
