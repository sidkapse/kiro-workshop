# Implementation Plan: User Avatars

## Overview

Implement avatar support across the stack: a new `getAvatarUploadUrl` Lambda for pre-signed S3 URL generation, a reusable `Avatar` React component with initials fallback, avatar upload UI on the profile page, avatar display in the feed, and the supporting CDK infrastructure (S3 bucket + CloudFront distribution).

## Tasks

- [x] 1. Add infrastructure for avatar storage and delivery
  - Add `AvatarBucket` S3 bucket to `AppStack` with `BlockPublicAccess.BLOCK_ALL`, CORS policy allowing PUT from all origins, and `RemovalPolicy.DESTROY`
  - Add a new CloudFront distribution (`AvatarDistribution`) backed by `AvatarBucket` using an `OriginAccessIdentity`, with `maxTtl: Duration.days(1)`
  - Output `AvatarCdnDomain` as a `CfnOutput` so the Lambda environment variable can be set
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Implement `getAvatarUploadUrl` Lambda
  - [x] 2.1 Create `backend/src/functions/users/getAvatarUploadUrl.js`
    - Extract `contentType` and `fileSize` from the parsed request body
    - Implement `isValidContentType(contentType)` — returns `true` iff value is one of `"image/jpeg"`, `"image/png"`, `"image/gif"`
    - Implement `isValidFileSize(fileSize)` — returns `true` iff `fileSize > 0 && fileSize <= 5_242_880`
    - Return 400 with descriptive message when either validation fails
    - Return 403 when `event.pathParameters.userId !== event.user.id`
    - Use `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` to generate a pre-signed PUT URL for key `avatars/{userId}` with 5-minute expiry
    - Return `{ uploadUrl, avatarUrl }` where `avatarUrl` is `https://${AVATAR_CDN_DOMAIN}/avatars/${userId}`
    - Wrap handler with `withAuth`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ]* 2.2 Write property test for MIME type validation (Property 1)
    - **Property 1: Backend MIME type validation rejects non-allowed types**
    - **Validates: Requirements 1.2**
    - Use `fast-check` to generate arbitrary strings; assert `isValidContentType` returns `true` iff value is in `["image/jpeg","image/png","image/gif"]`

  - [ ]* 2.3 Write property test for file size validation (Property 2)
    - **Property 2: Backend file size validation rejects oversized files**
    - **Validates: Requirements 1.3**
    - Use `fast-check` to generate arbitrary integers (including negatives, zero, boundary values); assert `isValidFileSize` returns `true` iff `0 < fileSize <= 5_242_880`

  - [ ]* 2.4 Write property test for authorization check (Property 3)
    - **Property 3: Authorization — users may only request upload URLs for their own avatar**
    - **Validates: Requirements 1.5**
    - Use `fast-check` to generate pairs of UUID strings `(requesterId, targetId)`; assert the handler returns 200 iff they are equal and 403 otherwise

