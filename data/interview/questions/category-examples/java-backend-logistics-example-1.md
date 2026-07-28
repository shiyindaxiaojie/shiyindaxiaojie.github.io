---
id: java-backend-logistics-example-1
title: "订单拆包、部分发货后，履约状态机怎么设计？"
slug: java-backend-logistics-example-1
tracks:
  - java-backend
category: logistics
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "履约物流"
  - "包裹模型"
  - "轨迹乱序"
  - "状态机"
summary: "围绕履约物流的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
订单拆包、部分发货后，履约状态机怎么设计？

::candidate level="core"::
订单、履约单、包裹和运单要分层建模，订单状态由下层聚合而不是一个字段硬扛所有分支。部分发货、拒收、补发和取消都有明确转换条件，已交运的包裹不能被简单回退到待发货。

::interviewer::
这条履约物流链路上线后，用什么证据验证设计？

::candidate level="deep"::
按订单到包裹再到运单串联状态变更日志，统计长时间停滞、非法转换和承运商时间偏差，并保留原始报文。

::interviewer::
履约物流里最容易漏掉的失败分支是什么？

::candidate::
不同承运商状态码无法一一映射。内部模型要保留“未知/异常”并可追溯原始状态，不能为了前端展示强行猜测。
