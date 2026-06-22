---
title: CODING Continuous Deployment Practices
date: 2022-08-10
description: After introducing CODING in the company, the work of the R&D team and the operation and maintenance team has undergone great changes.
tags:
  - CODING
  - CI/CD
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/CODING.png
---

# Background

CODING is a cloud-native application platform provided by Tencent Cloud, offering visual orchestration tools and supporting cloud-native technologies such as GitOps, CI/CD, Helm, and Kubernetes. The company where I work uses Jenkins for building, and the operations team is responsible for managing CI/CD, which is inefficient. Tencent Cloud promoted this product to us, so I decided to take this opportunity to study CODING.

# Goal

Explore the use of CODING pipelines and verify CI/CD capabilities.

# Practical Action

Taking [Demo Project](https://github.com/shiyindaxiaojie/eden-demo-cola) as an example, using `Maven` build tool, the directory structure is as follows.

```bash
eden-demo-cola
  |_ .coding/
    |_ Jenkinsfile # CODING pipeline script
    |_ settings.xml # Custom Maven configuration file
  |_ docker/
    |_ Dockerfile # Docker build file
    |_ entrypoint.sh # Docker container startup script
  |_ ...
  |_ pom.xml # Maven build file
```

## Set Up Git Code Repository

Since my project is mainly hosted on Github, use `Associate Code Repository` to complete the build.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-relate-code-repo.png)

## Select Image Build Tool

> Currently, there are two mainstream ways to build Java images:
>
> 1. Use Google's `jib-maven-plugin` plugin. This method is simple and lightweight and does not need to run in a Docker environment.
> 2. Write a Dockerfile file: relatively high freedom, combined with `spring-boot-maven-plugin` plugin configuration layering.

### Google Jib Plugin Build

Introduce `jib-maven-plugin` plugin in the sub-module `eden-demo-cola-start`.

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
	<description>Startup Entry</description>

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

Use Maven to build and publish the image, the code snippet is as follows:

```bash
mvn -pl eden-demo-cola-start jib:build -Dimage=shiyindaxiaojie/eden-demo-cola -Djib.disableUpdateChecks=true -DskipTests -U -T 4C
```

### Dockerfile Layered Build

If you do not want to introduce Google third-party plugins, you can also refer to the Dockerfile file in the `docker` directory. The code implements image layering, so you can use it with confidence.

```dockerfile
# Use base image
FROM m.daocloud.io/openjdk:11-jdk-slim AS builder

# Specify build module
ARG MODULE=eden-demo-cola-start

# Set working directory
WORKDIR /app

# Copy necessary files
COPY $MODULE/target/$MODULE.jar application.jar
COPY docker/entrypoint.sh entrypoint.sh

# Use Spring Boot's layered mode to extract JAR file dependencies
RUN java -Djarmode=layertools -jar application.jar extract

# Create container image
FROM m.daocloud.io/openjdk:11-jdk-slim

# Define metadata
LABEL maintainer="Dream Song <shiyindaxiaojie@gmail.com>"
LABEL version="1.0.0"

# Specify build arguments
ARG USER=tmpuser
ARG GROUP=tmpgroup

# Set environment variables
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

# Create log directory
RUN mkdir -p $HOME/logs \
  && touch $HOME/logs/entrypoint.out \
  && ln -sf /dev/stdout $HOME/logs/entrypoint.out \
  && ln -sf /dev/stderr $HOME/logs/entrypoint.out

# Switch working directory
WORKDIR $HOME

# Copy application dependencies and modules from the base image
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader ./
COPY --from=builder /app/organization-dependencies ./
COPY --from=builder /app/modules-dependencies ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./
COPY --from=builder /app/entrypoint.sh ./

# Create a normal user
RUN groupadd -g 1000 $GROUP \
  && useradd -u 1000 -g $GROUP -d $HOME -s /bin/bash $USER \
  && chown -R $USER:$GROUP $HOME \
  && chmod -R a+rwX $HOME

# Switch to container user
USER $USER

# Expose access ports
EXPOSE $SERVER_PORT $MANAGEMENT_SERVER_PORT

# Set startup entry
CMD ["./entrypoint.sh"]
```

