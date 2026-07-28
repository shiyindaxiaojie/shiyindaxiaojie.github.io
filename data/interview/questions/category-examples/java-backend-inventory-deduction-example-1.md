---
id: java-backend-inventory-deduction-example-1
title: "库存扣减怎样同时防超卖和少卖？"
slug: java-backend-inventory-deduction-example-1
tracks:
  - java-backend
category: inventory-deduction
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "库存扣减"
  - "库存预占"
  - "防超卖"
  - "补偿事务"
summary: "围绕库存扣减的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
库存扣减怎样同时防超卖和少卖？

::candidate level="core"::
数据库扣减用带剩余量条件的原子 UPDATE 或版本控制，缓存预扣用于高并发削峰，但必须有持久流水和对账。超卖靠原子条件避免，少卖则靠超时释放、失败补偿和过期预占清理。

::interviewer::
这个库存扣减方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
核对可售、预占、实扣和释放流水的守恒关系，监控负库存、过期预占、补偿失败与热点 SKU 冲突。

::interviewer::
库存扣减发生部分失败时，系统怎样收敛？

::candidate::
严格串行能防超卖但吞吐很低，纯缓存吞吐高却恢复复杂。方案要由库存价值、峰值和可接受售罄误差决定。
