# ADR-0003: Jenkins CSRF Protection via Cookie Store

**Date**: 2026-06-22
**Status**: accepted
**Deciders**: AI Agent, User

## Context

Jenkins API requires Cross-Site Request Forgery (CSRF) protection for POST requests (such as `/job/{job_name}/buildWithParameters`). To authenticate a POST request, the client must first fetch a "crumb" from `/crumbIssuer/api/json` and attach it to subsequent requests via the `Jenkins-Crumb` header.
However, Jenkins validates crumbs by associating them with the web session (`JSESSIONID` cookie) generated during the crumb request. If the cookie is not sent back with the crumb in the POST request, Jenkins rejects the request with a `403 Forbidden: No valid crumb was included in the request` error.

## Decision

We decided to enable the `cookie_store` feature in the `reqwest` HTTP client builder within the `jenkins-client` crate. The `JenkinsClient` struct retains a single `reqwest::Client` instance across its lifetime, meaning it persists the `JSESSIONID` cookie between the crumb request and the trigger request.

## Alternatives Considered

### Alternative 1: Disable CSRF protection in Jenkins
- **Pros**: Simplifies the API client significantly. No need to fetch crumbs or store cookies.
- **Cons**: Substantially reduces the security posture of the Jenkins instance. Modern Jenkins versions discourage or actively prevent disabling CSRF.
- **Why not**: Security degradation is unacceptable for a robust enterprise middleware.

### Alternative 2: Use API Tokens instead of username/password
- **Pros**: API Tokens in Jenkins can sometimes bypass the crumb requirement depending on the strictness of the security realm.
- **Cons**: Relies on specific Jenkins configurations that we do not control (e.g., if Strict Crumb Issue is enforced).
- **Why not**: It is brittle and might fail depending on the Jenkins administrator's security settings. Managing cookies is standard and universally supported.

## Consequences

### Positive
- Robust, out-of-the-box compatibility with default Jenkins security settings.
- The `JenkinsClient` automatically manages the session, abstracting this complexity from the business logic.

### Negative
- Requires maintaining the `JenkinsClient` as a stateful, long-lived object (wrapped in `Arc` in our `axum` state).
- Added `cookies` feature flag to `reqwest` dependencies.

### Risks
- If the `JSESSIONID` expires or gets invalidated between the crumb request and the POST request, the call will fail.
- Mitigation: The crumb is fetched immediately before the POST request within the same asynchronous flow, minimizing the window for session invalidation.
