---
title: Dockerfile Java Application Optimization and Slimming
date: 2024-09-02
description: Establish a standard Docker build template to simplify JVM configuration process.
tags:
  - Spring Boot
  - Image Layering
  - Best Practices
  - Template Examples
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Docker.png
---

# Background

Early on, our approach to Docker building Spring Boot projects was simple - directly build and generate jar executable, start via `java $JAVA_OPTS -jar`. In Kubernetes environment, to adjust JVM parameters, we maintained JAVA_OPTS variables through ConfigMap for unified management of the same Nacos configuration center:

```properties
-Xmn1G
-Xmx1G
-Xss256k
-Dspring.cloud.nacos.config.username=nacos
-Dspring.cloud.nacos.config.password=nacos
-Dspring.cloud.nacos.config.server-addr=127.0.0.1:8848
```

In actual production environments, there might be dozens or even hundreds of Deployments defined, each setting different JVM parameters based on different loads - unable to share the same ConfigMap file. To solve this problem, we should optimize the Dockerfile build template to separate JVM parameters and runtime environment variables.

# Objective

Establish a standard Docker build template to simplify JVM configuration process.

# Implementation

Starting with the Dockerfile, several aspects need consideration:

1. Image layering: Separate base image (fixed), utility tools (fixed), Maven dependencies (mostly unchanged), and application code (changes), reduce image size, and improve build speed through image caching.
2. Variable simplification: Extract JVM parameters that development teams care about as environment variables, such as XMS minimum heap, XMX maximum heap, XSS thread stack, GC mode, GC logs, heap dump, large pages, etc.
3. Container security: Based on least privilege principle, run containers as non-root user with read-write permissions only for specific directories.
4. Script separation: Separate startup script from Dockerfile for easier ConfigMap maintenance.

Dockerfile content below. Due to unstable DockerHub access, code uses [m.daocloud.io](https://github.com/DaoCloud/public-image-mirror) proxy - adjust according to your situation.

```dockerfile
# Use base image
FROM m.daocloud.io/eclipse-temurin:11-jdk-alpine AS builder

# Specify build module
ARG MODULE=eden-demo-cola-start

# Set working directory
WORKDIR /app

# Copy necessary files
COPY $MODULE/target/$MODULE.jar application.jar
COPY docker/entrypoint.sh entrypoint.sh

# Install minimal dependencies
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

# Build runtime environment
RUN $JAVA_HOME/bin/jlink \
		--verbose \
		--add-modules $(cat modules.txt),sun.misc \
		--strip-debug \
		--no-man-pages \
		--no-header-files \
		--compress=2 \
		--output /jre

# Use Spring Boot layered mode to extract JAR dependencies
RUN java -Djarmode=layertools -jar application.jar extract

# Create container image
FROM m.daocloud.io/alpine:latest

# Define metadata
LABEL maintainer="Dreamsinger <shiyindaxiaojie@gmail.com>"
LABEL version="1.0.0"

# Specify build arguments
ARG USER=tmpuser
ARG GROUP=tmpgroup

# Set environment variables
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

# Set log directory
RUN mkdir -p $HOME/logs \
	&& touch $HOME/logs/entrypoint.out \
	&& ln -sf /dev/stdout $HOME/logs/entrypoint.out \
	&& ln -sf /dev/stderr $HOME/logs/entrypoint.out

# Switch working directory
WORKDIR $HOME

# Copy application dependencies and modules from base image
COPY --from=builder /jre $JAVA_HOME
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader ./
COPY --from=builder /app/organization-dependencies ./
COPY --from=builder /app/modules-dependencies ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./
COPY --from=builder /app/entrypoint.sh ./

# Create regular user
RUN addgroup -g 1000 $GROUP \
	&& adduser -u 1000 -G $GROUP -h $HOME -s /bin/bash -D $USER \
	&& chown -R $USER:$GROUP $HOME \
	&& chmod -R a+rwX $HOME

# Switch to container user
USER $USER

# Expose container ports
EXPOSE $SERVER_PORT $MANAGEMENT_SERVER_PORT

# Set startup script
CMD ["./entrypoint.sh"]
```

The startup script is named `entrypoint.sh`:

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

Script currently supports JDK8, JDK11, JDK17 with these main parameters:

1. GC_MODE: Garbage collector, supports `ShenandoahGC`, `ZGC`, `G1`, `CMS`.
2. USE_GC_LOG: Enable GC logging, default output path `${HOME}/logs/jvm_gc*.log`.
3. USE_HEAP_DUMP: Enable heap dump, default output path `${HOME}/logs/jvm_heap_dump.hprof`.
4. USE_LARGE_PAGES: Enable large pages.
5. JDWP_DEBUG: Enable `JDWP` debugging, default port `5005`.
6. SERVER_PORT: Service port.
7. MANAGEMENT_SERVER_PORT: Management port, access path `/actuator`.

# Output

Provided JVM standard template for the team. With JVM details encapsulated, development teams only need to adjust JVM variables to enable heap dumps, GC logs, DEBUG mode, etc.

Service slimming effect is significant. Testing with development team showed build size reduced from 389 MB to 295 MB. Base image occupies 240 MB, meaning jar reduced from 149 MB to 45 MB, as shown below.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/docker/docker-slim.png)

Code in this article is fully open source. Interested parties can check [eden-demo-cola](https://github.com/shiyindaxiaojie/eden-demo-cola/tree/main/docker) project.
