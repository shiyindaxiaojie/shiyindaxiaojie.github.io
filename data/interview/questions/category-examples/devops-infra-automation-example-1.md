---
id: devops-infra-automation-example-1
title: "基础设施自动化怎样避免“脚本跑完了，环境还是不一致”？"
slug: devops-infra-automation-example-1
tracks:
  - devops
category: infra-automation
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "基础设施自动化"
  - "状态收敛"
  - "权限边界"
  - "爆炸半径"
summary: "围绕基础设施自动化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
基础设施自动化怎样避免“脚本跑完了，环境还是不一致”？

::candidate level="core"::
执行成功只说明命令没有报错，目标状态还要靠声明式配置、收敛检查和持续漂移检测确认。资源创建、配置下发和服务验收要分层，每层都输出可查询的期望值与实际值。

::interviewer::
这条基础设施自动化链路上线后，用什么证据验证设计？

::candidate level="deep"::
对比期望清单、实际资源、配置哈希和健康检查，执行日志只是一份证据；定期漂移报告能发现绕过平台的人工修改。

::interviewer::
基础设施自动化里最容易漏掉的失败分支是什么？

::candidate::
不是所有资源都能自动回滚，例如数据删除和网络切换。对不可逆动作要改成分阶段确认，并预先准备恢复路径。
