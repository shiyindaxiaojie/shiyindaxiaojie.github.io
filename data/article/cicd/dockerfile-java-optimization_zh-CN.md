---
title: Dockerfile 构建 Java 应用瘦身优化
date: 2024-09-02
description: 制定一套标准 Docker 构建模板，简化 JVM 配置流程。
tags:
  - Spring Boot
  - 镜像分层
  - 最佳实践
  - 模板示例
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Docker.png
---

# 背景

早期我们对于 Docker 构建 Spring Boot 工程的方式很简单，直接构建生成 jar 可执行程序，通过 `java $JAVA_OPTS -jar` 启动。在 Kubernetes 环境下，如果要调整 JVM 参数，则通过 ConfigMap 维护 JAVA_OPTS 变量，方便统一管理同一个 Nacos 配置中心，如下：

```properties
-Xmn1G
-Xmx1G
-Xss256k
-Dspring.cloud.nacos.config.username=nacos
-Dspring.cloud.nacos.config.password=nacos
-Dspring.cloud.nacos.config.server-addr=127.0.0.1:8848
```

在实际的生产环境，可能定义了十几个甚至上百个 Deployment，每个 Deployment 根据不同的负载设置不同的 JVM 参数，没办法共享同一份 ConfigMap 文件。为了解决这个问题，我们应该优化下 Dockerfile 构建模板，把 JVM 参数和运行环境变量分离出去。

# 目标

制定一套标准 Docker 构建模板，简化 JVM 配置流程。

# 实现

首先从 Dockerfile 文件着手，需要考虑几个方面：

1. 镜像分层：分离基础镜像（固定）、辅助工具（固定）、Maven 依赖（基本不变）和应用程序代码（变化），并减少镜像体积，通过镜像缓存提高构建速度。
2. 变量简化：提取研发团队比较关心的 JVM 参数作为环境变量，例如 XMS 最小堆、XMX 最大堆、XSS 线程栈、GC 模式、GC 日志、堆转储、开启大页内存等。
3. 容器安全：基于最小权限原则，运行容器时，以非 root 用户运行，只允许持有特定目录的读写权限。
4. 脚本分离：将启动脚本与 Dockerfile 分离，方便从 ConfigMap 维护。

