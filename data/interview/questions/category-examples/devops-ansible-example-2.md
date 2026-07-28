---
id: devops-ansible-example-2
title: "批量变更中途失败后，Ansible 怎么安全重跑？"
slug: devops-ansible-example-2
tracks:
  - devops
category: ansible
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Ansible"
  - "幂等执行"
  - "批量变更"
  - "配置收敛"
summary: "围绕Ansible的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
批量变更中途失败后，Ansible 怎么安全重跑？

::candidate level="deep"::
先确认失败批次和已变更主机，再用 serial、limit 和明确的 health check 小批恢复。handler 是否已触发、配置文件是否原子替换、外部 API 是否可重复调用都要单独核对，不能只从失败任务下一行继续。

::interviewer::
如果现场现象和预期不一致，Ansible怎么继续缩小范围？

::candidate level="deep"::
用 check/diff、执行日志、主机事实和服务健康指标证明变更范围；批量操作前后还应抽样校验配置哈希。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
Ansible 对单机状态容易幂等，对跨主机事务并不天然原子。滚动变更要预留容量，并设计失败阈值和回滚 Playbook。
