---
title: MySQL 时区相差 5 小时问题排查
date: 2023-01-10
description: 最近经业务部门反馈，我们有个 APP 升级后，在 2023-01-09 22:47 发现，当前账号的最近登录时间为 2023-01-10 03:47，相差了 5 个小时。
tags:
  - MySQL
  - 时区
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/logo/MySQL.png
---

# 问题描述

最近经业务部门反馈，我们有个 APP 升级后，在 `2023-01-09 22:47` 发现，当前账号的最近登录时间为 `2023-01-10 03:47`，相差了 5 个小时。

1. 第一轮排查：我们第一印象会认为是刚升级的代码出了问题，有可能是日期格式化没处理好，也有可能是 JSON 序列化没有指定时区，经过 Git diff 排查，我们并没有修改相关代码。
2. 第二轮排查：可能是有人动了生产配置！排除了配置中心的改动，也检查了 K8s 的 Deployment 是否正确设置了 TZ=Asia/Shanghai，依然无果。
3. 第三轮排查：提取线上部署的 jar，经过对比，我们发现 MySQL 驱动从原来的 5.1.45 升级到了 8.0.22 版本。

# 原因分析

生产数据库的配置是 `time_zone=SYSTEM`（对应 `system_time_zone=CST`，CST 时区没有标准，我们在使用 Java 客户端连接默认会把 CST 解析为时区+3，也就是当时事故出现的 5 小时误差）。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/show-variables.png)

应用配置连接数据库的 jdbc-url 没有显示设置时区。MySQL驱动如果升级版本到 8.0.11 和 8.0.22 区间，jdbc-url 必须显式设置时区。从 8.0.23 版本开始，[官网修复了这个问题，不再需要显示设置时区。](https://dev.mysql.com/doc/relnotes/connector-j/8.0/en/news-8-0-23.html)

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/mysql-bug_v8.0.22.png)

---

从下面对比 8.0.22 和 8.0.23 版本的变化，可以看到官网把 8.0.22 版本获取 MySQL 服务端的代码移除了，默认获取客户端自身的系统变量，例如，在 K8s 环境设置的 `TZ=Asia/Shanghai`变量。
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/mysql_v8.0.22_upgrade_v8.0.23.png)

为什么 5.1.45 版本没有这个问题呢？从源码可以看出，5.1.x 版本，不显示设置时区，代码逻辑会直接绕过设置。
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/mysql_v5.1.44_vs_v8.0.22.png)

在我们拿到 PreparedStatement 设置插入的字段会自动使用我们程序所在的系统时区。
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/mysql-auto-set-timezone.png)

因升级 MySQL 驱动到 8.0.23 的风险比较大，我们决定在 jdbc-url 参数加上 `serverTimezone=GMT%2B8`，问题解决。

# 故障复盘

为避免 MySQL 驱动版本的兼容性问题，K8s 默认设置 `TZ=Asia/Shanghai`，应用层接入 MySQL 最好显示设置 `serverTimezone=GMT%2B8`。