- [x] 3. Wire `getAvatarUploadUrl` Lambda into CDK stack
  - Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` as dependencies in `backend/package.json`
  - Define `GetAvatarUploadUrlFunction` in `app-stack.ts` with env vars `AVATAR_BUCKET_NAME`, `AVATAR_CDN_DOMAIN`, and `USERS_TABLE`
  - Grant `s3:PutObject` on `AvatarBucket` and `dynamodb:GetItem` on `UsersTable` to the function
  - Add API route `POST /users/{userId}/avatar` → `GetAvatarUploadUrlFunction` (reuse the existing `userId` resource)
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4_

- [x] 4. Add `getAvatarUploadUrl` to the frontend API service
  - Add `getAvatarUploadUrl(userId, contentType, fileSize, token)` method to `usersApi` in `frontend/src/services/api.ts`
  - Method POSTs `{ contentType, fileSize }` to `${API_URL}/users/${userId}/avatar` with `Authorization` header
  - Returns `Promise<{ uploadUrl: string; avatarUrl: string }>`
  - _Requirements: 1.1, 4.4_

- [x] 5. Implement the `Avatar` React component
  - [x] 5.1 Create `frontend/src/components/Avatar.tsx`
    - Accept `{ user: Pick<User, 'displayName' | 'avatarUrl'>, size: 'sm' | 'lg' }` props
    - Render `<img>` when `avatarUrl` is set; attach `onError` handler that switches to initials fallback
    - Implement `getInitials(displayName: string): string` — split on whitespace, take first letter of each token, uppercase, join, truncate to 2 chars; return `"?"` for empty/whitespace input
    - Initials fallback is a styled `<div>` showing the initials string
    - Apply inline styles: `sm` → 40×40 px, `lg` → 80×80 px (width + height + lineHeight)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [ ]* 5.2 Write property test for initials derivation (Property 4)
    - **Property 4: Initials derivation correctness**
    - **Validates: Requirements 2.2, 3.2**
    - Use `fast-check` to generate arbitrary non-empty strings; assert `getInitials` returns 1–2 uppercase characters matching the first letter of each whitespace-delimited word

  - [ ]* 5.3 Write property test for Avatar dimensions (Property 5)
    - **Property 5: Avatar component renders at the correct dimensions for its size prop**
    - **Validates: Requirements 2.4, 3.1, 3.2**
    - Use `fast-check` to generate arbitrary `User` objects (with and without `avatarUrl`) and `size` values; assert the rendered root element has width/height equal to 40 px for `"sm"` and 80 px for `"lg"`

- [x] 6. Checkpoint — Ensure Avatar component and Lambda logic are correct
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add avatar display to the Feed
  - In `frontend/src/pages/Feed.tsx`, import `Avatar` and render `<Avatar user={post.user} size="sm" />` inside each post card's header, alongside the existing author link
  - Guard the render so it only shows when `post.user` is defined (existing behaviour already fetches user per post)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8. Add avatar display and upload control to the Profile page
  - [x] 8.1 Add avatar display to `frontend/src/pages/Profile.tsx`
    - Import `Avatar` and render `<Avatar user={user} size="lg" />` in the profile header (both view and edit modes)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.2 Add client-side file validation helper
    - Implement `validateAvatarFile(file: File): { valid: boolean; error?: string }` in `Profile.tsx` (or a shared util)
    - Returns invalid with descriptive error if `file.type` is not in the allowed set or `file.size > 5_242_880`
    - _Requirements: 4.2, 4.3_

  - [ ]* 8.3 Write property test for client-side file validation (Property 6)
    - **Property 6: Client-side file validation accepts only valid type and size combinations**
    - **Validates: Requirements 4.2, 4.3**
    - Use `fast-check` to generate arbitrary `{ type: string, size: number }` objects; assert `validateAvatarFile` returns valid iff type is in the allowed set AND size ≤ 5,242,880

  - [x] 8.4 Add avatar upload control to `Profile.tsx`
    - Show a file `<input accept="image/jpeg,image/png,image/gif">` and upload button only when `isOwnProfile`
    - On file selection, run `validateAvatarFile`; display inline error and abort if invalid (_Requirements: 4.2, 4.3_)
    - On valid selection: disable the control and show a loading indicator, call `usersApi.getAvatarUploadUrl`, PUT the file directly to the pre-signed URL using `fetch`, then call `usersApi.updateProfile` with `{ avatarUrl }`, update local `user` state, and re-enable the control (_Requirements: 4.4, 4.5_)
    - On any failure, display an error message and re-enable the control (_Requirements: 4.6_)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `fast-check` must be added as a dev dependency before running property tests (`yarn workspace frontend add -D fast-check` or equivalent)
- The `getInitials` and `validateAvatarFile` functions should be exported from their modules so they can be tested in isolation
- The `isValidContentType` and `isValidFileSize` functions in the Lambda should be exported for unit/property testing
- CloudFront CDN URL for avatars follows the pattern `https://{avatarCdnDomain}/avatars/{userId}`; the domain comes from the `AVATAR_CDN_DOMAIN` env var set by CDK
