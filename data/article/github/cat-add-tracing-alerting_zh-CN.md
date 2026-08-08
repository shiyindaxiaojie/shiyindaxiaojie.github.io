---
title: 为 CAT 增加链路追踪与告警通知
date: 2023-03-03
description: CAT 是美团点评开源的实时应用监控平台，提供 Transaction、Event、Problem、Business 等多种监控指标。
tags:
  - 链路追踪
  - 可观测性
  - 美团
  - 二次开发
  - 中间件
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CAT.png
---

CAT 是美团点评开源的实时应用监控平台，提供 `Transaction`、`Event`、`Problem`、`Business` 等多种监控指标。

官方 Issue 中经常出现以下问题：
1. 能不能支持链路追踪？
2. 如何配置告警？
3. 能不能接入钉钉、飞书机器人推送？
4. 为什么 CAT 部署这么麻烦？

针对这些需求，我 fork 了官方源码进行二次开发，并将镜像发布到 Docker Hub，方便直接部署。

* GitHub 地址：[传送门](https://github.com/shiyindaxiaojie/cat)
* Docker Hub 地址：[传送门](https://hub.docker.com/repository/docker/shiyindaxiaojie/cat-home/tags)

# 改造内容

* 新增**链路追踪**支持。通过日志中的 TraceId，可以查看一次请求涉及的 HTTP 请求、RPC 调用、Log4j2 日志、SQL 语句和缓存执行耗时。
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/tracing.png)

* 支持**邮件、钉钉、微信、飞书**机器人推送，无需额外实现告警接口，只需在后台配置相应的 Token。告警触发后，钉钉会推送相关信息。点击 `查看告警` 可以查看异常堆栈，点击 `告警规则` 可以设置告警阈值，减少重复通知。

  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/dingtalk.png)

* 支持 **Jira Software** 自动创建工单。生产故障触发告警后，系统会自动创建 Jira Software 工单，便于研发团队持续跟进。

  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/auto-create-jira-issue.png)

* 简化 **Docker** 部署。只需提供 JVM 参数和 MySQL 配置，无需额外挂载 `datasource.xml`、`client.xml` 等配置文件。
  ```bash
  docker run -e MYSQL_URL="127.0.0.1" -e MYSQL_PORT="3306" -e MYSQL_SCHEMA="cat" -e MYSQL_USERNAME="数据库账号" -e MYSQL_PASSWD="数据库密码" -p 8080:8080 --name=cat-home -d shiyindaxiaojie/cat-home
  ```

# 部署教程

## 运行环境要求

* JDK 版本 >= 7
* MySQL 5.7
* Tomcat 8.0+
* Linux 内核版本 >= 2.6

## Tomcat 部署

