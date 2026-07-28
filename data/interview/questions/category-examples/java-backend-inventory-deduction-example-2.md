---
id: java-backend-inventory-deduction-example-2
title: "一笔订单包含多个 SKU，部分预占失败怎么处理？"
slug: java-backend-inventory-deduction-example-2
tracks:
  - java-backend
category: inventory-deduction
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "库存扣减"
  - "库存预占"
  - "防超卖"
  - "补偿事务"
summary: "围绕库存扣减的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一笔订单包含多个 SKU，部分预占失败怎么处理？

::candidate level="deep"::
为整笔请求生成幂等 ID，各 SKU 预占记录可追踪。业务要求全有或全无时，任一失败就补偿已成功项；允许拆单时则创建部分成功结果。补偿需要幂等，且不能释放已经转为实扣的库存。

::interviewer::
如果现场验证这项库存扣减判断，先看哪些指标或日志？

::candidate level="deep"::
核对可售、预占、实扣和释放流水的守恒关系，监控负库存、过期预占、补偿失败与热点 SKU 冲突。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
严格串行能防超卖但吞吐很低，纯缓存吞吐高却恢复复杂。方案要由库存价值、峰值和可接受售罄误差决定。
