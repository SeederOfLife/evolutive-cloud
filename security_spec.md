# Security Specification - Evolutionary Hub

## Data Invariants
1. **Suggestions**: 
   - Standard Suggestions: Must have `content`, `status`, `votes`, `energy`, `user_id`, `created_at`.
   - System Config: Must have `status: 'system_config'`, `content` (JSON string with `creator_id`), `created_at`.
   - Immutable fields: `created_at`, `user_id` (once set).
   - Relationship: Any suggestion update needs to respect the `is_finalized` state from the `system_config` if we wanted strict gating, but the app seems to allow interactions by anyone if not finalized, and only creator if finalized. Wait, let's look at `canSuggest` and `canInteract` in `App.tsx`.

2. **Advice**:
   - Must link to a valid `suggestion_id`.
   - `user_id` must match authenticated user.

3. **System Messages**:
   - Multi-user interactive elements.
   - `userId` must match authenticated user.

## The "Dirty Dozen" Payloads (PERMISSION_DENIED)
1. **Shadow Field Attack**: `update suggestions/1 { "votes": 10, "is_verified": true }`
2. **Vote Manipulation**: `update suggestions/1 { "votes": 100 }` (where existing is 5)
3. **Content Hijack**: `update suggestions/1 { "content": "malicious code" }` by a non-owner.
4. **Pledge Fraud**: `update suggestions/1 { "pledged_by": ["attacker_id"] }` but also changing `user_id`.
5. **Config Spoof**: `update suggestions/config_id { "content": "{\"creator_id\":\"attacker\"}" }` by non-creator.
6. **Identity Theft (Advice)**: `create advice { "user_id": "victim_id", ... }`
7. **Identity Theft (System Message)**: `create system_messages { "userId": "victim_id", ... }`
8. **Resource Exhaustion**: `create suggestions { "content": "A".repeat(100000) }` (Limit is 50k in rules)
9. **Status Shortcut**: `update suggestions/1 { "status": "built" }` without adding energy to 100 or providing `built_code`.
10. **Immortality Breach**: `update suggestions/1 { "created_at": "2000-01-01T00:00:00Z" }`
11. **Orphaned Advice**: `create advice { "suggestion_id": "non_existent_id", ... }`
12. **Unauthorized Deletion**: `delete suggestions/1` by someone who is neither the owner nor the project creator.

## Test Runner (Internal Logic)
The `firestore.rules` will be evaluated against these constraints.
