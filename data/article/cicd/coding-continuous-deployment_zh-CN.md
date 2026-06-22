---
title: CODING 持续部署实践
date: 2022-08-10
description: 在公司引入 CODING 后，研发团队和运维团队的工作都发生了很大的变化。研发团队负责 DevOps 的全生命周期管理，不再依赖运维团队，效率提升明显。
tags:
  - CODING
  - CI/CD
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CODING.png
---

# 背景

CODING 是腾讯云提供的云原生应用平台，提供了可视化的编排工具，支持 GitOps、CI/CD、Helm、Kubernetes 等云原生技术。笔者所在的公司使用 Jenkins 构建，由运维团队负责管理 CI/CD，效率低下，腾讯云给我们推广了这个产品，趁这个机会，笔者决定研究下 CODING。

# 目标

探索 CODING 流水线使用，验证 CI/CD 能力。

# 实战

以 [演示工程](https://github.com/shiyindaxiaojie/eden-demo-cola) 为例，使用 `Maven` 构建工具，目录结构如下。

```bash
eden-demo-cola
  |_ .coding/
    |_ Jenkinsfile # CODING 流水线脚本
    |_ settings.xml # 自定义Maven 配置文件
  |_ docker/
    |_ Dockerfile # Docker 构建文件
    |_ entrypoint.sh # Docker 容器启动脚本
  |_ ...
  |_ pom.xml # Maven 构建文件
```

## 设置 Git 代码仓库

由于笔者的项目主要托管在 Github，使用`关联代码仓库`完成构建。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-relate-code-repo.png) 

## 选择 Image 构建工具

> 目前 Java 构建镜像的主流方式有两种：
> 1. 使用 Google 的 `jib-maven-plugin` 插件，这种方式简单轻便，不需要在 Docker 环境下运行。
> 2. 编写 Dockerfile 文件：自由度较高，结合 `spring-boot-maven-plugin` 插件配置分层。

### Google Jib 插件构建

在子模块 `eden-demo-cola-start` 中引入 `jib-maven-plugin` 插件。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
		 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
		 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">

	<modelVersion>4.0.0</modelVersion>
	<parent>
		<groupId>io.github.shiyindaxiaojie.eden.demo</groupId>
		<artifactId>eden-demo-cola</artifactId>
		<version>0.0.1-SNAPSHOT</version>
		<relativePath>../pom.xml</relativePath>
	</parent>
	<artifactId>eden-demo-cola-start</artifactId>
	<packaging>jar</packaging>
	<name>eden-demo-cola-start</name>
	<description>启动入口</description>

	<properties>
		<start-class>org.ylzl.eden.demo.ColaApplication</start-class>
		<maven.deploy.skip>true</maven.deploy.skip>
		<build.layers.enabled>true</build.layers.enabled>
	</properties>

	<build>
		<finalName>${project.name}</finalName>
		<plugins>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
			</plugin>
			<plugin>
				<groupId>com.google.cloud.tools</groupId>
				<artifactId>jib-maven-plugin</artifactId>
				<configuration>
					<from>
						<image>openjdk:11-jdk-slim</image>
					</from>
					<to>
						<image>${docker.image}</image>
						<auth>
							<username>${docker.username}</username>
							<password>${docker.password}</password>
						</auth>
						<tags>
							<tag>${project.version}</tag>
							<tag>latest</tag>
						</tags>
					</to>
					<container>
						<entrypoint>
							<shell>bash</shell>
							<option>-c</option>
							<arg>/entrypoint.sh</arg>
						</entrypoint>
						<ports>
							<port>8080</port>
							<port>9080</port>
						</ports>
						<environment>
							<TZ>Asia/Shanghai</TZ>
							<LANG>C.UTF-8</LANG>
							<JVM_XMS>1g</JVM_XMS>
							<JVM_XMX>1g</JVM_XMX>
							<JVM_XSS>256k</JVM_XSS>
							<GC_MODE>G1</GC_MODE>
							<USE_GC_LOG>Y</USE_GC_LOG>
							<USE_HEAP_DUMP>Y</USE_HEAP_DUMP>
							<USE_LARGE_PAGES>N</USE_LARGE_PAGES>
							<SPRING_PROFILES_ACTIVE>dev</SPRING_PROFILES_ACTIVE>
						</environment>
						<creationTime>USE_CURRENT_TIMESTAMP</creationTime>
						<mainClass>${start-class}</mainClass>
					</container>
					<extraDirectories>
						<paths>src/main/docker/jib</paths>
						<permissions>
							<permission>
								<file>/entrypoint.sh</file>
								<mode>755</mode>
							</permission>
						</permissions>
					</extraDirectories>
					<allowInsecureRegistries>true</allowInsecureRegistries>
				</configuration>
			</plugin>
		</plugins>
	</build>
</project>
```

使用 Maven 构建并发布镜像，代码片段如下：

```bash
mvn -pl eden-demo-cola-start jib:build -Dimage=shiyindaxiaojie/eden-demo-cola -Djib.disableUpdateChecks=true -DskipTests -U -T 4C
```

### Dockerfile 分层构建

如果您不希望引入 Google 第三方插件，也可以参考 `docker` 目录的 Dockerfile 文件，代码实现了镜像的分层，可以放心使用。

```dockerfile
# 使用基础镜像
FROM m.daocloud.io/openjdk:11-jdk-slim AS builder

