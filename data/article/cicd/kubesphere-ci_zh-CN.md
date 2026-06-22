---
title: KubeSphere 持续集成实践
date: 2024-08-10
description: KubeSphere DevOps 基本可以实现 CI/CD 的功能，但是功能不是很完善，单分支模式不支持 Git 事件触发流水线，只能使用 Cron 触发，多分支又不能在...
tags:
  - KubeSphere
  - CI/CD
  - DevOps
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/KubeSphere.png
---

# 背景

笔者在搭建 KubeSphere 集群时，发现 KubeSphere 控制台提供了内置的 DevOps 可视化工具，可以快速搭建 CI/CD 流水线。因官方文档没有详细说明，笔者决定通过实践的方式来研究 KubeSphere DevOps。

# 目标

探索 KubeSphere DevOps 能否满足研发团队的 CI/CD 需求。

# 步骤

## 创建 DevOps 项目

在 `工作台` > `项目` > `流水线` 创建您的应用。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-project.png)

选择流水线，KubeSphere 提供了单分支和多分支构建方式。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-project-form1.png)

设置构建参数和触发器规则。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-project-form2.png)

## 编辑流水线

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-pipeline.png)

KubeSphere 的可视化界面不是特别完善，笔者经过调试后，编写下面的脚本。如果您熟悉 Jenkinsfile 的语法，可以直接在流水线编辑界面中编写 Jenkinsfile。

```groovy
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('Git Checkout') {
      agent none
      steps {
        git(url: 'https://git.code.tencent.com/demo/$APP_NAME', credentialsId: 'git-code', branch: '$BRANCH_NAME', changelog: true, poll: false)
      }
    }

    stage('Maven Package') {
      agent none
      steps {
        container('maven') {
          withCredentials([
                        usernamePassword(
                            credentialsId: 'maven-releases',
                            usernameVariable: 'MAVEN_RELEASES_USERNAME' ,
                            passwordVariable: 'MAVEN_RELEASES_PASSWORD'
                        ),
                        usernamePassword(
                            credentialsId: 'maven-snapshots',
                            usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME' ,
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
                            sh 'mvn -Pcoding versions:set -DnewVersion=$BUILD_VERSION package -DskipTests -s ./.coding/settings.xml'
                        }
                    }
                }
            }
        }

        stage('Parallel') {
            parallel {
                stage('Maven Deploy') {
                    agent none
                    steps {
                        container('maven') {
                            withCredentials([
                                usernamePassword(
                                    credentialsId: 'maven-releases',
                                    usernameVariable: 'MAVEN_RELEASES_USERNAME' ,
                                    passwordVariable: 'MAVEN_RELEASES_PASSWORD'
                                ),
                                usernamePassword(
                                    credentialsId: 'maven-snapshots',
                                    usernameVariable: 'MAVEN_SNAPSHOTS_USERNAME' ,
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
                                    sh 'mvn -Pcoding deploy -DskipTests -s ./.coding/settings.xml'
                                }
                            }
                        }
                    }
                }

                stage('Docker Build') {
                    agent none
                    steps {
                        container('maven') {
                            sh 'docker build -f docker/Dockerfile -t $REGISTRY/$DOCKERHUB_NAMESPACE/$APP_NAME:$BUILD_VERSION-$BUILD_NUMBER .'
                            withCredentials([
                                usernamePassword(
                                    credentialsId: 'harbor-registry',
                                    passwordVariable: 'DOCKER_PASSWORD',
                                    usernameVariable: 'DOCKER_USERNAME'
                                )
                            ]) {
                                sh 'echo "$DOCKER_PASSWORD" | docker login $REGISTRY -u "$DOCKER_USERNAME" --password-stdin'
                                sh 'docker push $REGISTRY/$DOCKERHUB_NAMESPACE/$APP_NAME:$BUILD_VERSION-$BUILD_NUMBER'
                            }
                        }
                    }
                }
            }
        }
    }
  
  environment {
    APP_NAME = 'demo'
    BRANCH_NAME = 'dev'
    BUILD_VERSION = 'dev-SNAPSHOT'
    REGISTRY = '10.2.2.109:30003'
    DOCKERHUB_NAMESPACE = 'demo'
    MAVEN_RELEASES_ID = 'releases'
    MAVEN_RELEASES_URL = 'https://demo-maven.pkg.coding.net/repository/demo/releases/'
    MAVEN_SNAPSHOTS_ID = 'snapshots'
    MAVEN_SNAPSHOTS_URL = 'https://demo-maven.pkg.coding.net/repository/demo/snapshots/'
  }
}
```

点击 `运行`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-devops-start-pipeline.png)

查看部署日志。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-devops-start-pipeline-log.png)

## 多分支模式

KubeSphere 多分支不支持可视化编排，也不支持在控制台编写 Jenkinsfile，只能在项目代码中管理您的 Jenkinsfile 文件，并且，不支持变量，非常鸡肋。

笔者创建了一个名为 `demo-multi-branches` 的项目，指定脚本的路径为 `.kubesphere/Jenkinsfile`。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-mutli-branches.png)

关于 `.kubesphere/Jenkinsfile` 的内容，请参考上述编写的 Jenkinsfile，将分支写死。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-mutli-branches-status.png)

# 总结

KubeSphere DevOps 基本可以实现 CI/CD 的功能，但是功能不是很完善，单分支模式不支持 Git 事件触发流水线，只能使用 Cron 触发，多分支又不能在控制台管理，可能要等作者慢慢优化了。
