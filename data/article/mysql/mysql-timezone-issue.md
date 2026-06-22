---
title: MySQL 5-Hour Timezone Discrepancy Troubleshooting
date: 2023-01-10
description: Business department reported that after APP upgrade, login time showed 2023-01-10 03:47 when actual time was 2023-01-09 22:47 - a 5-hour difference.
tags:
  - MySQL
  - Timezone
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/logo/MySQL.png
---

# Problem Description

Business department reported that after APP upgrade, login time showed `2023-01-10 03:47` when actual time was `2023-01-09 22:47` - a 5-hour difference.

1. **Round 1**: Suspected newly deployed code had date formatting or JSON serialization timezone issues. Git diff showed no related changes.
2. **Round 2**: Maybe production config was modified! Ruled out config center changes, verified K8s Deployment had `TZ=Asia/Shanghai` - still no luck.
3. **Round 3**: Extracted production jar and found MySQL driver upgraded from 5.1.45 to 8.0.22.

# Root Cause Analysis

Production database configured with `time_zone=SYSTEM` (corresponding to `system_time_zone=CST`). CST timezone has no standard - Java client defaults to parsing CST as timezone+3, causing the 5-hour discrepancy.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/show-variables.png)

Application jdbc-url didn't explicitly set timezone. For MySQL driver versions 8.0.11 to 8.0.22, jdbc-url must explicitly set timezone. From version 8.0.23, [official fix no longer requires explicit timezone setting](https://dev.mysql.com/doc/relnotes/connector-j/8.0/en/news-8-0-23.html).

Comparing 8.0.22 and 8.0.23 changes shows that 8.0.22's code to get MySQL server timezone was removed - now defaults to client system variables like `TZ=Asia/Shanghai` set in K8s.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/mysql/mysql_v8.0.22_upgrade_v8.0.23.png)

Why didn't 5.1.45 have this issue? Source code shows 5.1.x bypasses timezone setting if not explicitly configured.

Since upgrading to 8.0.23 was risky, we added `serverTimezone=GMT%2B8` to jdbc-url - problem solved.

# Post-Incident Review

To avoid MySQL driver compatibility issues, K8s should default to `TZ=Asia/Shanghai`, and applications connecting to MySQL should explicitly set `serverTimezone=GMT%2B8`.