# 指定构建模块
ARG MODULE=eden-demo-cola-start

# 设置工作目录
WORKDIR /app

# 复制必要文件
COPY $MODULE/target/$MODULE.jar application.jar
COPY docker/entrypoint.sh entrypoint.sh

# 使用 Spring Boot 的分层模式提取 JAR 文件的依赖项
RUN java -Djarmode=layertools -jar application.jar extract

# 创建容器镜像
FROM m.daocloud.io/openjdk:11-jdk-slim

# 定义元数据
LABEL maintainer="梦想歌 <shiyindaxiaojie@gmail.com>"
LABEL version="1.0.0"

# 指定构建参数
ARG USER=tmpuser
ARG GROUP=tmpgroup

# 设置环境变量
ENV HOME="/app"
ENV TZ="Asia/Shanghai"
ENV LANG="C.UTF-8"
ENV XMS="1g"
ENV XMX="1g"
ENV XSS="256k"
ENV GC_MODE="G1"
ENV USE_GC_LOG="Y"
ENV USE_HEAP_DUMP="Y"
ENV USE_LARGE_PAGES="N"
ENV SPRING_PROFILES_ACTIVE="dev"
ENV SERVER_PORT="8080"
ENV MANAGEMENT_SERVER_PORT="9080"

# 创建日志目录
RUN mkdir -p $HOME/logs \
  && touch $HOME/logs/entrypoint.out \
  && ln -sf /dev/stdout $HOME/logs/entrypoint.out \
  && ln -sf /dev/stderr $HOME/logs/entrypoint.out

# 切换工作目录
WORKDIR $HOME

# 从基础镜像复制应用程序依赖项和模块
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader ./
COPY --from=builder /app/organization-dependencies ./
COPY --from=builder /app/modules-dependencies ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./
COPY --from=builder /app/entrypoint.sh ./

# 创建普通用户
RUN groupadd -g 1000 $GROUP \
  && useradd -u 1000 -g $GROUP -d $HOME -s /bin/bash $USER \
  && chown -R $USER:$GROUP $HOME \
  && chmod -R a+rwX $HOME

# 切换到容器用户
USER $USER

# 暴露访问端口
EXPOSE $SERVER_PORT $MANAGEMENT_SERVER_PORT

# 设置启动入口
CMD ["./entrypoint.sh"]
```

在根目录执行 Docker 指令完成构建。

```bash
docker build -f docker/Dockerfile -t shiyindaxiaojie/eden-demo-cola .
docker push shiyindaxiaojie/eden-demo-cola
```

## 自定义 Maven 配置文件

由于笔者直接使用 CODING 节点托管部署，无法了解服务器内部的 Maven 细节，并且，Maven 的环境变动可能会影响整个构建计划不可用，因此，建议自定义 `settings.xml` 来控制您的应用。

首先，使用 `-s` 选项指定项目 `.coding` 目录的 `settings.xml` 文件。

```bash
mvn package -DskipTests -T 4C -s ./.coding/settings.xml
```

Maven 配置文件的内容统一使用 `${env.xxx}` 变量，表示通过 CODING 的脚本传递环境变量，代码片段如下。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings>
	<servers>
		<server>
			<id>coding</id>
			<username>${env.MAVEN_USERNAME}</username>
			<password>${env.MAVEN_PASSWORD}</password>
		</server>
	</servers>
	<profiles>
		<profile>
			<id>coding</id>
			<properties>
				<docker.username>${env.DOCKER_USERNAME}</docker.username>
				<docker.password>${env.DOCKER_PASSWORD}</docker.password>
				<docker.image>${env.DOCKER_IMAGE}</docker.image>
				<altReleaseDeploymentRepository>
					coding::default::${env.MAVEN_REPO_URL}
				</altReleaseDeploymentRepository>
				<altSnapshotDeploymentRepository>
					coding::default::${env.MAVEN_REPO_URL}
				</altSnapshotDeploymentRepository>
			</properties>
			<repositories>
				<repository>
					<id>coding</id>
					<url>${env.MAVEN_REPO_URL}</url>
					<releases>
						<enabled>true</enabled>
					</releases>
					<snapshots>
						<enabled>true</enabled>
					</snapshots>
				</repository>
			</repositories>
			<pluginRepositories>
				<pluginRepository>
					<id>coding</id>
					<url>${env.MAVEN_REPO_URL}</url>
					<releases>
						<enabled>true</enabled>
					</releases>
					<snapshots>
						<enabled>false</enabled>
					</snapshots>
				</pluginRepository>
			</pluginRepositories>
		</profile>
	</profiles>
	<activeProfiles>
		<activeProfile>coding</activeProfile>
	</activeProfiles>
</settings>
```

对应的 CODING 流水线传递相关变量到 `settings.xml`。

