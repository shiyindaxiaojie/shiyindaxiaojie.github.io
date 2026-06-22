---
title: Adding Tracing and Alert Notifications to CAT
date: 2023-03-03
description: CAT is Meituan's open-source real-time application monitoring platform, providing Transaction, Event, Problem, Business and other rich metrics.
tags:
  - Distributed Tracing
  - Observability
  - Meituan
  - Secondary Development
  - Middleware
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CAT.png
---

CAT is Meituan's open-source real-time application monitoring platform, providing `Transaction`, `Event`, `Problem`, `Business` and other rich metrics.

In official Issues, common questions include:

1. Can it support distributed tracing?
2. How to configure alerts?
3. Can it integrate DingTalk/Lark robot notifications?
4. Why is CAT deployment so complicated?

Based on these needs, I forked the official source for secondary development with Docker Hub images.

- Github: [Link](https://github.com/shiyindaxiaojie/cat)
- Docker Hub: [Link](https://hub.docker.com/repository/docker/shiyindaxiaojie/cat-home/tags)

# Modifications

- Added **distributed tracing** support - search by TraceId in logs to find entire request path including HTTP requests, RPC calls, Log4j2 logs, SQL statements and Cache execution times
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/tracing.png)

- Supports **email, DingTalk, WeChat, Lark** robot notifications - out-of-box, just configure Token in backend. Click `View Alert` to see exception stack, or `Alert Rules` to set thresholds
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/dingtalk.png)

- Supports **Jira Software** auto-ticketing - automatically creates Jira issues when production alerts trigger
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/auto-create-jira-issue.png)

- Optimized **Docker** deployment - just provide JVM parameters and MySQL config
  ```bash
  docker run -e MYSQL_URL="127.0.0.1" -e MYSQL_PORT="3306" -e MYSQL_SCHEMA="cat" -e MYSQL_USERNAME="user" -e MYSQL_PASSWD="pass" -p 8080:8080 --name=cat-home -d shiyindaxiaojie/cat-home
  ```

# Deployment Guide

## Environment Requirements

- JDK >= 7
- MySQL 5.7 (8.0 has known issues)
- Tomcat 8.0+
- Linux Kernel >= 2.6

## Docker Deployment

```bash
docker run -e MYSQL_URL="127.0.0.1" -e MYSQL_PORT="3306" -e MYSQL_SCHEMA="cat" -e MYSQL_USERNAME="user" -e MYSQL_PASSWD="pass" -e JVM_XMS="2G" -e JVM_XMX="2G" -p 8080:8080 --name=cat-home -d shiyindaxiaojie/cat-home
```

## Kubernetes Deployment

Recommend StatefulSet deployment. For production cluster with 3 nodes (1 monitoring + 2 consumer):

- Monitoring node: 10.1.1.1
- Consumer nodes: 10.1.1.2, 10.1.1.3

Set SERVER_URL to `10.1.1.1,10.1.1.2,10.1.1.3`.

# Application Integration

Use [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) framework for easy integration with automatic TraceId logging in log4j2:

Add CAT dependency:

```xml
<dependency>
    <groupId>io.github.shiyindaxiaojie</groupId>
    <artifactId>eden-cat-spring-boot-starter</artifactId>
</dependency>
```

Enable CAT config:

```yaml
cat:
  enabled: true
  trace-mode: true
  support-out-trace-id: false
  servers: localhost
  tcp-port: 2280
  http-port: 8080
```

# Alert Configuration

After secondary development, alert notifications work out-of-box. Supports: Email, DingTalk, Lark, WeChat, Jira Software.

Configure in console: `Configuration` > `System Config` > `Alert Channel`:

```xml
<sender-config>
  <sender id="mail" url="smtp.qq.com:25" type="post">
      <par id="username=sender@email.com"/>
      <par id="password=password"/>
  </sender>
  <sender id="dingtalk" url="https://oapi.dingtalk.com/robot/send?access_token=" type="post">
  </sender>
  <sender id="jira" url="http://localhost:8080" type="post">
      <par id="reporter_token=token"/>
  </sender>
</sender-config>
```

Configure alert strategy and receivers. When thresholds are reached, alerts are sent to configured receivers - email, Jira tickets, DingTalk notifications.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/mail.png)