从 [GitHub Release](https://github.com/shiyindaxiaojie/cat/releases/tag/v3.4.0) 下载相关文件，拷贝 `client.xml` 和 `datasources.xml` 到用户目录 `~/.cat/appdatas/cat` 中，并调整数据库配置。

将 `cat.war` 部署在目标 `Tomcat` 的 `webapps` 目录下，启动 `Tomcat`，访问 `http://localhost:8080/cat` 即可。原则上请保持 `Tomcat` 的端口为 `8080`，遇到项目启动失败的情况，建议查看 `~/.cat/applog/` 目录下的日志。

## Docker 部署

本项目已发布稳定的镜像到 [Docker Hub](https://hub.docker.com/repository/docker/shiyindaxiaojie/cat-home/tags)，您可以直接使用如下命令，提供 JVM 参数和 MySQL 配置，完成部署。

```bash
docker run -e MYSQL_URL="127.0.0.1" -e MYSQL_PORT="3306" -e MYSQL_SCHEMA="cat" -e MYSQL_USERNAME="数据库账号" -e MYSQL_PASSWD="数据库密码" -e JVM_XMS="最小堆" -e JVM_XMX="最大堆" -p 8080:8080 --name=cat-home -d shiyindaxiaojie/cat-home
```

## Kubernetes 部署

建议使用 StatefulSet 部署，YAML 示例如下：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cat-home
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
        - name: JAVA_OPTS
          value: -Xmx1536m -Xms1536m -Xmn1024m
        - name: MYSQL_URL
          value: 数据库地址
        - name: MYSQL_PORT
          value: "3306"
        - name: MYSQL_USERNAME
          value: 数据库账号
        - name: MYSQL_PASSWORD
          value: 数据库密码
        - name: MYSQL_SCHEMA
          value: CAT 数据库名称
        - name: SERVER_URL
          value: CAT 运行地址
        - name: XMS
          value: 1536m
        - name: XMX
          value: 1536m
        - name: GC_MODE
          value: G1
        - name: USE_GC_LOG
          value: Y
        - name: USE_HEAP_DUMP
          value: Y
        image: shiyindaxiaojie/cat-home:latest
        imagePullPolicy: IfNotPresent
        lifecycle:
          preStop: # 从 3.4.3 版本开始不需要配置
            exec:
              command:
              - /bin/sh
              - -c
              - curl http://localhost:8080/cat/r/home?op=checkpoint && sleep 30
        name: cat-home
        resources:
          limits:
            cpu: 1000m
            memory: 3Gi
          requests:
            cpu: 1000m
            memory: 3Gi
        volumeMounts:
        - mountPath: /data/appdatas/cat/bucket
          name: data
          subPath: appdatas
        - mountPath: /data/applogs
          name: log
          subPath: applogs
      volumes: 
      - name: data
        nfs: # 此处省略，请根据实际情况配置
      - name: log
        nfs: # 此处省略，请根据实际情况配置
```

## 生产集群部署

生产环境推荐使用 Kubernetes 集群部署。以下示例包含三个节点，其中一个是监控节点，另外两个是消费节点：
* 监控节点：10.1.1.1
* 消费节点：10.1.1.2
* 消费节点：10.1.1.3

请复制上面的 YAML，将 SERVER_URL 参数调整为 `10.1.1.1,10.1.1.2,10.1.1.3`。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cat-home
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
        - name: SERVER_URL
          value: 10.1.1.1,10.1.1.2,10.1.1.3
```

启动后，点击顶部导航栏 `配置`，从左侧 `系统配置` 设置 `服务端配置`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/server-config.png)

配置内容如下：

```xml
<?xml version="1.0" encoding="utf-8"?>
<server-config>
  <!-- 默认不开启监控 -->
  <server id="default">
      <properties>
        <property name="local-mode" value="false"/>
        <property name="job-machine" value="false"/>
        <property name="send-machine" value="false"/>
        <property name="alarm-machine" value="false"/>
        <property name="hdfs-enabled" value="false"/>
        <property name="remote-servers" value="10.1.1.1:8080,10.1.1.2:8080,10.1.1.3:8080"/>
        <!-- 从 3.4.3 版本开始新增，支持 Netty 线程，队列，分析器配置 -->
        <property name="netty-boss-threads" value="1"/>
        <property name="netty-worker-threads" value="auto"/>
        <property name="report-query-threads" value="8"/>
        <property name="max-message-size" value="8388608"/>
        <property name="message-processor-thread" value="8"/>
        <property name="message-processor-queue-size" value="5000"/>
        <property name="realtime-analyzer-queue-capacity-per-thread" value="10000"/>
        <property name="top-analyzer-enable" value="true"/>
        <property name="business-analyzer-enable" value="true"/>
        <property name="matrix-analyzer-enable" value="true"/>
        <property name="storage-analyzer-enable" value="true"/>
        <property name="dependency-analyzer-enable" value="true"/>
      </properties>
      <storage local-base-dir="/data/appdatas/cat/bucket/" max-hdfs-storage-time="15" local-report-storage-time="30" local-logivew-storage-time="30" har-mode="true" upload-thread="5">
        <hdfs id="dump" max-size="128M" server-uri="hdfs://127.0.0.1/" base-dir="/user/cat/dump"/>
        <harfs id="dump" max-size="128M" server-uri="har://127.0.0.1/" base-dir="/user/cat/dump"/>
        <properties>
            <property name="hadoop.security.authentication" value="false"/>
            <property name="dfs.namenode.kerberos.principal" value="hadoop/dev80.hadoop@testserver.com"/>
            <property name="dfs.cat.kerberos.principal" value="cat@testserver.com"/>
            <property name="dfs.cat.keytab.file" value="/data/appdatas/cat/cat.keytab"/>
            <property name="java.security.krb5.realm" value="value1"/>
            <property name="java.security.krb5.kdc" value="value2"/>
        </properties>
      </storage>
      <consumer>
        <long-config default-url-threshold="1000" default-sql-threshold="100" default-service-threshold="50">
            <domain name="cat" url-threshold="500" sql-threshold="500"/>
            <domain name="OpenPlatformWeb" url-threshold="100" sql-threshold="500"/>
        </long-config>
      </consumer>
  </server>
  <!-- 将 10.1.1.1 设置为监控节点，其他节点设置为消费节点 -->
  <server id="10.1.1.1">
      <properties>
        <property name="job-machine" value="true"/>
        <property name="send-machine" value="true"/>
        <property name="alarm-machine" value="true"/>
      </properties>
  </server>
</server-config>
```

从左侧 `系统配置` 设置 `客户端路由` 。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/client-route-config.png)