```groovy
stage('推送到 Maven 制品库') {
  steps {
    withCredentials([
      usernamePassword(
        credentialsId: env.MAVEN_RELEASES,
        usernameVariable: 'MAVEN_RELEASES_USERNAME',
        passwordVariable: 'MAVEN_RELEASES_PASSWORD'
      ),
      usernamePassword(
        credentialsId: env.MAVEN_SNAPSHOTS,
        usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME',
        passwordVariable: 'MAVEN_SNAPSHOTS_PASSWORD'
      )
    ]) {
      withEnv([
        "MAVEN_RELEASES_ID=${MAVEN_RELEASES_ID}",
        "MAVEN_RELEASES_URL=${MAVEN_RELEASES_URL}",
        "MAVEN_RELEASES_USERNAME=${MAVEN_RELEASES_USERNAME}",
        "MAVEN_RELEASES_PASSWORD=${MAVEN_RELEASES_PASSWORD}",
        "MAVEN_SNAPSHOTS_ID=${MAVEN_SNAPSHOTS_ID}",
        "MAVEN_SNAPSHOTS_URL=${MAVEN_SNAPSHOTS_URL}",
        "MAVEN_SNAPSHOTS_USERNAME=${MAVEN_SNAPSHOTS_USERNAME}",
        "MAVEN_SNAPSHOTS_PASSWORD=${MAVEN_SNAPSHOTS_PASSWORD}"
      ]) {
        sh 'mvn -T 4C -Pcoding deploy -DskipTests -s ./.coding/settings.xml'
      }
    }
  }
}
```

## 设置 Docker 和 Maven 凭据

使用项目凭据来替换 CODING 脚本所需的 Docker/Maven 账户信息，减少维护凭据的工作，允许多个构建计划复用同一个凭据。同时防止构建计划泄露账户信息，特别是多人协作部署。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-set-credential.png)

录入凭据后，在构建计划的 `变量与缓存` 选择相关凭据。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-select-credential.png)

## 编排 Jenkinsfile 脚本

> 由于 CODING 目前没有实现 Jenkinsfile 脚本的版本控制，为防止误删配置导致整个构建计划不可用，笔者的做法是把 Jenkinsfile 脚本保存到工程 `.coding` 目录下，使用 `Git` 完成版本控制。

在 `.coding` 目录提供了开箱即用的 Jenkinsfile，包含编译打包、单元测试、发布私服、推送镜像等步骤，完整代码如下。

