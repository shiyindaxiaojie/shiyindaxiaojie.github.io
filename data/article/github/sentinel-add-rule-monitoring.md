---
title: Adding Rule Storage and Monitoring Playback to Sentinel
date: 2022-10-20
description: Sentinel is Alibaba's open-source traffic governance platform, providing flow control, circuit breaking, system load protection, and access control.
tags:
  - Rate Limiting
  - Observability
  - Alibaba
  - Secondary Development
  - Middleware
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Sentinel.png
---

Sentinel is Alibaba's open-source traffic governance platform, providing flow control, circuit breaking, system load protection, and access control.

In production, we encountered issues:

1. Sentinel console doesn't persist flow rules - requires custom extension
2. Sentinel console monitoring data only kept in memory - only last 5 minutes viewable

Based on these issues, I forked the official source for secondary development, with Docker Hub images for easy use.

- Github: [Link](https://github.com/shiyindaxiaojie/sentinel)
- Docker Hub: [Link](https://hub.docker.com/repository/docker/shiyindaxiaojie/sentinel-dashboard/tags)

# Modifications

- Added **flow rule persistence** support - adapts to `Apollo`, `Nacos`, `Zookeeper`

- Added **monitoring data persistence** - adapts to `InfluxDB`, `Kafka`, `Elasticsearch`, with time-based historical data playback
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/sentinel/sentinel-dashboard-overview-custom.png)

# Deployment Guide

## Application Configuration

Rule storage types: memory (default), nacos (recommended), apollo, zookeeper

```properties
sentinel.rule.type=nacos
sentinel.rule.nacos.server-addr=localhost:8848
sentinel.rule.nacos.namespace=demo
sentinel.rule.nacos.group-id=sentinel
```

Metrics storage types: memory (default), influxdb (recommended), elasticsearch, kafka

```properties
sentinel.metrics.type=influxdb
influx.url=http://localhost:8086/
influx.token=xxx
influx.org=sentinel
influx.bucket=sentinel
```

## FatJar Deployment

```bash
java -Dserver.port=8080 \
-Dsentinel.rule.nacos.server-addr=localhost:8848 \
-Dsentinel.metrics.type=influxdb \
-jar target/sentinel-dashboard.jar
```

## Docker Deployment

```bash
docker run -p 8090:8090 --name=sentinel-dashboard -d shiyindaxiaojie/sentinel-dashboard
```

## Kubernetes Deployment

Recommend StatefulSet deployment with ConfigMap for configuration.

# Application Integration

Use [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) framework for easy integration:

Add Sentinel dependency:

```xml
<dependency>
    <groupId>io.github.shiyindaxiaojie</groupId>
    <artifactId>eden-sentinel-spring-cloud-starter</artifactId>
</dependency>
```

Enable Sentinel config:

```yaml
spring:
  cloud:
    sentinel:
      enabled: true
      http-method-specify: true
      transport:
        dashboard: localhost:8090
      datasource:
        flow:
          nacos:
            server-addr: ${spring.cloud.nacos.config.server-addr}
            groupId: sentinel
            dataId: ${spring.application.name}-flow-rule
            rule-type: flow
```

Code is fully open source at [eden-sentinel-spring-cloud-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-cloud-starters/eden-sentinel-spring-cloud-starter).
