---
title: Jenkins Password Policy Compliance Optimization
date: 2025-03-09
description: Choose the right solution to meet Jenkins password policy requirements.
tags:
  - Jenkins
  - Secondary Development
  - Continuous Integration
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Jenkins.png
---

# Background

Due to SOX project audit, our use of Jenkins open-source version as release tool was flagged - Jenkins password policy doesn't meet basic security requirements: password length must be at least 8 characters, containing uppercase and lowercase letters, numbers, and special characters. Remediation was required.

# Objective

Choose the right solution to meet Jenkins password policy requirements.

# Implementation

## Using 2FA Two-Factor Authentication Plugin

Search for [MFA](https://github.com/jenkinsci/miniorange-two-factor-plugin) in Jenkins plugin management.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/marketplace-2fa.png)

After plugin installation, a new option `2FA Global Configurations` appears in system management.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/open-2fa-configuration.png)

Check `Enable 2FA for all users` and `Mobile Authenticator` in configuration to enable 2FA for all users.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/set-2fa-config.png)

Next, let's test. Go to login page.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/login-page.png)

After entering username and password, a QR code appears. Download Authenticator app on phone and scan.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/authenticator-code.png)

Enter 6-digit dynamic verification code.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/enter-verification-code.png)

Login successful.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/authen-success.png)

One verification code can only be bound to one mobile app. Changing app device requires admin to reset QR code binding from system management.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/allow-user-reset-2fa.png)

The entire process works fine with 2FA plugin, but this plugin is paid and has Jenkins version requirements. Our company's Jenkins version is 2.356, unable to install.

## Based on Jenkins Official Source Code Modification

Directly git clone official source code, find password setting code location.

Modify backend code, path:
`hudson.security.HudsonPrivateSecurityRealm`.

```java
public class HudsonPrivateSecurityRealm extends AbstractPasswordBasedSecurityRealm implements ModelObject, AccessControlled {

    //...
    @Extension @Symbol("password")
        public static final class DescriptorImpl extends UserPropertyDescriptor {
            @NonNull
            @Override
            public String getDisplayName() {
                return Messages.HudsonPrivateSecurityRealm_Details_DisplayName();
            }

            @Override
            public Details newInstance(StaplerRequest req, JSONObject formData) throws FormException {
                // ... existing code ...

                /********** Add password complexity start **********/
                // Validate password complexity
                if (pwd.length() < 8) {
                    throw new FormException("Password must be at least 8 characters long", "user.password");
                }

                // Check if it contains at least one lowercase letter
                if (!pwd.matches(".*[a-z].*")) {
                    throw new FormException("Password must contain at least one lowercase letter", "user.password");
                }

                // Check if it contains at least one uppercase letter
                if (!pwd.matches(".*[A-Z].*")) {
                    throw new FormException("Password must contain at least one uppercase letter", "user.password");
                }

                // Check if it contains at least one digit
                if (!pwd.matches(".*[0-9].*")) {
                    throw new FormException("Password must contain at least one digit", "user.password");
                }

                // Check if it contains at least one special character
                if (!pwd.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
                    throw new FormException("Password must contain at least one special character", "user.password");
                }
                /********** Add password complexity end **********/

                // ... remaining code ...
            }
        }
    }
}
```

Modify page code, path:
`core/src/main/resources/hudson/security/HudsonPrivateSecurityRealm/Details/config.jelly`.

The frontend validation JavaScript checks password strength in real-time and displays hints.

Official source doesn't have Dockerfile. I found corresponding Docker source from Jenkins image:
https://github.com/jenkinsci/docker/blob/2.410/11/centos/centos7/hotspot/Dockerfile.

After resolving image build issues, deployed and tested with following results:

Password length validation:
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/check-password-length.png)

Lowercase letter validation:
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/check-password-lowercase-letter.png)

Uppercase letter validation:
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/check-password-uppercase-letter.png)

Special character validation:
![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/jenkins/check-password-special-character.png)

Verification passed. I've uploaded the modified Jenkins image to Docker Hub:
[https://hub.docker.com/r/shiyindaxiaojie/jenkins](https://hub.docker.com/r/shiyindaxiaojie/jenkins).

If you have version requirements, follow steps above to build image yourself.

# Output

Jenkins is the most common release tool. For security audit requirements mandating basic password policies, we can use 2FA plugin or secondary development. Former requires fees and doesn't support older versions, latter only needs minor modifications.

Code in this article is fully open source. Interested parties can check [jenkins](https://github.com/shiyindaxiaojie/jenkins/tree/feature).