```groovy
pipeline {
  agent any
	environment {
	  MAVEN_SNAPSHOTS_NAME = "maven-snapshots"
		MAVEN_SNAPSHOTS_ID = "${CCI_CURRENT_TEAM}-${PROJECT_NAME}-${MAVEN_SNAPSHOTS_NAME}"
    MAVEN_SNAPSHOTS_URL = "${CCI_CURRENT_WEB_PROTOCOL}://${CCI_CURRENT_TEAM}-maven.pkg.${CCI_CURRENT_DOMAIN}/repository/${PROJECT_NAME}/${MAVEN_SNAPSHOTS_NAME}/"

	  MAVEN_RELEASES_NAME = "maven-releases"
		MAVEN_RELEASES_ID = "${CCI_CURRENT_TEAM}-${PROJECT_NAME}-${MAVEN_RELEASES_NAME}"
    MAVEN_RELEASES_URL = "${CCI_CURRENT_WEB_PROTOCOL}://${CCI_CURRENT_TEAM}-maven.pkg.${CCI_CURRENT_DOMAIN}/repository/${PROJECT_NAME}/${MAVEN_RELEASES_NAME}/"

	  MAVEN_SNAPSHOTS_NAME = "maven-snapshots"
	  MAVEN_RELEASES_NAME = "maven-releases"
	  DOCKER_REPOSITORY_NAME = "docker"

		MAVEN_SNAPSHOTS_ID = "${CCI_CURRENT_TEAM}-${PROJECT_NAME}-${MAVEN_SNAPSHOTS_NAME}"
		MAVEN_SNAPSHOTS_URL = "${CCI_CURRENT_WEB_PROTOCOL}://${CCI_CURRENT_TEAM}-maven.pkg.${CCI_CURRENT_DOMAIN}/repository/${PROJECT_NAME}/${MAVEN_SNAPSHOTS_NAME}/"
		MAVEN_RELEASES_ID = "${CCI_CURRENT_TEAM}-${PROJECT_NAME}-${MAVEN_RELEASES_NAME}"
		MAVEN_RELEASES_URL = "${CCI_CURRENT_WEB_PROTOCOL}://${CCI_CURRENT_TEAM}-maven.pkg.${CCI_CURRENT_DOMAIN}/repository/${PROJECT_NAME}/${MAVEN_RELEASES_NAME}/"
	  DOCKER_REPOSITORY = "${CCI_CURRENT_TEAM}-docker.pkg.${CCI_CURRENT_DOMAIN}/${PROJECT_NAME}/${DOCKER_REPOSITORY_NAME}"
	}

  stages {
    stage('检出') {
      steps {
        checkout([$class: 'GitSCM',
        branches: [[name: GIT_BUILD_REF]],
        userRemoteConfigs: [[
          url: GIT_REPO_URL,
          credentialsId: CREDENTIALS_ID
        ]]])
      }
    }

    stage('编译') {
      steps {
        script {
          if (env.TAG_NAME ==~ /.*/ ) {
	          ARTIFACT_VERSION = "${env.TAG_NAME}"
          } else if (env.MR_SOURCE_BRANCH ==~ /.*/ ) {
	          ARTIFACT_VERSION = "${env.MR_RESOURCE_ID}-${env.GIT_COMMIT_SHORT}"
          } else {
	          ARTIFACT_VERSION = "${env.BRANCH_NAME.replace('/', '-')}-${env.GIT_COMMIT_SHORT}"
          }
        }
        withCredentials([
            usernamePassword(
                credentialsId: env.MAVEN_RELEASES,
                usernameVariable: 'MAVEN_RELEASES_USERNAME',
                passwordVariable: 'MAVEN_RELEASES_PASSWORD'
            ),
            usernamePassword(
                credentialsId: env.MAVEN_SNAPSHOTS,
                usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME',
                passwordVariable: 'MAVEN_SNAPSHOTS_PASSWORD'
            )
        ]) {
            withEnv([
                "ARTIFACT_VERSION=${ARTIFACT_VERSION}",
                "MAVEN_RELEASES_ID=${MAVEN_RELEASES_ID}",
                "MAVEN_RELEASES_URL=${MAVEN_RELEASES_URL}",
                "MAVEN_RELEASES_USERNAME=${MAVEN_RELEASES_USERNAME}",
                "MAVEN_RELEASES_PASSWORD=${MAVEN_RELEASES_PASSWORD}",
                "MAVEN_SNAPSHOTS_ID=${MAVEN_SNAPSHOTS_ID}",
                "MAVEN_SNAPSHOTS_URL=${MAVEN_SNAPSHOTS_URL}",
                "MAVEN_SNAPSHOTS_USERNAME=${MAVEN_SNAPSHOTS_USERNAME}",
                "MAVEN_SNAPSHOTS_PASSWORD=${MAVEN_SNAPSHOTS_PASSWORD}"
            ]) {
                sh 'mvn -T 4C -U -Pcoding versions:set -DnewVersion=${ARTIFACT_VERSION} package -DskipTests -s ./.coding/settings.xml'
            }
        }
      }
    }

    stage('单元测试') {
        steps {
            withCredentials([
                usernamePassword(
                    credentialsId: env.MAVEN_RELEASES,
                    usernameVariable: 'MAVEN_RELEASES_USERNAME',
                    passwordVariable: 'MAVEN_RELEASES_PASSWORD'
                ),
                usernamePassword(
                    credentialsId: env.MAVEN_SNAPSHOTS,
                    usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME',
                    passwordVariable: 'MAVEN_SNAPSHOTS_PASSWORD'
                )
            ]) {
                withEnv([
                    "MAVEN_RELEASES_ID=${MAVEN_RELEASES_ID}",
                    "MAVEN_RELEASES_URL=${MAVEN_RELEASES_URL}",
                    "MAVEN_RELEASES_USERNAME=${MAVEN_RELEASES_USERNAME}",
                    "MAVEN_RELEASES_PASSWORD=${MAVEN_RELEASES_PASSWORD}",
                    "MAVEN_SNAPSHOTS_ID=${MAVEN_SNAPSHOTS_ID}",
                    "MAVEN_SNAPSHOTS_URL=${MAVEN_SNAPSHOTS_URL}",
                    "MAVEN_SNAPSHOTS_USERNAME=${MAVEN_SNAPSHOTS_USERNAME}",
                    "MAVEN_SNAPSHOTS_PASSWORD=${MAVEN_SNAPSHOTS_PASSWORD}"
                ]) {
                    sh 'mvn -T 4C -Pcoding,unit-test test -s ./.coding/settings.xml'
                }
            }
        }
        post {
            always {
                junit '**/surefire-reports/*.xml'
                codingHtmlReport(name: 'eden-demo-cola-adapter-jacoco-reports', tag: '代码覆盖率报告', path: 'eden-demo-cola-adapter/target/site/jacoco', entryFile: 'index.html')
                codingHtmlReport(name: 'eden-demo-cola-app-jacoco-reports', tag: '代码覆盖率报告', path: 'eden-demo-cola-app/target/site/jacoco', entryFile: 'index.html')
                codingHtmlReport(name: 'eden-demo-cola-infrastructure-jacoco-reports', tag: '代码覆盖率报告', path: 'eden-demo-cola-infrastructure/target/site/jacoco', entryFile: 'index.html')
            }
		}
    }

    stage('推送到 Maven 制品库') {
      steps {
        withCredentials([
            usernamePassword(
                credentialsId: env.MAVEN_RELEASES,
                usernameVariable: 'MAVEN_RELEASES_USERNAME',
                passwordVariable: 'MAVEN_RELEASES_PASSWORD'
            ),
            usernamePassword(
                credentialsId: env.MAVEN_SNAPSHOTS,
                usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME',
                passwordVariable: 'MAVEN_SNAPSHOTS_PASSWORD'
            )
        ]) {
            withEnv([
                "MAVEN_RELEASES_ID=${MAVEN_RELEASES_ID}",
                "MAVEN_RELEASES_URL=${MAVEN_RELEASES_URL}",
                "MAVEN_RELEASES_USERNAME=${MAVEN_RELEASES_USERNAME}",
                "MAVEN_RELEASES_PASSWORD=${MAVEN_RELEASES_PASSWORD}",
                "MAVEN_SNAPSHOTS_ID=${MAVEN_SNAPSHOTS_ID}",
                "MAVEN_SNAPSHOTS_URL=${MAVEN_SNAPSHOTS_URL}",
                "MAVEN_SNAPSHOTS_USERNAME=${MAVEN_SNAPSHOTS_USERNAME}",
                "MAVEN_SNAPSHOTS_PASSWORD=${MAVEN_SNAPSHOTS_PASSWORD}"
            ]) {
                sh 'mvn -T 4C -Pcoding deploy -DskipTests -s ./.coding/settings.xml'
            }
        }
      }
    }

    stage('推送到 Docker 制品库') {
        steps {
            withCredentials([
                usernamePassword(
                    credentialsId: env.DOCKER_REGISTRY_CREDENTIALS_ID,
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )
            ]) {
                withEnv([
                    "DOCKER_USERNAME=${DOCKER_USERNAME}",
        "DOCKER_PASSWORD=${DOCKER_PASSWORD}"
            ]) {
                sh "docker login ${DOCKER_REPOSITORY} -u ${DOCKER_USERNAME} -p ${DOCKER_PASSWORD}"
                sh "docker build -t ${DOCKER_REPOSITORY}/${DEPOT_NAME}:${ARTIFACT_VERSION} -f docker/Dockerfile ."
                sh "docker push ${DOCKER_REPOSITORY}/${DEPOT_NAME}:${ARTIFACT_VERSION}"
                sh "docker push ${DOCKER_REPOSITORY}/${DEPOT_NAME}:latest"
            }
        }
        }
    }
  }
}
```

