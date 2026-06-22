---
title: 基于 Sentinel 新增规则存储和监控回看
date: 2022-10-20
description: Sentinel 是阿里巴巴开源的流量治理平台，提供了流量控制、熔断降级、系统负载保护、黑白名单访问控制等功能。
tags:
  - 限流熔断
  - 可观测性
  - 阿里巴巴
  - 二次开发
  - 中间件
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Sentinel.png
---

Sentinel 是阿里巴巴开源的流量治理平台，提供了流量控制、熔断降级、系统负载保护、黑白名单访问控制等功能。

在实际的生产应用中，我们遇到以下几个问题：
1. Sentinel 控制台不支持流控规则持久化，需要自行扩展。
2. Sentinel 控制台的监控数据只保存到内存中，只能查看近 5 分钟的数据。

基于上面的问题，笔者 fork 了官方最新的源码进行二次开发，并打包镜像到 Docker Hub，方便大家使用。

* Github 地址：[传送门](https://github.com/shiyindaxiaojie/sentinel)
* Docker Hub 地址：[传送门](https://hub.docker.com/repository/docker/shiyindaxiaojie/sentinel-dashboard/tags)

# 改造内容

* 新增**流控规则持久化**支持，适配 `Apollo`、`Nacos`、`Zookeeper` 等组件。

* 新增**监控数据持久化**机制，适配 `InfluxDB`、`Kafka`、`Elasticsearch` 等组件，您可以通过时间控制回看历史数据，如下图。
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/sentinel/sentinel-dashboard-overview-custom.png)
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/sentinel/sentinel-dashboard-overview-quick.png)

# 部署教程

## 微调应用配置

在实际的生产需求，Sentinel 保存的规则和监控是需要持久化落盘的，因此，您可以在 `sentinel-dashboard/src/main/resources/application.properties` 接入外部组件。

规则存储类型支持：memory（默认）、nacos（推荐）、apollo、zookeeper

```properties
# 规则存储类型，可选项：memory（默认）、nacos（推荐）、apollo、zookeeper
sentinel.rule.type=nacos
# Nacos 存储规则，如果您设置了 sentinel.metrics.type=nacos，需要调整相关配置
sentinel.rule.nacos.server-addr=localhost:8848
sentinel.rule.nacos.namespace=demo
sentinel.rule.nacos.group-id=sentinel
sentinel.rule.nacos.username=nacos
sentinel.rule.nacos.password=nacos
# Apollo 存储规则，如果您设置了 sentinel.metrics.type=apollo，需要调整相关配置
sentinel.rule.apollo.portal-url=http://localhost:10034
sentinel.rule.apollo.token=
sentinel.rule.apollo.env=
# Zookeeper 存储规则，如果您设置了 sentinel.metrics.type=zookeeper，需要调整相关配置
sentinel.rule.zookeeper.connect-string=localhost:2181
sentinel.rule.zookeeper.root-path=/sentinel_rule
```

监控存储类型支持：memory（默认）、influxdb（推荐）、elasticsearch、kafka
```properties
# 监控存储类型，可选项：memory（默认）、influxdb（推荐）、elasticsearch
sentinel.metrics.type=memory
# InfluxDB 存储监控数据，如果您设置了 sentinel.metrics.type=influxdb，需要调整相关配置
influx.url=http://localhost:8086/
influx.token=
influx.org=sentinel
influx.bucket=sentinel
influx.log-level=NONE
influx.read-timeout=10s
influx.write-timeout=10s
influx.connect-timeout=10s
# Elasticsearch 存储监控数据，如果您设置了 sentinel.metrics.type=elasticsearch，需要调整相关配置
sentinel.metrics.elasticsearch.index-name=sentinel_metric
spring.elasticsearch.rest.uris=http://localhost:9200
spring.elasticsearch.rest.connection-timeout=3000
spring.elasticsearch.rest.read-timeout=5000
spring.elasticsearch.rest.username=
spring.elasticsearch.rest.password=
# 监控数据存储缓冲设置，降低底层存储组件写入压力。可选项：none（默认不启用）、kafka（推荐）
sentinel.metrics.sender.type=none
# Kafka 存储监控数据，如果您设置了 sentinel.metrics.sender.type=kafka，需要调整相关配置
sentinel.metrics.sender.kafka.topic=sentinel_metric
spring.kafka.producer.bootstrap-servers=localhost:9092
spring.kafka.producer.batch-size=4096
spring.kafka.producer.buffer-memory=40960
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.apache.kafka.common.serialization.StringSerializer
```

