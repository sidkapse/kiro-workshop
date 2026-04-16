# Tech Stack

## Frontend
- React 18 with TypeScript
- Vite (build tool)
- React Router v6 (client-side routing)
- Native `fetch` API for HTTP calls (no axios or other HTTP libraries)
- Playwright for E2E testing

## Backend
- Node.js (CommonJS modules) — Lambda functions written in JavaScript
- AWS Lambda (Node.js 22.x runtime)
- AWS API Gateway (REST API)
- AWS Cognito (user authentication)
- AWS DynamoDB (data storage, PAY_PER_REQUEST billing)
- `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` for DynamoDB access
- `uuid` for ID generation

## Infrastructure
- AWS CDK v2 (TypeScript) for all infrastructure as code
- S3 + CloudFront for frontend hosting
- Single CDK stack: `MicroBloggingAppStack`

## Package Management
- Yarn workspaces (monorepo with `frontend`, `backend`, `infrastructure` packages)

## Common Commands

### Frontend
```bash
yarn start:frontend       # Dev server
yarn build:frontend       # Production build (tsc + vite build)
yarn workspace frontend lint
yarn workspace frontend test:e2e
```

### Backend
```bash
yarn build:backend        # Copies src to dist, removes .ts files
```

### Infrastructure
```bash
yarn deploy:infra         # cdk deploy
yarn workspace infrastructure diff  # cdk diff
```

### Full Deploy
```bash
yarn deploy               # build:backend → deploy:infra → deploy:frontend → invalidate CDN
```

## Environment Variables
Frontend reads from `frontend/.env`:
- `VITE_API_URL` — API Gateway endpoint
- `VITE_USER_POOL_ID` — Cognito User Pool ID
- `VITE_USER_POOL_CLIENT_ID` — Cognito User Pool Client ID
- `VITE_IDENTITY_POOL_ID` — Cognito Identity Pool ID

Backend Lambda functions receive table names via environment variables: `USERS_TABLE`, `POSTS_TABLE`, `LIKES_TABLE`, `FOLLOWS_TABLE`.