如果您不熟悉 Jenkinsfile 的语法，可以复制上述代码，切换到 CODING 图形化视角，进入可视化模式调整。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-edit-visualization.png)

编辑好 Jenkinsfile 文件后保存，点击 `立即构建`，触发流水线即可。接下来，笔者根据 Jenkinsfile 内容中的关键代码块进行讲解。

### 自定义检出 Git 代码

正常情况下，我们是一对一检出 Git 仓库。

```groovy
stage('检出') {
  steps {
    checkout([$class: 'GitSCM',
    branches: [[name: GIT_BUILD_REF]],
    userRemoteConfigs: [[
      url: GIT_REPO_URL,
      credentialsId: CREDENTIALS_ID
    ]]])
  }
}
```

有些特殊场景，需要同时检出多个 Git 仓库，详见下述代码片段。不过，这样做会导致您无法有效控制 Git 自动触发。

```groovy
stage('检出') {
  parallel { // 开启并行构建
    stage('检出 eden-gateway') {
      steps {
        dir('eden-gateway') {
          checkout([$class: 'GitSCM',
          branches: [[name: env.EDEN_GATEWAY_VERSION]],
          userRemoteConfigs: [[
            url: env.EDEN_GATEWAY_GIT_URL,
            credentialsId: CREDENTIALS_ID
          ]]])
          script {
            // ...
          }
        }
      }
    }

    stage('检出 eden-uaa') {
      steps {
        dir('eden-uaa') {
          checkout([$class: 'GitSCM',
          branches: [[name: env.EDEN_UAA_VERSION]],
          userRemoteConfigs: [[
            url: env.EDEN_UAA_GIT_URL,
            credentialsId: CREDENTIALS_ID
          ]]])
          script {
            // ...
          }
        }
      }
    } 
  }  
}                                                                 
```

### 设置 Maven 魔法版本号

CODING 内置了一系列丰富的环境变量，您可以通过 `${env.TAG_NAME}` 或者 `${env.BRANCH_NAME}` 获取 Git 的版本号，使用 `versions-maven-plugin` 执行 `mvn versions:set -DnewVersion=${VERSION}` 动态设置 Maven 模块的版本号。

```groovy
stage('编译') {
  steps {
    script {
      if (env.TAG_NAME ==~ /.*/ ) {
        ARTIFACT_VERSION = "${env.TAG_NAME}"
      } else if (env.MR_SOURCE_BRANCH ==~ /.*/ ) {
        ARTIFACT_VERSION = "${env.MR_RESOURCE_ID}-${env.GIT_COMMIT_SHORT}"
      } else {
        ARTIFACT_VERSION = "${env.BRANCH_NAME.replace('/', '-')}-${env.GIT_COMMIT_SHORT}"
      }
    }
    withCredentials([
      usernamePassword(
        credentialsId: env.MAVEN_RELEASES,
        usernameVariable: 'MAVEN_RELEASES_USERNAME',
        passwordVariable: 'MAVEN_RELEASES_PASSWORD'
      ),
      usernamePassword(
        credentialsId: env.MAVEN_SNAPSHOTS,
        usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME',
        passwordVariable: 'MAVEN_SNAPSHOTS_PASSWORD'
      )
    ]) {
      withEnv([
        "ARTIFACT_VERSION=${ARTIFACT_VERSION}",
        "MAVEN_RELEASES_ID=${MAVEN_RELEASES_ID}",
        "MAVEN_RELEASES_URL=${MAVEN_RELEASES_URL}",
        "MAVEN_RELEASES_USERNAME=${MAVEN_RELEASES_USERNAME}",
        "MAVEN_RELEASES_PASSWORD=${MAVEN_RELEASES_PASSWORD}",
        "MAVEN_SNAPSHOTS_ID=${MAVEN_SNAPSHOTS_ID}",
        "MAVEN_SNAPSHOTS_URL=${MAVEN_SNAPSHOTS_URL}",
        "MAVEN_SNAPSHOTS_USERNAME=${MAVEN_SNAPSHOTS_USERNAME}",
        "MAVEN_SNAPSHOTS_PASSWORD=${MAVEN_SNAPSHOTS_PASSWORD}"
      ]) {
        sh 'mvn -T 4C -U -Pcoding versions:set -DnewVersion=${ARTIFACT_VERSION} package -DskipTests -s ./.coding/settings.xml'
      }
    }
  }
}
```

