---
id: java-backend-logistics-example-2
title: "物流轨迹乱序和重复上报，用户侧状态怎样保持可信？"
slug: java-backend-logistics-example-2
tracks:
  - java-backend
category: logistics
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "履约物流"
  - "包裹模型"
  - "轨迹乱序"
  - "状态机"
summary: "围绕履约物流的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
物流轨迹乱序和重复上报，用户侧状态怎样保持可信？

::candidate level="deep"::
每条轨迹保留承运商事件时间、接收时间和唯一标识，先去重再按业务规则推进。迟到事件可以补全历史但不能把已签收状态倒退；异常跳变进入校验或人工处理。

::interviewer::
这项履约物流设计怎么证明不是纸上方案？

::candidate level="deep"::
按订单到包裹再到运单串联状态变更日志，统计长时间停滞、非法转换和承运商时间偏差，并保留原始报文。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
不同承运商状态码无法一一映射。内部模型要保留“未知/异常”并可追溯原始状态，不能为了前端展示强行猜测。
