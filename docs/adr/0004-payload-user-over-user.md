# ADR-0004: PayloadUser Model for PushEvents

**Date**: 2026-06-22
**Status**: accepted
**Deciders**: AI Agent, User

## Context

During the processing of Gitea `PushEvent` webhooks, the system threw JSON deserialization errors in the `gitea-client` crate. The original `Commit` struct expected the `author` and `committer` fields to match the full Gitea `User` model, which includes a mandatory numeric `id` field. However, Git commits often contain users that do not map 1:1 with registered Gitea accounts (e.g., external committers, different email addresses). In these cases, the Gitea webhook payload omits the `id` field, returning only `name`, `email`, and optionally `username`.

## Decision

We decided to introduce a specialized `PayloadUser` struct for the `Commit` model in the `gitea-client` crate, replacing the standard `User` struct for commit authors and committers.

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PayloadUser {
    pub name: String,
    pub email: String,
    pub username: Option<String>,
}
```

## Alternatives Considered

### Alternative 1: Make fields optional in the main `User` model
- **Pros**: Reuses the same struct across the entire project.
- **Cons**: Degrades type safety for API responses where `id` is guaranteed to be present (e.g., `/api/v1/users/{username}`). Requires extensive `unwrap()` or `match` handling in business logic.
- **Why not**: It violates the strict typing principles of Rust.

### Alternative 2: Implement custom `Deserialize` for `User`
- **Pros**: Keeps the struct unified while handling edge cases.
- **Cons**: Complex to maintain. If an `id` is required by the business logic later, the custom deserializer might silently hide the missing data.
- **Why not**: It adds unnecessary complexity to the `serde` layer.

## Consequences

### Positive
- Strict, exact mapping of the JSON payload as documented by Gitea's webhook schema.
- Eliminates deserialization crashes on `PushEvent`.
- Prevents logic that might erroneously depend on a committer having a Gitea `id`.

### Negative
- Slight duplication of user-related structs in `models.rs`.

### Risks
- None identified. This aligns our models perfectly with the actual Gitea webhook API contract.