### Java 测试报告可视化

CODING 提供了测试报告的可视化支持，下述代码片段提供了**单元测试**和**代码覆盖率分析**的配置示例。

```groovy
stage('单元测试') {
  steps {
    withCredentials([
      usernamePassword(
        credentialsId: env.MAVEN_RELEASES,
        usernameVariable: 'MAVEN_RELEASES_USERNAME',
        passwordVariable: 'MAVEN_RELEASES_PASSWORD'
      ),
      usernamePassword(
        credentialsId: env.MAVEN_SNAPSHOTS,
        usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME',
        passwordVariable: 'MAVEN_SNAPSHOTS_PASSWORD'
      )
    ]) {
      withEnv([
        "MAVEN_RELEASES_ID=${MAVEN_RELEASES_ID}",
        "MAVEN_RELEASES_URL=${MAVEN_RELEASES_URL}",
        "MAVEN_RELEASES_USERNAME=${MAVEN_RELEASES_USERNAME}",
        "MAVEN_RELEASES_PASSWORD=${MAVEN_RELEASES_PASSWORD}",
        "MAVEN_SNAPSHOTS_ID=${MAVEN_SNAPSHOTS_ID}",
        "MAVEN_SNAPSHOTS_URL=${MAVEN_SNAPSHOTS_URL}",
        "MAVEN_SNAPSHOTS_USERNAME=${MAVEN_SNAPSHOTS_USERNAME}",
        "MAVEN_SNAPSHOTS_PASSWORD=${MAVEN_SNAPSHOTS_PASSWORD}"
      ]) {
        sh 'mvn -T 4C -Pcoding,unit-test test -s ./.coding/settings.xml'
      }
    }
  }
  post {
    always {
      junit '**/surefire-reports/*.xml' // 单元测试报告
      codingHtmlReport(name: 'eden-demo-cola-adapter-jacoco-reports', tag: '代码覆盖率报告', path: 'eden-demo-cola-adapter/target/site/jacoco', entryFile: 'index.html')
      codingHtmlReport(name: 'eden-demo-cola-app-jacoco-reports', tag: '代码覆盖率报告', path: 'eden-demo-cola-app/target/site/jacoco', entryFile: 'index.html')
      codingHtmlReport(name: 'eden-demo-cola-infrastructure-jacoco-reports', tag: '代码覆盖率报告', path: 'eden-demo-cola-infrastructure/target/site/jacoco', entryFile: 'index.html')
    }
  }
}
```

在构建记录中，点击 `测试报告` 页签，查看单元测试报告。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-unit-test-report.png) 

从 `通用报告` 查看代码覆盖率报告。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-code-coverage-report.png) 

### 发布制品到 Maven 仓库

多人协同下，需要把构建生成的 API 依赖发布到私服（制品库）。在此之前我们已经配置好了 Maven 私服地址和相关凭据，具体可以参考下面的代码片段。

```groovy
stage('推送到 Maven 制品库') {
  steps {
    withCredentials([
      usernamePassword(
        credentialsId: env.MAVEN_RELEASES,
        usernameVariable: 'MAVEN_RELEASES_USERNAME',
        passwordVariable: 'MAVEN_RELEASES_PASSWORD'
      ),
      usernamePassword(
        credentialsId: env.MAVEN_SNAPSHOTS,
        usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME',
        passwordVariable: 'MAVEN_SNAPSHOTS_PASSWORD'
      )
    ]) {
      withEnv([
        "MAVEN_RELEASES_ID=${MAVEN_RELEASES_ID}",
        "MAVEN_RELEASES_URL=${MAVEN_RELEASES_URL}",
        "MAVEN_RELEASES_USERNAME=${MAVEN_RELEASES_USERNAME}",
        "MAVEN_RELEASES_PASSWORD=${MAVEN_RELEASES_PASSWORD}",
        "MAVEN_SNAPSHOTS_ID=${MAVEN_SNAPSHOTS_ID}",
        "MAVEN_SNAPSHOTS_URL=${MAVEN_SNAPSHOTS_URL}",
        "MAVEN_SNAPSHOTS_USERNAME=${MAVEN_SNAPSHOTS_USERNAME}",
        "MAVEN_SNAPSHOTS_PASSWORD=${MAVEN_SNAPSHOTS_PASSWORD}"
      ]) {
        sh 'mvn -T 4C -Pcoding deploy -DskipTests -s ./.coding/settings.xml'
      }
    }
  }
}
```

Maven 私服应当严格区分 `Releases` 和 `Snapshots` 仓库。

在开发测试阶段，需要利用 Maven 的快照更新维持 API 的变动，使用 `Snapshots` 仓库比较合适。

在预发布阶段，表示测试已通过，可以发布生产了，API 不允许有变动，应当严格使用 `Releases` 仓库来限制版本的发布，避免相同版本的 API 被覆盖。