配置内容如下：

```xml
<?xml version="1.0" encoding="utf-8"?>
<router-config backup-server="10.1.1.1" backup-server-port="2280">
  <!-- 监控节点不开启消费，其他节点开启消费，可以根据实际情况调整 weight 权重 -->
  <default-server id="10.1.1.1" weight="1.0" port="2280" enable="false"/>
  <default-server id="10.1.1.2" weight="1.0" port="2280" enable="true"/>
  <default-server id="10.1.1.3" weight="1.0" port="2280" enable="true"/>
  <network-policy id="default" title="default" block="false" server-group="default_group">
  </network-policy>
  <server-group id="default_group" title="default-group">
      <group-server id="10.1.1.2"/>
      <group-server id="10.1.1.3"/>
  </server-group>
  <domain id="cat">
      <group id="default">
        <server id="10.1.1.2" port="2280" weight="1.0"/>
        <server id="10.1.1.3" port="2280" weight="1.0"/>
      </group>
  </domain>
</router-config>
```

配置完成后，查看`首页`的`系统状态`，集群配置已生效，如下图，监控节点只负责控制台的数据展示和告警通知，不消费客户端的数据。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/cluster-monitor-node.png)

数据消费节点会消费客户端发送的数据，根据客户端路由设置的权重策略均摊数据。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/cluster-data-node.png)

# 应用集成

为了减少客户端接入工作，推荐使用 [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) 框架。接入后，Log4j2 会自动记录 TraceId。完成下面两步即可集成 CAT。

引入 CAT 依赖
````xml
<dependency>
    <groupId>io.github.shiyindaxiaojie</groupId>
    <artifactId>eden-cat-spring-boot-starter</artifactId>
</dependency>
````
开启 CAT 配置
````yaml
cat:
  enabled: false # 默认关闭，请按需开启
  trace-mode: true # 开启访问观测
  support-out-trace-id: false # 允许异构子系统间透传 Trace ID
  home: /tmp
  servers: localhost # CAT 地址
  tcp-port: 2280
  http-port: 8080

# 如果您使用 Dubbo 组件，请增加对应的过滤器，确保 CAT 埋点正常工作
dubbo:
  provider:
    filter: cat-tracing
  consumer:
    filter: cat-tracing,cat-consumer
````

启动项目并调用接口，在控制台日志中找到图中红圈标出的 CAT Trace ID。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/traceid-of-logging.png)

使用该 Trace ID，可以在 CAT 中查看完整的链路信息。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/tracing.png)

> 当然，如果你不希望依赖 eden-architect，则可以参考[相关代码](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-integration/src/main/java/org/ylzl/eden/spring/integration/cat/integration)实现自己的需求。关于相关代码的实现原理，笔者将在后面的文章中给出。

# 告警配置

二次开发后的 CAT 已内置告警通知能力，调整配置后即可启用。通知渠道包括邮件、钉钉、飞书、微信和 Jira Software，配置步骤如下。