## FatJar 部署

执行 `mvn clean package` 打包成一个 fat jar，参考如下命令启动编译后的控制台。

```bash
java -Dserver.port=8080 \
-Dsentinel.rule.nacos.server-addr=localhost:8848 \
-Dsentinel.rule.nacos.namespace=demo \
-Dsentinel.rule.nacos.group-id=sentinel \
-Dsentinel.metrics.type=influxdb \
-Dinflux.url=http://localhost:8086 \
-Dinflux.token=XXXXXX \
-Dinflux.org=sentinel \
-Dinflux.bucket=sentinel \
-jar target/sentinel-dashboard.jar
```

## Docker 部署

本项目已发布稳定的镜像到 [Docker Hub](https://hub.docker.com/repository/docker/shiyindaxiaojie/sentinel/tags)，您可以直接使用如下命令，完成部署。

```bash
docker run -p 8090:8090 --name=sentinel-dashboard -d shiyindaxiaojie/sentinel-dashboard
```

## Kubernetes 部署

建议使用 StatefulSet 部署，YAML 示例如下：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: sentinel-dashboard
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
        - name: PATH
          value: /usr/local/openjdk-11/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
        - name: TZ
          value: Asia/Shanghai
        - name: JAVA_HOME
          value: /usr/local/openjdk-11
        - name: SPRING_OUTPUT_ANSI_ENABLED
          value: ALWAYS
        - name: JAVA_OPTS
          valueFrom:
            configMapKeyRef:
              key: JAVA_OPTS
              name: sentinel-dashboard
              optional: false
        - name: JAVA_VERSION
          value: 11.0.16
        - name: JAVA_SLEEP
          value: "1"
        - name: LANG
          value: C.UTF-8
        - name: JVM_XMS
          value: 512m
        - name: JVM_XMX
          value: 512m
        - name: JVM_XMN
          value: 256m
        - name: SERVER_PORT
          value: "8090"
        image: shiyindaxiaojie/sentinel-dashboard:v1.8.6
        imagePullPolicy: IfNotPresent
        name: sentinel-dashboard
        resources:
          limits:
            cpu: 250m
            memory: 1Gi
          requests:
            cpu: 250m
            memory: 1Gi
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

对应的 ConfigMap 如下（仅供参考，需自行替换），用于配置账号和权限。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sentinel-dashboard
  namespace: monitoring
data:
  JAVA_OPTS: |
    -Dsentinel.rule.nacos.server-addr=nacos-server:8848 -Dsentinel.rule.nacos.namespace=sentinel
    -Dsentinel.rule.nacos.group-id=sentinel -Dsentinel.metrics.type=influxdb -Dinflux.url=http://influxdb:8086/
    -Dinflux.token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    -Dinflux.org=demo -Dinflux.bucket=sentinel
```

# 应用集成

为了减少客户端集成的工作，推荐您使用 [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) 框架，只需要两步就可以完成 Sentinel 的集成。

引入 Sentinel 依赖
````xml
<dependency>
    <groupId>io.github.shiyindaxiaojie</groupId>
    <artifactId>eden-sentinel-spring-cloud-starter</artifactId>
</dependency>
````

开启 Sentinel 配置
````yaml
spring:
  cloud:
    sentinel: # 流量治理组件
      enabled: true # 默认关闭，请按需开启
      http-method-specify: true # 兼容 RESTful
      eager: true # 立刻刷新到 Dashboard
      transport:
        dashboard: localhost:8090
      datasource:
        flow:
          nacos:
            server-addr: ${spring.cloud.nacos.config.server-addr}
            namespace: ${spring.cloud.nacos.config.namespace}
            groupId: sentinel
            dataId: ${spring.application.name}-flow-rule
            rule-type: flow
            data-type: json
````

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-sentinel-spring-cloud-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-cloud-starters/eden-sentinel-spring-cloud-starter) 实现自己的需求。