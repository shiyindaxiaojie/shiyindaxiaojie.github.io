---
id: java-backend-impact-metrics-example-2
title: "接口延迟下降了，怎么证明不是流量或缓存命中变化造成的？"
slug: java-backend-impact-metrics-example-2
tracks:
  - java-backend
category: impact-metrics
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "结果指标"
  - "性能基线"
  - "对照验证"
  - "端到端收益"
summary: "围绕结果指标的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
接口延迟下降了，怎么证明不是流量或缓存命中变化造成的？

::candidate level="deep"::
使用相同流量区间、数据规模和版本切片做对比，最好有灰度组或压测复现。延迟变好时同时检查 QPS、缓存命中率、错误率和资源水位，避免把少处理请求当成优化成果。

::interviewer::
如果继续追数字，结果指标要拿出哪组证据？

::candidate level="deep"::
监控曲线要与发布记录、压测报告和业务量对齐；对照组、置信区间或至少相同峰值窗口都比单张截图更有证据力。

::interviewer::
结果指标最容易被忽略的边界是什么？

::candidate::
局部指标改善可能把成本转移到队列、数据库或人工补偿。结果要覆盖端到端链路和一段稳定观察期。
