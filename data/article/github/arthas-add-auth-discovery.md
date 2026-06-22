---
title: Adding Auth Control and Service Discovery to Arthas
date: 2022-09-09
description: Arthas is Alibaba's open-source online diagnostic tool, providing Dashboard overview, Thread analysis, Stack viewing, Watch performance monitoring and...
tags:
  - Online Diagnostics
  - Observability
  - Alibaba
  - Secondary Development
  - Middleware
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Arthas.png
---

Arthas is Alibaba's open-source online diagnostic tool, providing `Dashboard` overview, `Thread` analysis, `Stack` viewing, `Watch` performance monitoring and more.

In production, we encountered issues:

1. Arthas console has no access control - security risk if IP exposed
2. Arthas console requires knowing AgentId beforehand - not suitable for K8s scaling

Based on these issues, I forked the official source for secondary development, with Docker Hub images for easy use.

- Github: [Link](https://github.com/shiyindaxiaojie/arthas)
- Docker Hub: [Link](https://hub.docker.com/repository/docker/shiyindaxiaojie/arthas-tunnel-server/tags)

# Modifications

- Added **service discovery** support - auto-retrieves connected application IP/ports, no manual AgentId input needed
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/arthas/arthas-dashboard-overview.png)

- Added **access control** mechanism - authorized users login with username/password, can only operate on authorized applications
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/arthas/arthas-dashboard-login.png)

# Deployment Guide

## FatJar Deployment

```bash
mvn clean package
java -Dserver.port=8080 -jar target/arthas-tunnel-server.jar
```

## Docker Deployment

```bash
docker run -p 8080:8080 --name=arthas-tunnel-server -d shiyindaxiaojie/arthas-tunnel-server
```

## Kubernetes Deployment

Recommend StatefulSet deployment. ConfigMap for account and permission configuration:

```yaml
apiVersion: v1
kind: ConfigMap
data:
  application.properties: |
    spring.security.jwt.secret=base64code
    spring.security.users[0].name=admin
    spring.security.users[0].password=123456
    spring.security.users[0].roles=ADMIN
    spring.security.users[1].name=user
    spring.security.users[1].roles=eden-*
```

# Application Integration

For easy client integration, use [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) framework - just two steps:

Add Arthas dependency:

```xml
<dependency>
    <groupId>io.github.shiyindaxiaojie</groupId>
    <artifactId>eden-arthas-spring-boot-starter</artifactId>
</dependency>
```

Enable Arthas config:

```yaml
spring:
  arthas:
    enabled: true # Supports zero-downtime enable/disable

arthas:
  agent-id: ${spring.application.name}@${random.value}
  tunnel-server: ws://localhost:7777/ws
```

Code is fully open source at [eden-arthas-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-arthas-spring-boot-starter).
