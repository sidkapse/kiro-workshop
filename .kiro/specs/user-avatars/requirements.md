# Requirements Document

## Introduction

This feature adds avatar support to the micro-blogging application. Users will be able to upload a profile picture, which is then displayed next to their posts in the feed and prominently on their profile page. Avatars are stored in AWS S3 and served via a pre-signed upload URL. Where no avatar has been set, the UI falls back to a generated initials-based placeholder.

## Glossary

- **Avatar**: A user-uploaded profile image associated with a user account.
- **Avatar_Service**: The backend Lambda function responsible for generating pre-signed S3 upload URLs and managing avatar metadata.
- **Avatar_Bucket**: The AWS S3 bucket dedicated to storing user avatar images.
- **CDN**: The AWS CloudFront distribution used to serve avatar images to clients.
- **Profile_Page**: The frontend page that displays a user's profile information and their posts.
- **Feed**: The frontend page that displays a paginated list of posts from all users.
- **Post_Card**: A single post entry rendered within the Feed or Profile_Page.
- **Avatar_Component**: The reusable React component that renders either a user's avatar image or an initials-based fallback.
- **Uploader**: The authenticated user performing an avatar upload.
- **Initials_Fallback**: A generated placeholder image derived from the user's display name, shown when no avatar has been uploaded.
- **Pre_Signed_URL**: A time-limited, authenticated S3 URL that allows the client to upload a file directly to S3 without exposing AWS credentials.

---

## Requirements

### Requirement 1: Avatar Upload

**User Story:** As a registered user, I want to upload a profile picture, so that other users can recognize me across the app.

#### Acceptance Criteria

1. WHEN the Uploader requests an avatar upload, THE Avatar_Service SHALL return a Pre_Signed_URL valid for 5 minutes that allows a single PUT request to the Avatar_Bucket.
2. WHEN the Uploader submits a file that is not of type `image/jpeg`, `image/png`, or `image/gif`, THEN THE Avatar_Service SHALL reject the request with a 400 status code and a descriptive error message.
3. WHEN the Uploader submits a file whose size exceeds 5 MB, THEN THE Avatar_Service SHALL reject the request with a 400 status code and a descriptive error message.
4. WHEN the Uploader successfully uploads an image to the Avatar_Bucket via the Pre_Signed_URL, THE Avatar_Service SHALL update the user's `avatarUrl` field in DynamoDB with the CDN URL of the uploaded image.
5. THE Avatar_Service SHALL only allow an authenticated user to generate a Pre_Signed_URL for their own avatar.
6. WHEN an unauthenticated request is made to the Avatar_Service, THEN THE Avatar_Service SHALL return a 401 status code.

---

### Requirement 2: Avatar Display in the Feed

**User Story:** As a user browsing the feed, I want to see avatars next to each post, so that I can quickly identify who wrote each post.

#### Acceptance Criteria

1. WHEN the Feed renders a Post_Card, THE Avatar_Component SHALL display the author's avatar image if the author has an `avatarUrl` set.
2. WHEN the Feed renders a Post_Card and the post author has no `avatarUrl`, THE Avatar_Component SHALL display the Initials_Fallback derived from the author's `displayName`.
3. WHEN an avatar image fails to load, THE Avatar_Component SHALL display the Initials_Fallback in place of the broken image.
4. THE Avatar_Component SHALL render avatar images at 40×40 pixels within Post_Cards in the Feed.

---

### Requirement 3: Avatar Display on the Profile Page

**User Story:** As a user viewing a profile, I want to see a prominent avatar at the top of the profile, so that I can visually identify the account owner.

#### Acceptance Criteria

1. WHEN the Profile_Page renders, THE Avatar_Component SHALL display the profile user's avatar image at 80×80 pixels if an `avatarUrl` is set.
2. WHEN the Profile_Page renders and the user has no `avatarUrl`, THE Avatar_Component SHALL display the Initials_Fallback at 80×80 pixels.
3. WHEN an avatar image fails to load on the Profile_Page, THE Avatar_Component SHALL display the Initials_Fallback.

---

### Requirement 4: Avatar Management on Own Profile

**User Story:** As a registered user viewing my own profile, I want to upload or change my avatar directly from my profile page, so that I can keep my picture up to date.

#### Acceptance Criteria

1. WHEN the Uploader views their own Profile_Page, THE Profile_Page SHALL display an avatar upload control alongside the current avatar or Initials_Fallback.
2. WHEN the Uploader selects a file using the upload control, THE Profile_Page SHALL validate that the file is of type `image/jpeg`, `image/png`, or `image/gif` and does not exceed 5 MB before initiating the upload.
3. IF the selected file fails client-side validation, THEN THE Profile_Page SHALL display an error message and SHALL NOT initiate the upload request.
4. WHEN a valid file is selected, THE Profile_Page SHALL request a Pre_Signed_URL from the Avatar_Service, upload the file directly to the Avatar_Bucket, and then update the displayed avatar without requiring a full page reload.
5. WHILE an avatar upload is in progress, THE Profile_Page SHALL display a loading indicator and SHALL disable the upload control to prevent duplicate submissions.
6. IF the avatar upload fails at any stage, THEN THE Profile_Page SHALL display an error message and restore the upload control to its active state.

---

### Requirement 5: Avatar Infrastructure

**User Story:** As a developer, I want avatar storage and delivery to be handled by dedicated AWS infrastructure, so that avatars are served reliably and securely.

#### Acceptance Criteria

1. THE Avatar_Bucket SHALL be configured with private access (no public read) and SHALL serve images exclusively through the CDN.
2. THE Avatar_Bucket SHALL enforce a CORS policy that permits PUT requests from the application's allowed origins.
3. THE CDN SHALL be configured to cache avatar images with a maximum TTL of 1 day.
4. WHERE the application is deployed, THE Avatar_Bucket SHALL be provisioned as a separate S3 bucket from the existing website hosting bucket.
