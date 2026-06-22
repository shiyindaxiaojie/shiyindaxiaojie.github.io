---
title: KubeSphere Continuous Integration Practice
date: 2024-08-10
description: KubeSphere DevOps can basically achieve CI/CD functionality, but features aren't very complete.
tags:
  - KubeSphere
  - CI/CD
  - DevOps
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/KubeSphere.png
---

# Background

While setting up a KubeSphere cluster, I discovered that KubeSphere console provides built-in DevOps visualization tools for quickly building CI/CD pipelines. Since official documentation lacked detailed instructions, I decided to explore KubeSphere DevOps through hands-on practice.

# Objective

Explore whether KubeSphere DevOps can meet the development team's CI/CD requirements.

# Steps

## Create DevOps Project

Create your application in `Workbench` > `Projects` > `Pipelines`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-project.png)

Select pipeline. KubeSphere provides single-branch and multi-branch build methods.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-project-form1.png)

Set build parameters and trigger rules.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-project-form2.png)

## Edit Pipeline

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-pipeline.png)

KubeSphere's visual interface isn't very complete. After debugging, I wrote the following script. If you're familiar with Jenkinsfile syntax, you can write Jenkinsfile directly in the pipeline editing interface.

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
              usernameVariable: 'MAVEN_RELEASES_USERNAME',
              passwordVariable: 'MAVEN_RELEASES_PASSWORD'
            ),
            usernamePassword(
              credentialsId: 'maven-snapshots',
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
                  usernameVariable: 'MAVEN_RELEASES_USERNAME',
                  passwordVariable: 'MAVEN_RELEASES_PASSWORD'
                ),
                usernamePassword(
                  credentialsId: 'maven-snapshots',
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

Click `Run`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-devops-start-pipeline.png)

View deployment logs.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-devops-start-pipeline-log.png)

## Multi-Branch Mode

KubeSphere multi-branch doesn't support visual orchestration or console Jenkinsfile editing - you can only manage Jenkinsfile in project code. Additionally, it doesn't support variables, which is quite limiting.

I created a project named `demo-multi-branches` with script path `.kubesphere/Jenkinsfile`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-mutli-branches.png)

For `.kubesphere/Jenkinsfile` content, refer to the Jenkinsfile above with hardcoded branches.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/kubesphere/kubesphere-create-devops-mutli-branches-status.png)

# Summary

KubeSphere DevOps can basically achieve CI/CD functionality, but features aren't very complete. Single-branch mode doesn't support Git event-triggered pipelines - only Cron triggers. Multi-branch can't be managed in console. May need to wait for authors to gradually optimize.