点击控制台的 `配置`，展开左侧 `系统配置` 的 `告警渠道`，如下图：

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/alert-config.png)

以 `邮件`、`钉钉`、`Jira Software` 为例，内容如下：

```xml
<?xml version="1.0" encoding="utf-8"?>
<sender-config>
  <sender id="mail" url="smtp.qq.com:25" type="post" successCode="200" batchSend="true">
      <par id="username=发件人邮箱地址"/>
      <par id="password=发件人邮箱密码"/>
  </sender>
  <sender id="dingtalk" url="https://oapi.dingtalk.com/robot/send?access_token=" type="post" successCode="200" batchSend="false">
  </sender>
  <sender id="jira" url="http://localhost:8080" type="post" successCode="200" batchSend="false">
      <par id="reporter_token=凭据"/>
  </sender>
</sender-config>
```

设置 `系统配置` 的 `告警策略`，即 CAT 埋点达到告警阈值时发送的接收对象，例如 `dingtalk`、`mail`、`jira`，如下图：

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/alert-strategy.png)

内容如下：

```xml
  <?xml version="1.0" encoding="utf-8"?>
  <alert-policy>
    <type id="Transaction">
        <group id="default">
          <level id="warning" send="dingtalk,mail" suspendMinute="5"/>
          <level id="error" send="dingtalk,mail" suspendMinute="10"/>
        </group>
    </type>
    <type id="Event">
        <group id="default">
          <level id="warning" send="dingtalk,mail" suspendMinute="5"/>
          <level id="error" send="dingtalk,mail" suspendMinute="10"/>
        </group>
    </type>
    <type id="Exception">
        <group id="default">
          <level id="warning" send="dingtalk,mail,jira" suspendMinute="5"/>
          <level id="error" send="dingtalk,mail,jira" suspendMinute="10"/>
        </group>
    </type>
    <type id="Business">
        <group id="default">
          <level id="error" send="dingtalk,mail" suspendMinute="5"/>
          <level id="warning" send="dingtalk,mail" suspendMinute="10"/>
        </group>
    </type>
    <type id="Heartbeat">
        <group id="default">
          <level id="warning" send="dingtalk,mail" suspendMinute="5"/>
          <level id="error" send="dingtalk,mail" suspendMinute="10"/>
        </group>
    </type>
    <type id="default">
        <group id="default">
          <level id="warning" send="dingtalk,mail" suspendMinute="5"/>
          <level id="error" send="dingtalk,mail" suspendMinute="10"/>
        </group>
    </type>
  </alert-policy>
  ```

设置 `系统配置` 的 `告警对象`，即告警通知接收对象，如下图：

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/alert-config-receiver.png)

内容如下，笔者设置了 `Exception` 类型的告警：

```xml
  <?xml version="1.0" encoding="utf-8"?>
  <alert-config>
    <receiver id="Transaction" enable="true">
    </receiver>
    <receiver id="Event" enable="true">
    </receiver>
    <receiver id="Exception" enable="true">
        <email>您的邮箱</email>
        <jira>reporterName=monitor&amp;issueType=故障&amp;components=架构&amp;fixVersionNames=待定</jira>
        <dingtalk>您的钉钉机器人Token</dingtalk>
    </receiver>
    <receiver id="Heartbeat" enable="true">
    </receiver>
    <receiver id="Business" enable="true">
    </receiver>
    <receiver id="default" enable="true">
    </receiver>
  </alert-config>
  ```

接下来设置 `Server` 的 `异常告警配置`，如下图：
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/server-exception-alert-config.png)

配置界面如下，应用名称填写 `default` 表示监控所有服务，您可以指定自己的服务名称独立监控。异常名称建议填写 `Total`，表示监控所有异常，如果您需要监控某个异常，则填写该异常名称即可：
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/server-exception-alert-config-editable.png)

如果有些异常是不需要监控的，请在`异常过滤`列表添加。
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/server-exception-alert-config-ignore.png)

示例中为异常次数设置了 5 次和 10 次两个告警阈值。达到阈值后，系统会向 `告警对象` 中配置的邮箱发送邮件、在 Jira Software 中创建故障工单，并通过钉钉推送通知。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/mail.png)