Execute the Docker command in the root directory to complete the build.

```bash
docker build -f docker/Dockerfile -t shiyindaxiaojie/eden-demo-cola .
docker push shiyindaxiaojie/eden-demo-cola
```

## Custom Maven Configuration File

Since I directly use CODING nodes for hosting deployment, I cannot know the Maven details inside the server, and Maven environment changes may affect the availability of the entire build plan. Therefore, it is recommended to customize `settings.xml` to control your application.

First, use the `-s` option to specify the `settings.xml` file in the project `.coding` directory.

```bash
mvn package -DskipTests -T 4C -s ./.coding/settings.xml
```

The content of the Maven configuration file uniformly uses `${env.xxx}` variables, indicating that environment variables are passed through the CODING script. The code snippet is as follows.

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

The corresponding CODING pipeline passes relevant variables to `settings.xml`.

```groovy
stage('Push to Maven Artifact Repository') {
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

## Set Docker and Maven Credentials

Use project credentials to replace the Docker/Maven account information required by the CODING script, reducing the work of maintaining credentials and allowing multiple build plans to reuse the same credentials. At the same time, it prevents the build plan from leaking account information, especially in multi-person collaborative deployment.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-set-credential.png)

After entering the credentials, select the relevant credentials in the `Variables and Cache` of the build plan.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-select-credential.png)

## Orchestrate Jenkinsfile Script

> Since CODING currently does not implement version control for Jenkinsfile scripts, in order to prevent accidental deletion of configuration leading to the unavailability of the entire build plan, my approach is to save the Jenkinsfile script to the project `.coding` directory and use `Git` for version control.

An out-of-the-box Jenkinsfile is provided in the `.coding` directory, including steps such as compilation and packaging, unit testing, publishing to private repository, and pushing images. The complete code is as follows.

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
    stage('Checkout') {
      steps {
        checkout([$class: 'GitSCM',
        branches: [[name: GIT_BUILD_REF]],
        userRemoteConfigs: [[
          url: GIT_REPO_URL,
          credentialsId: CREDENTIALS_ID
        ]]])
      }
    }

    stage('Compile') {
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

    stage('Unit Test') {
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
                codingHtmlReport(name: 'eden-demo-cola-adapter-jacoco-reports', tag: 'Code Coverage Report', path: 'eden-demo-cola-adapter/target/site/jacoco', entryFile: 'index.html')
                codingHtmlReport(name: 'eden-demo-cola-app-jacoco-reports', tag: 'Code Coverage Report', path: 'eden-demo-cola-app/target/site/jacoco', entryFile: 'index.html')
                codingHtmlReport(name: 'eden-demo-cola-infrastructure-jacoco-reports', tag: 'Code Coverage Report', path: 'eden-demo-cola-infrastructure/target/site/jacoco', entryFile: 'index.html')
            }
		}
    }

    stage('Push to Maven Artifact Repository') {
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

    stage('Push to Docker Artifact Repository') {
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

If you are not familiar with the syntax of Jenkinsfile, you can copy the above code, switch to the CODING graphical view, and enter the visual mode to adjust.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-edit-visualization.png)

After editing the Jenkinsfile, save it, click `Build Now` to trigger the pipeline. Next, I will explain the key code blocks in the Jenkinsfile content.

### Custom Git Code Checkout

Normally, we checkout the Git repository one-to-one.

```groovy
stage('Checkout') {
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

In some special scenarios, you need to checkout multiple Git repositories at the same time, see the following code snippet. However, doing so will cause you to lose effective control over Git automatic triggering.

```groovy
stage('Checkout') {
  parallel { // Enable parallel build
    stage('Checkout eden-gateway') {
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

    stage('Checkout eden-uaa') {
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

### Set Maven Magic Version Number

CODING has built-in a series of rich environment variables. You can obtain the Git version number through `${env.TAG_NAME}` or `${env.BRANCH_NAME}`, and use `versions-maven-plugin` to execute `mvn versions:set -DnewVersion=${VERSION}` to dynamically set the version number of the Maven module.

```groovy
stage('Compile') {
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

### Java Test Report Visualization

CODING provides visualization support for test reports. The following code snippet provides configuration examples for **Unit Test** and **Code Coverage Analysis**.

```groovy
stage('Unit Test') {
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
      junit '**/surefire-reports/*.xml' // Unit test report
      codingHtmlReport(name: 'eden-demo-cola-adapter-jacoco-reports', tag: 'Code Coverage Report', path: 'eden-demo-cola-adapter/target/site/jacoco', entryFile: 'index.html')
      codingHtmlReport(name: 'eden-demo-cola-app-jacoco-reports', tag: 'Code Coverage Report', path: 'eden-demo-cola-app/target/site/jacoco', entryFile: 'index.html')
      codingHtmlReport(name: 'eden-demo-cola-infrastructure-jacoco-reports', tag: 'Code Coverage Report', path: 'eden-demo-cola-infrastructure/target/site/jacoco', entryFile: 'index.html')
    }
  }
}
```

In the build record, click the `Test Report` tab to view the unit test report.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-unit-test-report.png)

View the code coverage report from `General Report`.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-code-coverage-report.png)