在 CODING 制品库，您可以在 `Releases` 仓库设置版本策略为禁止覆盖版本。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-repo-deny-same-verison.png) 

### 推送镜像到 Docker 仓库

本文中，笔者使用 Docker Hub 托管镜像，代码中的变量，在设置凭据的小节已详细说明，您可以根据实际情况进行调整。

```groovy
stage('推送到 Docker 制品库') {
  steps {
    withCredentials([
      usernamePassword(
        credentialsId: env.DOCKER_CREDENTIALS,
        usernameVariable: 'DOCKER_USERNAME',
        passwordVariable: 'DOCKER_PASSWORD'
      )
    ]) {
      withEnv([
        "DOCKER_USERNAME=${DOCKER_USERNAME}",
        "DOCKER_PASSWORD=${DOCKER_PASSWORD}",
        "DOCKER_IMAGE=${DOCKER_REPOSITORY}:${ARTIFACT_VERSION}"
      ]) {
        sh 'mvn -Pcoding -pl eden-demo-cola-start jib:build -Djib.disableUpdateChecks=true -DskipTests -s ./.coding/settings.xml'
      }
    }
  }
}
```

执行上述代码后，在 DockerHub 查看镜像已更新，验证通过。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-upload-image-successed.png) 

### 更新镜像到 K8s 集群

CODING 支持配置镜像更新到 K8s 已部署的工作负载。

```groovy
stage('部署到 K8s 集群') {
  steps {
    withEnv(["DOCKER_IMAGE=${DOCKER_REPOSITORY}:${ARTIFACT_VERSION}"]) {
      cdDeploy(deployType: 'PATCH_IMAGE', application: '${CCI_CURRENT_TEAM}', pipelineName: '${PROJECT_NAME}-${CCI_JOB_NAME}-5001969', image: '${DOCKER_IMAGE}', cloudAccountName: 'test', namespace: 'test', manifestType: 'Deployment', manifestName: 'demo-cola', containerName: 'demo-cola', credentialId: 'a2954a785e1d40caa1803274a23edac9', personalAccessToken: '${CD_PERSONAL_ACCESS_TOKEN}')
    }
  }
}
```

在 CODING 的 `持续部署` > `弹性伸缩` > `配置云账号` 添加 K8s 凭据，绑定需要部署的 K8s 集群。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-bind-kubernetes-cluster.png) 

在 CODING 构建计划编排界面配置 `镜像更新`，选择上述已绑定的 K8s 集群，根据级联选择到具体的 Pod 容器。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-select-kubernetes-cluster.png) 

点击构建，查看镜像更新执行记录。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-deploy-kubernetes-log.png) 

除了控制台输出，也可以点击查看 K8s 发布详情。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-deploy-kubernetes-detail.png) 

查看 K8s 集群（笔者使用腾讯云 Serveless 集群部署），启动成功！

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-deploy-kubernetes-app-log.png) 

访问控制台输出的 External Access URL 地址，系统访问正常。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-deploy-kubernetes-app-ui.png) 

### 前端项目怎么构建？

以开源的若依项目（Vue）为例，在代码目录下分别创建以下目录：

```bash
eden-ui
  |_ .coding/
    |_ Jenkinsfile # CODING 流水线脚本
    |_ nginx.conf # Nginx 配置文件
  |_ docker/
    |_ Dockerfile # Docker 构建文件
  |_ ...
  |_ .npmrc
```

初始化 `.npmrc`，代理 npm 源，指向 CODING 制品库。

```bash
registry=https://xxx-npm.pkg.coding.net/xxx/npm/
always-auth=true
//xxx-npm.pkg.coding.net/xxx/npm/:username=${CODING_ARTIFACTS_USERNAME}
//xxx-npm.pkg.coding.net/xxx/npm/:_password=${CODING_ARTIFACTS_PASSWORD}
//xxx-npm.pkg.coding.net/xxx/npm/:email=xxx@gmail.com
```

为了让前端单独运行，需要依赖 Nginx 的镜像进行部署，所以，我们要把 nginx 的配置也加上，`nginx.conf` 配置如下。

```bash
user  nginx;
worker_processes  1;

error_log  logs/error.log warn;
pid        logs/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  logs/access.log  main;
    sendfile        on;
    keepalive_timeout  65;
    client_max_body_size   500m;

    server {
        listen       80;
        server_name  localhost;
        charset utf-8;

        gzip_static on;
        gzip_vary on;
        gzip_min_length 1k;
        gzip_comp_level 9;
        gzip_types text/css text/javascript application/javascript application/x-javascript application/xml;
        gzip_disable "MSIE [1-6]\.";

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   /usr/share/nginx/html;
        }

        location / { # 前端
            root   /usr/share/nginx/html;
            index  index.html index.htm;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location ^~ /api/  { # 后端
            proxy_pass http://xxx:8080/; 
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

调整 Dockerfile 打包脚本，指定 Vue 项目打包后的静态资源到 Nginx 的静态资源目录中。

```bash
FROM nginx:1.15.2-alpine

LABEL maintainer="梦想歌"

COPY dist/ /usr/share/nginx/html

COPY .coding/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

编写 Jenkinsfile 构建脚本，参考如下内容。

