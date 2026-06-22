---
title: 基于 Arthas 新增权限控制和服务发现
date: 2022-09-09
description: Arthas 是阿里巴巴开源的在线诊断工具，提供了 Dashboard 负载总览、Thread 线程占用、Stack 堆栈查看、Watch 性能观测等功能。
tags:
  - 在线诊断
  - 可观测性
  - 阿里巴巴
  - 二次开发
  - 中间件
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Arthas.png
---

Arthas 是阿里巴巴开源的在线诊断工具，提供了 `Dashboard` 负载总览、`Thread` 线程占用、`Stack` 堆栈查看、`Watch` 性能观测等功能。

在实际的生产应用中，我们遇到以下几个问题：
1. Arthas 控制台没有权限控制，一旦访问 IP 暴露，就有安全问题。
2. Arthas 控制台需要提前知道 AgentId 才能访问，不适合 K8s 扩容管理。

基于上面的问题，笔者 fork 了官方最新的源码进行二次开发，并打包镜像到 Docker Hub，方便大家使用。

* Github 地址：[传送门](https://github.com/shiyindaxiaojie/arthas)
* Docker Hub 地址：[传送门](https://hub.docker.com/repository/docker/shiyindaxiaojie/arthas-tunnel-server/tags)

# 改造内容

* 新增**服务发现**支持，自动获取接入的应用列表 IP 和端口，无须手动输入 AgentId。
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/arthas/arthas-dashboard-overview.png)

* 新增**权限控制**机制，授权用户输入用户密码登录后，在控制台只能操作已授权的应用。
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/arthas/arthas-dashboard-login.png)

# 部署教程

## FatJar 部署

执行 `mvn clean package` 打包成一个 fat jar，参考如下命令启动编译后的控制台。

```bash
java -Dserver.port=8080 -jar target/arthas-tunnel-server.jar
```

## Docker 部署

本项目已发布稳定的镜像到 [Docker Hub](https://hub.docker.com/repository/docker/shiyindaxiaojie/arthas/tags)，您可以直接使用如下命令，完成部署。

```bash
docker run -p 8080:8080 --name=arthas-tunnel-server -d shiyindaxiaojie/arthas-tunnel-server
```

## Kubernetes 部署

建议使用 StatefulSet 部署，YAML 示例如下：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: arthas-tunnel-server
  namespace: monitoring
spec:
  podManagementPolicy: OrderedReady
  replicas: 1
  serviceName: ""
  template:
    spec:
      affinity: {}
      containers:
      - env:
        - name: TZ
          value: Asia/Shanghai
        image: shiyindaxiaojie/arthas-tunnel-server:v3.6.7
        imagePullPolicy: IfNotPresent
        name: cat-home
        resources:
          limits:
            cpu: 250m
            memory: 512Mi
          requests:
            cpu: 250m
            memory: 512Mi
        volumeMounts:
        - mountPath: /app/application.properties
          name: application
          readOnly: true
          subPath: application.properties
      volumes:
      - configMap:
          defaultMode: 420
          items:
          - key: application.properties
            mode: 420
            path: application.properties
          name: arthas-tunnel-server
        name: application
```

对应的 ConfigMap 如下，用于配置账号和权限。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: arthas-tunnel-server
  namespace: monitoring
data:
  application.properties: |
    arthas.server.host=0.0.0.0
    arthas.server.port=7777
    arthas.enable-detail-pages=false

    spring.cache.type=caffeine
    spring.cache.cache-names=inMemoryClusterCache
    spring.cache.caffeine.spec=maximumSize=3000,expireAfterAccess=3600s

    spring.security.jwt.secret=base64码
    spring.security.jwt.token-validity-in-seconds=604800
    # Administrator
    spring.security.users[0].name=admin
    spring.security.users[0].password=123456
    spring.security.users[0].roles=ADMIN
    # Custom User
    spring.security.users[1].name=user
    spring.security.users[1].password=123456
    spring.security.users[1].roles=eden-*
```

# 应用集成

为了减少客户端集成的工作，推荐您使用 [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) 框架，只需要两步就可以完成 Arthas 的集成。

引入 Arthas 依赖
````xml
<dependency>
    <groupId>io.github.shiyindaxiaojie</groupId>
    <artifactId>eden-arthas-spring-boot-starter</artifactId>
</dependency>
````
开启 Arthas 配置
````yaml
spring:
  arthas: 
    enabled: true # 默认关闭，请按需开启，支持零停机开启和关闭

arthas: # 在线诊断工具
  agent-id: ${spring.application.name}@${random.value}
  tunnel-server: ws://localhost:7777/ws # Arthas 地址
  session-timeout: 1800
  telnet-port: 0 # 随机端口
  http-port: 0 # 随机端口
````

启动您的项目，在控制台中查看到应用列表，就可以看到您的应用了。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-arthas-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-arthas-spring-boot-starter) 实现自己的需求。