### Publish Artifacts to Maven Repository

Under multi-person collaboration, the API dependencies generated by the build need to be published to the private server (artifact repository). Before this, we have configured the Maven private server address and relevant credentials. For details, please refer to the following code snippet.

```groovy
stage('Push to Maven Artifact Repository') {
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

Maven private servers should strictly distinguish between `Releases` and `Snapshots` repositories.

In the development and testing phase, it is appropriate to use the `Snapshots` repository to use snapshot updates to maintain API changes.

In the pre-release phase, indicating that the test has passed and can be released to production, the API is not allowed to change, and the `Releases` repository should be strictly used to limit version release to avoid overwriting the same version of the API.

In the CODING artifact repository, you can set the version policy in the `Releases` repository to prohibit overwriting versions.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-repo-deny-same-verison.png)

### Push Image to Docker Repository

In this article, I use Docker Hub to host images. The variables in the code have been explained in detail in the section on setting credentials. You can adjust them according to the actual situation.

```groovy
stage('Push to Docker Artifact Repository') {
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

After executing the above code, view the image update in DockerHub, verification passed.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-upload-image-successed.png)

### Update Image to K8s Cluster

CODING supports configuring image updates to K8s deployed workloads.

```groovy
stage('Deploy to K8s Cluster') {
  steps {
    withEnv(["DOCKER_IMAGE=${DOCKER_REPOSITORY}:${ARTIFACT_VERSION}"]) {
      cdDeploy(deployType: 'PATCH_IMAGE', application: '${CCI_CURRENT_TEAM}', pipelineName: '${PROJECT_NAME}-${CCI_JOB_NAME}-5001969', image: '${DOCKER_IMAGE}', cloudAccountName: 'test', namespace: 'test', manifestType: 'Deployment', manifestName: 'demo-cola', containerName: 'demo-cola', credentialId: 'a2954a785e1d40caa1803274a23edac9', personalAccessToken: '${CD_PERSONAL_ACCESS_TOKEN}')
    }
  }
}
```

In CODING's `Continuous Deployment` > `Elastic Scaling` > `Configure Cloud Account`, add K8s credentials and bind the K8s cluster that needs to be deployed.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-bind-kubernetes-cluster.png)

Configure `Image Update` in the CODING build plan orchestration interface, select the bound K8s cluster above, and select the specific Pod container according to the cascade.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-select-kubernetes-cluster.png)

Click build and view the image update execution record.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-deploy-kubernetes-log.png)

In addition to the console output, you can also click to view K8s release details.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-deploy-kubernetes-detail.png)