```groovy
pipeline {
    agent any
    environment {
        CODING_DOCKER_REPO_NAME = "docker"
        CODING_DOCKER_REPO_HOST = "${CCI_CURRENT_TEAM}-docker.pkg.${CCI_CURRENT_DOMAIN}"
        CODING_DOCKER_REPO_URL = "${CODING_DOCKER_REPO_HOST}/${PROJECT_NAME}/${CODING_DOCKER_REPO_NAME}/${DEPOT_NAME}"

        TCR_NAMESPACE_NAME = "xxx"
        TCR_DOCKER_REPO_URL = "shjrccr.ccs.tencentyun.com/${TCR_NAMESPACE_NAME}/${DEPOT_NAME}"
    }
    stages {
        stage('检出') {
            steps {
                checkout([$class: 'GitSCM',
                branches: [[name: GIT_BUILD_REF]],
                userRemoteConfigs: [[
                url: GIT_REPO_URL,
                credentialsId: CREDENTIALS_ID
                ]]])
            }
        }
        stage('编译') {
            steps {
                script {
                    if (env.TAG_NAME ==~ /.*/ ) {
                        CODING_ARTIFACT_VERSION = "${env.TAG_NAME}"
                    } else if (env.MR_SOURCE_BRANCH ==~ /.*/ ) {
                        CODING_ARTIFACT_VERSION = "mr-${env.MR_RESOURCE_ID}-${env.GIT_COMMIT_SHORT}"
                    } else {
                        CODING_ARTIFACT_VERSION = "${env.BRANCH_NAME.replace('/', '-')}-${env.GIT_COMMIT_SHORT}"
                    }
                }
                sh 'rm -rf /usr/lib/node_modules/npm/'
                dir ('/root/.cache/downloads') {
                    sh 'wget -nc "https://coding-public-generic.pkg.coding.net/public/downloads/node-linux-x64.tar.xz?version=v16.13.0" -O node-v16.13.0-linux-x64.tar.xz | true'
                    sh 'tar -xf node-v16.13.0-linux-x64.tar.xz -C /usr --strip-components 1'
                }
                withCredentials([
                    usernamePassword(
                        credentialsId: env.CODING_ARTIFACTS_CREDENTIALS_ID,
                        usernameVariable: 'CODING_ARTIFACTS_USERNAME',
                        passwordVariable: 'CODING_ARTIFACTS_PASSWORD'
                    )]) {
                    script {
                        sh '''
                        echo "CODING_ARTIFACTS_USERNAME=${CODING_ARTIFACTS_USERNAME}" >> $CI_ENV_FILE
                        echo "CODING_ARTIFACTS_PASSWORD=${CODING_ARTIFACTS_PASSWORD}" >> $CI_ENV_FILE
                        '''
                        readProperties(file: env.CI_ENV_FILE).each {
                            key, value -> env[key] = value 
                        }
                    }
                    sh 'npm install'
                    sh 'npm run build:prod'
                }
            }
        }
        stage('推送到 Docker 制品库') {
            steps {
                withEnv([
                    "DOCKER_USERNAME=${DOCKER_USERNAME}",
                    "DOCKER_PASSWORD=${DOCKER_PASSWORD}",
                    "DOCKER_IMAGE=${TCR_DOCKER_REPO_URL}:${CODING_ARTIFACT_VERSION}"
                ]) {
                    sh 'docker login --username=${DOCKER_USERNAME} --password=${DOCKER_PASSWORD} shjrccr.ccs.tencentyun.com'
                    sh 'docker build -t ${DOCKER_IMAGE} .'
                    sh 'docker tag ${DOCKER_IMAGE} ${DOCKER_IMAGE}'
                    sh 'docker push ${DOCKER_IMAGE}'
                }
            }
        }
        stage('部署到 K8s 集群') {
            steps {
                withEnv(["DOCKER_IMAGE=${TCR_DOCKER_REPO_URL}:${CODING_ARTIFACT_VERSION}"]) {
                    cdDeploy(deployType: 'PATCH_IMAGE', application: '${CCI_CURRENT_TEAM}', pipelineName: '${PROJECT_NAME}-${CCI_JOB_NAME}-202222222', image: '${DOCKER_IMAGE}', cloudAccountName: 'xxx-k8s-test', namespace: 'test', manifestType: 'Deployment', manifestName: 'xxx-client', containerName: 'xxx-client', credentialId: 'aaaaaaaaaaaaaaaaaaaaaaa', personalAccessToken: '${CD_PERSONAL_ACCESS_TOKEN}')
                }
            }
        }
    }
}
```

构建成功的效果图如下。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-deploy-vue-successed.png) 

# 总结

在公司引入 CODING 后，研发团队和运维团队的工作都发生了很大的变化。研发团队负责 DevOps 的全生命周期管理，不再依赖运维团队，效率提升明显。而运维团队专注于基础设施，如云原生、网络、操作系统的优化，能更有效地处理线上故障。从整体的收益来看，至少节省了两个员工的成本。

CODING 流水线存在一些不足，只提供了单一镜像的更新功能，只能用于已部署的目标，并且不适合多服务批量部署，除非手动写脚本，基于 `kubectl apply` 实现。和腾讯方沟通后，他们告诉笔者，目前有个 **Orbit 云原生应用交付**正在内测，即将上线，可以开放白名单给我们尝试下。

下一期，笔者将介绍 CODING Orbit 云原生应用交付。