Dockerfile 内容如下，因 DockerHub 镜像仓库访问不稳定，代码使用了 [m.daocloud.io](https://github.com/DaoCloud/public-image-mirror) 代理，您可以根据实际情况调整。

```dockerfile
# 使用基础镜像
FROM m.daocloud.io/eclipse-temurin:11-jdk-alpine AS builder

# 指定构建模块
ARG MODULE=eden-demo-cola-start

# 设置工作目录
WORKDIR /app

# 复制必要文件
COPY $MODULE/target/$MODULE.jar application.jar
COPY docker/entrypoint.sh entrypoint.sh

# 安装最小依赖项
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories \
	&& apk update \
	&& apk add --no-cache tar binutils dos2unix \
    && dos2unix entrypoint.sh \
    && jdeps --ignore-missing-deps -q \
		--recursive \
		--multi-release 11 \
		--print-module-deps \
		--class-path '/BOOT-INF/lib/*' \
		application.jar > modules.txt

# 构建运行环境
RUN $JAVA_HOME/bin/jlink \
		--verbose \
		--add-modules $(cat modules.txt),sun.misc \
		--strip-debug \
		--no-man-pages \
		--no-header-files \
		--compress=2 \
		--output /jre

# 使用 Spring Boot 的分层模式提取 JAR 文件的依赖项
RUN java -Djarmode=layertools -jar application.jar extract

# 创建容器镜像
FROM m.daocloud.io/alpine:latest

# 定义元数据
LABEL maintainer="梦想歌 <shiyindaxiaojie@gmail.com>"
LABEL version="1.0.0"

# 指定构建参数
ARG USER=tmpuser
ARG GROUP=tmpgroup

# 设置环境变量
ENV JAVA_HOME /opt/jdk/jdk-11
ENV PATH "${JAVA_HOME}/bin:${PATH}"
ENV HOME "/app"
ENV TZ "Asia/Shanghai"
ENV LANG "C.UTF-8"
ENV XMS "1g"
ENV XMX "1g"
ENV XSS "256k"
ENV GC_MODE "G1"
ENV USE_GC_LOG "Y"
ENV USE_HEAP_DUMP "Y"
ENV USE_LARGE_PAGES "N"
ENV SPRING_PROFILES_ACTIVE "dev"
ENV SERVER_PORT "8080"
ENV MANAGEMENT_SERVER_PORT "9080"

# 设置日志目录
RUN mkdir -p $HOME/logs \
	&& touch $HOME/logs/entrypoint.out \
	&& ln -sf /dev/stdout $HOME/logs/entrypoint.out \
	&& ln -sf /dev/stderr $HOME/logs/entrypoint.out

# 切换工作目录
WORKDIR $HOME

# 从基础镜像复制应用程序依赖项和模块
COPY --from=builder /jre $JAVA_HOME
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader ./
COPY --from=builder /app/organization-dependencies ./
COPY --from=builder /app/modules-dependencies ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./
COPY --from=builder /app/entrypoint.sh ./

# 创建普通用户
RUN addgroup -g 1000 $GROUP \
	&& adduser -u 1000 -G $GROUP -h $HOME -s /bin/bash -D $USER \
	&& chown -R $USER:$GROUP $HOME \
	&& chmod -R a+rwX $HOME

# 切换到容器用户
USER $USER

# 暴露容器端口
EXPOSE $SERVER_PORT $MANAGEMENT_SERVER_PORT

# 设置启动脚本
CMD ["./entrypoint.sh"]
```

笔者将启动脚本命名为 `entrypoint.sh`，内容如下：

```bash
#!/bin/sh

JAVA_MAJOR_VERSION=$(java -version 2>&1 | sed -E -n 's/.* version "([0-9]*).*$/\1/p')

JAVA_OPTS="${JAVA_OPTS} -server"
JAVA_OPTS="${JAVA_OPTS} -XX:+UnlockExperimentalVMOptions -XX:+UnlockDiagnosticVMOptions"
JAVA_OPTS="${JAVA_OPTS} -XX:+AlwaysPreTouch -XX:+PrintFlagsFinal -XX:-DisplayVMOutput -XX:-OmitStackTraceInFastThrow"
JAVA_OPTS="${JAVA_OPTS} -Xms${XMS:-1G} -Xmx${XMX:-1G} -Xss${XSS:-256K}"
JAVA_OPTS="${JAVA_OPTS} -XX:MetaspaceSize=${METASPACE_SIZE:-128M} -XX:MaxMetaspaceSize=${MAX_METASPACE_SIZE:-256M}"
JAVA_OPTS="${JAVA_OPTS} -XX:MaxGCPauseMillis=${MAX_GC_PAUSE_MILLIS:-200}"

if [ "${GC_MODE}" = "ShenandoahGC" ]; then
    echo "GC mode is ShenandoahGC"
    JAVA_OPTS="${JAVA_OPTS} -XX:+UseShenandoahGC"
elif [ "${GC_MODE}" = "ZGC" ]; then
    echo "GC mode is ZGC"
    JAVA_OPTS="${JAVA_OPTS} -XX:+UseZGC"
elif [ "${GC_MODE}" = "G1" ]; then
    echo "GC mode is G1"
    JAVA_OPTS="${JAVA_OPTS} -XX:+UseG1GC"
    JAVA_OPTS="${JAVA_OPTS} -XX:InitiatingHeapOccupancyPercent=${INITIATING_HEAP_OCCUPANCY_PERCENT:-45}"
    JAVA_OPTS="${JAVA_OPTS} -XX:G1ReservePercent=${G1_RESERVE_PERCENT:-10} -XX:G1HeapWastePercent=${G1_HEAP_WASTE_PERCENT:-5} "
    JAVA_OPTS="${JAVA_OPTS} -XX:G1NewSizePercent=${G1_NEW_SIZE_PERCENT:-50} -XX:G1MaxNewSizePercent=${G1_MAX_NEW_SIZE_PERCENT:-50}"
    JAVA_OPTS="${JAVA_OPTS} -XX:G1MixedGCCountTarget=${G1_MIXED_GCCOUNT_TARGET:-8}"
    JAVA_OPTS="${JAVA_OPTS} -XX:G1MixedGCLiveThresholdPercent=${G1_MIXED_GCLIVE_THRESHOLD_PERCENT:-65}"
    JAVA_OPTS="${JAVA_OPTS} -XX:+UseStringDeduplication -XX:+ParallelRefProcEnabled"
elif [ "${GC_MODE}" = "CMS" ]; then
    echo "GC mode is CMS"
    JAVA_OPTS="${JAVA_OPTS} -XX:+UseConcMarkSweepGC -Xmn${XMN:-512m}"
    JAVA_OPTS="${JAVA_OPTS} -XX:ParallelGCThreads=${PARALLEL_GC_THREADS:-2} -XX:ConcGCThreads=${CONC_GC_THREADS:-1}"
    JAVA_OPTS="${JAVA_OPTS} -XX:+UseCMSInitiatingOccupancyOnly -XX:CMSInitiatingOccupancyFraction=${CMS_INITIATING_HEAP_OCCUPANCY_PERCENT:-92}"
    JAVA_OPTS="${JAVA_OPTS} -XX:+CMSClassUnloadingEnabled -XX:+CMSScavengeBeforeRemark"
    if [ "$JAVA_MAJOR_VERSION" -le "8" ] ; then
        JAVA_OPTS="${JAVA_OPTS} -XX:+CMSIncrementalMode -XX:CMSFullGCsBeforeCompaction=${CMS_FULL_GCS_BEFORE_COMPACTION:-5}"
        JAVA_OPTS="${JAVA_OPTS} -XX:+ExplicitGCInvokesConcurrent -XX:+ExplicitGCInvokesConcurrentAndUnloadsClasses"
    fi
fi

if [ "${USE_GC_LOG}" = "Y" ]; then
    echo "GC log path is '${HOME}/logs/jvm_gc.log'."
    JAVA_OPTS="${JAVA_OPTS} -XX:+PrintVMOptions"
    if [ "$JAVA_MAJOR_VERSION" -gt "8" ] ; then
        JAVA_OPTS="${JAVA_OPTS} -Xlog:gc:file=${HOME}/logs/jvm_gc-%p-%t.log:tags,uptime,time,level:filecount=${GC_LOG_FILE_COUNT:-10},filesize=${GC_LOG_FILE_SIZE:-100M}"
    else
        JAVA_OPTS="${JAVA_OPTS} -Xloggc:${HOME}/logs/jvm_gc.log -verbose:gc -XX:+PrintGCDetails -XX:+PrintGCDateStamps -XX:+PrintGCTimeStamps"
        JAVA_OPTS="${JAVA_OPTS} -XX:+UseGCLogFileRotation -XX:NumberOfGCLogFiles=${GC_LOG_FILE_COUNT:-10} -XX:GCLogFileSize=${GC_LOG_FILE_SIZE:-100M}"
        JAVA_OPTS="${JAVA_OPTS} -XX:+PrintGCCause -XX:+PrintGCApplicationStoppedTime"
        JAVA_OPTS="${JAVA_OPTS} -XX:+PrintTLAB -XX:+PrintReferenceGC -XX:+PrintHeapAtGC"
        JAVA_OPTS="${JAVA_OPTS} -XX:+FlightRecorder -XX:+PrintSafepointStatistics -XX:PrintSafepointStatisticsCount=1"
        JAVA_OPTS="${JAVA_OPTS} -XX:+DebugNonSafepoints -XX:+SafepointTimeout -XX:SafepointTimeoutDelay=500"
    fi
fi

if [ ! -d "${HOME}/logs" ]; then
    mkdir ${HOME}/logs
fi

if [ "${USE_HEAP_DUMP}" = "Y" ]; then
    echo "Heap dump path is '${HOME}/logs/jvm_heap_dump.hprof'."
    JAVA_OPTS="${JAVA_OPTS} -XX:HeapDumpPath=${HOME}/logs/jvm_heap_dump.hprof -XX:+HeapDumpOnOutOfMemoryError"
fi

if [ "${USE_LARGE_PAGES}" = "Y" ]; then
    echo "Use large pages."
    JAVA_OPTS="${JAVA_OPTS} -XX:+UseLargePages"
fi

if [ "${JDWP_DEBUG:-N}" = "Y" ]; then
    echo "Attach to remote JVM using port ${JDWP_PORT:-5005}."
    JAVA_OPTS="${JAVA_OPTS} -Xdebug -Xrunjdwp:transport=dt_socket,address=${JDWP_PORT:-5005},server=y,suspend=n"
fi

JAVA_OPTS="${JAVA_OPTS} -Dserver.port=${SERVER_PORT} -Dmanagement.server.port=${MANAGEMENT_SERVER_PORT}"

exec java $JAVA_OPTS -noverify -Djava.security.egd=file:/dev/./urandom "org.springframework.boot.loader.JarLauncher" "$@"
```

脚本目前兼容 JDK8、JDK11、JDK17，主要提供了以下参数：

1. GC_MODE：垃圾回收器，适配 `ShenandoahGC`、`ZGC`、`G1`、`CMS`。
2. USE_GC_LOG：是否启用 GC 日志，默认输出路径为 `${HOME}/logs/jvm_gc*.log`。
3. USE_HEAP_DUMP：是否启用堆转储，默认输出路径为 `${HOME}/logs/jvm_heap_dump.hprof`。
4. USE_LARGE_PAGES：是否启用大页。
5. JDWP_DEBUG：是否启用 `JDWP` 调试，默认端口为 `5005`。
6. SERVER_PORT：服务端口。
7. MANAGEMENT_SERVER_PORT：管理端口，访问路径为 `/actuator`。

# 产出

为团队提供 JVM 标准模板，通过 JVM 细节做了封装，研发团队只需要微调 JVM 变量就可以启用堆转储和 GC 日志、DEBUG 模式等配置。

服务瘦身效果比较明显，给研发团队做了测试，构建体积从原来的 389 MB 缩小到 295 MB，基础镜像占用了 240 MB，也就是说 jar 从 149 MB 降到 45 MB，如下图。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/docker/docker-slim.png)

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-demo-cola](https://github.com/shiyindaxiaojie/eden-demo-cola/tree/main/docker) 项目。