Check the K8s cluster (I use Tencent Cloud Serverless cluster deployment), startup successful!

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-deploy-kubernetes-app-log.png)

Access the External Access URL address output by the console, system access is normal.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-deploy-kubernetes-app-ui.png)

### How to Build Frontend Project?

Taking the open source Ruoyo project (Vue) as an example, create the following directories in the code directory:

```bash
eden-ui
  |_ .coding/
    |_ Jenkinsfile # CODING pipeline script
    |_ nginx.conf # Nginx configuration file
  |_ docker/
    |_ Dockerfile # Docker build file
  |_ ...
  |_ .npmrc
```

Initialize `.npmrc`, proxy npm source, pointing to CODING artifact repository.

```bash
registry=https://xxx-npm.pkg.coding.net/xxx/npm/
always-auth=true
//xxx-npm.pkg.coding.net/xxx/npm/:username=${CODING_ARTIFACTS_USERNAME}
//xxx-npm.pkg.coding.net/xxx/npm/:_password=${CODING_ARTIFACTS_PASSWORD}
//xxx-npm.pkg.coding.net/xxx/npm/:email=xxx@gmail.com
```

In order for the frontend to run independently, we need to rely on the Nginx image for deployment, so we also need to add the nginx configuration. The `nginx.conf` configuration is as follows.

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

        location / { # Frontend
            root   /usr/share/nginx/html;
            index  index.html index.htm;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location ^~ /api/  { # Backend
            proxy_pass http://xxx:8080/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

Adjust the Dockerfile packaging script to specify the static resources after the Vue project is packaged to the static resource directory of Nginx.

```bash
FROM nginx:1.15.2-alpine

LABEL maintainer="Dream Song"

COPY dist/ /usr/share/nginx/html

COPY .coding/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

Write the Jenkinsfile build script, referring to the following content.

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
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
                branches: [[name: GIT_BUILD_REF]],
                userRemoteConfigs: [[
                url: GIT_REPO_URL,
                credentialsId: CREDENTIALS_ID
                ]]])
            }
        }
        stage('Compile') {
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
        stage('Push to Docker Artifact Repository') {
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
        stage('Deploy to K8s Cluster') {
            steps {
                withEnv(["DOCKER_IMAGE=${TCR_DOCKER_REPO_URL}:${CODING_ARTIFACT_VERSION}"]) {
                    cdDeploy(deployType: 'PATCH_IMAGE', application: '${CCI_CURRENT_TEAM}', pipelineName: '${PROJECT_NAME}-${CCI_JOB_NAME}-202222222', image: '${DOCKER_IMAGE}', cloudAccountName: 'xxx-k8s-test', namespace: 'test', manifestType: 'Deployment', manifestName: 'xxx-client', containerName: 'xxx-client', credentialId: 'aaaaaaaaaaaaaaaaaaaaaaa', personalAccessToken: '${CD_PERSONAL_ACCESS_TOKEN}')
                }
            }
        }
    }
}
```

The success effect is as follows.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/coding/coding-pipeline-deploy-vue-successed.png)

# Summary

After introducing CODING in the company, the work of the R&D team and the operation and maintenance team has undergone great changes. The R&D team is responsible for the full lifecycle management of DevOps and no longer relies on the operation and maintenance team, which significantly improves efficiency. The operation and maintenance team focuses on infrastructure, such as optimization of cloud native, network, and operating system, and can more effectively handle online failures. From the perspective of overall benefits, the cost of at least two employees has been saved.

The CODING pipeline has some shortcomings. It only provides the update function of a single image, which can only be used for deployed targets, and is not suitable for multi-service batch deployment, unless you manually write scripts based on `kubectl apply`. After communicating with Tencent, they told me that there is currently an **Orbit Cloud Native Application Delivery** in internal testing, which will be launched soon, and they can open the whitelist for us to try.

In the next issue, I will introduce CODING Orbit Cloud Native Application Delivery.
