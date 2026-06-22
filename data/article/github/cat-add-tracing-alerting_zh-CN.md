---
title: 基于 CAT 新增链路追踪和告警通知
date: 2023-03-03
description: CAT 是美团点评开源的实时应用监控平台，提供了 Tracsaction、Event、Problem、Business 等丰富的指标项。
tags:
  - 链路追踪
  - 可观测性
  - 美团
  - 二次开发
  - 中间件
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CAT.png
---

CAT 是美团点评开源的实时应用监控平台，提供了 `Tracsaction`、`Event`、`Problem`、`Business` 等丰富的指标项。

在官方的 Issue 遇到以下几个问题：
1. 能不能支持链路追踪？
2. 如何配置告警？
3. 能不能接入钉钉、飞书机器人推送？
4. 为什么 CAT 部署这么麻烦？

基于上面的需求，笔者 fork 了官方最新的源码进行二次开发，并打包镜像到 Docker Hub，方便大家使用。

* Github 地址：[传送门](https://github.com/shiyindaxiaojie/cat)
* Docker Hub 地址：[传送门](https://hub.docker.com/repository/docker/shiyindaxiaojie/cat-home/tags)

# 改造内容

* 新增**链路追踪**支持，您可以通过日志打印的 TraceId 查找整个请求路径的 HTTP 请求、RPC 调用、Log4j2 日志、SQL 语句和 Cache 执行耗时。
  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/tracing.png)

* 支持**邮件、钉钉、微信、飞书**机器人推送。不需要额外实现告警接口，直接开箱即用，您只需要在后台配置相关的 Token 即可。如下图，触发告警后，钉钉将推送相关信息，您可以点击 `查看告警` 触达异常堆栈，也可以点击 `告警规则` 设置告警阈值，避免多次干扰。

  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/dingtalk.png)

* 支持 **Jira Software** 自动录单。当生产故障触发告警时，自动录入 Jira Software，便于研发内部跟进问题。

  ![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/auto-create-jira-issue.png)

* 优化 **Docker** 部署，只需要提供 JVM 参数和 MySQL 配置即可完成部署，不需要额外挂载 `datasource.xml` 和 `client.xml` 等配置文件。
  ```bash
  docker run -e MYSQL_URL="127.0.0.1" -e MYSQL_PORT="3306" -e MYSQL_SCHEMA="cat" -e MYSQL_USERNAME="数据库账号" -e MYSQL_PASSWD="数据库密码" -p 8080:8080 --name=cat-home -d shiyindaxiaojie/cat-home
  ```

# 部署教程

## 运行环境要求

* JDK 版本 >= 7
* MySQL 5.7（亲测 8.0 会报错）
* Tomcat 8.0+
* Linux 内核版本 >= 2.6

## Tomcat 部署

从 [Github Release](https://github.com/shiyindaxiaojie/cat/releases/tag/v3.4.0) 下载相关文件，拷贝 `client.xml` 和 `datasources.xml` 到用户目录 `~/.cat/appdatas/cat` 中，并调整数据库配置。

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
        - name: JVM_XMS
          value: 2G
        - name: JVM_XMX
          value: 2G
        - name: JVM_XMN
          value: 1G
        image: shiyindaxiaojie/cat-home:v3.4.0
        imagePullPolicy: IfNotPresent
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - curl http://localhost:8080/cat/r/home?op=checkpoint && sleep 30
        name: cat-home
        resources:
          limits:
            cpu: 250m
            memory: 2Gi
          requests:
            cpu: 250m
            memory: 2Gi
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

推荐使用 Kubernetes 部署生产集群，假设部署三个节点，一个节点为监控节点，另外两个节点为消费节点，如下配置：
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

为了减少客户端集成的工作，推荐您使用 [eden-architect](https://github.com/shiyindaxiaojie/eden-architect) 框架，集成后在 log4j2 自动记录 TraceId。您只需要根据以下两步就可以完成 CAT 的集成。

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
  support-out-trace-id: false # 允许异构子系统间透传链路ID
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

启动您的项目，调用接口，查看控制台输出的日志内容，红圈中就是 CAT 的链路ID。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/traceid-of-logging.png)

根据链路ID，在 CAT 中查看详细链路信息。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/tracing.png)

> 当然，如果你不希望依赖 eden-architect，则可以参考[相关代码](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-integration/src/main/java/org/ylzl/eden/spring/integration/cat/integration)实现自己的需求。关于相关代码的实现原理，笔者将在后面的文章中给出。

# 告警配置

目前 CAT 经过二次开发，实现了告警通知的开箱即用，您只需要微调相关配置，即可开启告警通知功能。告警通知支持以下方式：邮件、钉钉、飞书、微信、Jira Software，配置步骤如下：

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

笔者设置了所有异常出现 5 次时发送告警，10 次时发送告警。达到这个阈值时，邮件会发送到 `告警对象` 设置的接收对象，Jira Software 会创建一个故障，钉钉会发送告警通知：
   
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cat/mail.png)

