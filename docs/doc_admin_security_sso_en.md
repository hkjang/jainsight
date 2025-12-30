# SSO Security

Configure Single Sign-On (SSO) integration for enterprise identity management.

## Supported Protocols

- **SAML 2.0**: Compatible with Okta, Azure AD, OneLogin, etc.
- **OIDC (OpenID Connect)**: Modern standard for Google Workspace, Auth0, etc.

## Configuration

- **IdP Metadata URL**: Automatically import settings from your Identity Provider.
- **Attribute Mapping**: Map IdP attributes (email, department, roles) to Jainsight user profiles.
- **Domain Enforcement**: Force specific email domains (e.g., `@company.com`) to log in via SSO only, disabling password login.

## JIT Provisioning

- **Just-in-Time Creation**: Automatically create user accounts in Jainsight upon their first successful SSO login.
- **Default Group**: Assign new users to a specific permissions group (e.g., "Viewers") by default.
