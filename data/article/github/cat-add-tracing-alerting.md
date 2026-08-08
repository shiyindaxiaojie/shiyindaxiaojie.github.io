---
title: Adding Distributed Tracing and Alert Notifications to CAT
date: 2023-03-03
description: CAT is Meituan-Dianping's open-source real-time application monitoring platform, with metrics such as Transaction, Event, Problem, and Business.
tags:
  - Distributed Tracing
  - Observability
  - Meituan
  - Secondary Development
  - Middleware
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CAT.png
---

CAT is Meituan-Dianping's open-source real-time application monitoring platform, with metrics such as `Transaction`, `Event`, `Problem`, and `Business`.

The same questions often come up in the official issue tracker:

1. Can it support distributed tracing?
2. How to configure alerts?
3. Can it integrate DingTalk/Lark robot notifications?
4. Why is CAT deployment so complicated?

To address them, I forked the official source, added the missing capabilities, and published ready-to-use images on Docker Hub.

- GitHub: [Link](https://github.com/shiyindaxiaojie/cat)
- Docker Hub: [Link](https://hub.docker.com/repository/docker/shiyindaxiaojie/cat-home/tags)

# Modifications

- Added **distributed tracing**. Use the TraceId from application logs to inspect the HTTP requests, RPC calls, Log4j2 entries, SQL statements, and cache timings for an entire request.
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/tracing.png)

- Added **email, DingTalk, WeChat, and Lark** notifications. No additional alert endpoint is required; configure the corresponding token in the console. Use `View Alert` to inspect the exception stack and `Alert Rules` to tune thresholds and reduce duplicate notifications.
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/dingtalk.png)

- Added automatic **Jira Software** ticket creation when a production alert is triggered.
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/auto-create-jira-issue.png)

- Simplified **Docker** deployment. Provide the JVM parameters and MySQL settings without mounting separate `datasource.xml` or `client.xml` files.
  ```bash
  docker run -e MYSQL_URL="127.0.0.1" -e MYSQL_PORT="3306" -e MYSQL_SCHEMA="cat" -e MYSQL_USERNAME="user" -e MYSQL_PASSWD="pass" -p 8080:8080 --name=cat-home -d shiyindaxiaojie/cat-home
  ```

# Deployment Guide

## Environment Requirements

- JDK >= 7
- MySQL 5.7
- Tomcat 8.0+
- Linux Kernel >= 2.6

## Docker Deployment

The image is available from [Docker Hub](https://hub.docker.com/repository/docker/shiyindaxiaojie/cat-home/tags). Supply the JVM and MySQL settings when starting the container:

```bash
docker run -e MYSQL_URL="127.0.0.1" -e MYSQL_PORT="3306" -e MYSQL_SCHEMA="cat" -e MYSQL_USERNAME="user" -e MYSQL_PASSWD="pass" -e JVM_XMS="2G" -e JVM_XMX="2G" -p 8080:8080 --name=cat-home -d shiyindaxiaojie/cat-home
```

## Kubernetes Deployment

A StatefulSet is recommended. The current image accepts `XMS` and `XMX`; it also supports G1 GC, GC logging, and heap dumps through environment variables such as `GC_MODE`, `USE_GC_LOG`, and `USE_HEAP_DUMP`. Use `shiyindaxiaojie/cat-home:latest` unless you need to pin a specific release.

For a three-node production cluster, assign one monitoring node and two consumer nodes:

- Monitoring node: 10.1.1.1
- Consumer nodes: 10.1.1.2, 10.1.1.3

Set `SERVER_URL` to `10.1.1.1,10.1.1.2,10.1.1.3`. The monitoring node displays console data and sends alerts, while the consumer nodes process client data according to the weights in the client routing configuration.

# Application Integration

The [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) framework reduces the client integration work and automatically writes the TraceId to Log4j2 logs. CAT can be integrated in two steps.

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
  enabled: false # Disabled by default; enable it when needed
  trace-mode: true # Enable request tracing
  support-out-trace-id: false # Propagate the trace ID across heterogeneous subsystems
  home: /tmp
  servers: localhost # CAT server address
  tcp-port: 2280
  http-port: 8080

# Add these filters when using Dubbo so that CAT instrumentation works correctly
dubbo:
  provider:
    filter: cat-tracing
  consumer:
    filter: cat-tracing,cat-consumer
```

# Alert Configuration

The customized CAT build includes alert notifications. After updating the configuration, alerts can be delivered through email, DingTalk, Lark, WeChat, or Jira Software.

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

Configure the alert policy and receivers next. When a threshold is reached, CAT sends email and DingTalk notifications to the configured recipients and can create a Jira Software incident automatically.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/mail.png)
