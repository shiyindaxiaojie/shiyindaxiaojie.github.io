---
id: devops-infra-automation-example-2
title: "自动化平台拿到生产权限后，怎么限制一次误操作的爆炸半径？"
slug: devops-infra-automation-example-2
tracks:
  - devops
category: infra-automation
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "基础设施自动化"
  - "状态收敛"
  - "权限边界"
  - "爆炸半径"
summary: "围绕基础设施自动化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
自动化平台拿到生产权限后，怎么限制一次误操作的爆炸半径？

::candidate level="deep"::
权限按资源、环境和动作拆分，危险操作需要审批与短期凭证；执行面再加批次、并发、地域和失败阈值。平台必须支持预览、暂停、回滚和完整审计，不能让一个参数直接覆盖全网。

::interviewer::
这项基础设施自动化设计怎么证明不是纸上方案？

::candidate level="deep"::
对比期望清单、实际资源、配置哈希和健康检查，执行日志只是一份证据；定期漂移报告能发现绕过平台的人工修改。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
不是所有资源都能自动回滚，例如数据删除和网络切换。对不可逆动作要改成分阶段确认，并预先准备恢复路径。
