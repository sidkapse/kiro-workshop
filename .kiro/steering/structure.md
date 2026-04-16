# Project Structure

Yarn monorepo with three workspaces:

```
/
├── frontend/               # React/TypeScript SPA
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── contexts/       # React context providers (e.g. AuthContext)
│       ├── pages/          # Route-level page components
│       ├── services/       # API call modules (api.ts)
│       └── types/          # Shared TypeScript interfaces (user.ts, post.ts)
│
├── backend/                # Lambda function handlers
│   └── src/
│       ├── common/         # Shared utilities (middleware.js — withAuth wrapper)
│       └── functions/      # One file per Lambda, grouped by domain
│           ├── auth/       # register.js, login.js
│           ├── posts/      # createPost.js, getPosts.js, likePost.js
│           ├── users/      # getProfile.js, updateProfile.js, followUser.js, etc.
│           └── monitoring/
│
└── infrastructure/         # AWS CDK stack
    └── lib/
        └── app-stack.ts    # Single stack defining all AWS resources
```

## Key Conventions

### Backend (Lambda functions)
- Each Lambda is a single `.js` file using CommonJS (`require`/`exports`)
- All authenticated endpoints wrap their handler with `withAuth()` from `common/middleware.js`
- `withAuth` decodes the JWT, looks up the user in DynamoDB, and injects `event.user = { id, username }`
- All responses include CORS headers (`Access-Control-Allow-Origin: *`)
- Table names are always read from environment variables, never hardcoded
- IDs are generated with `uuidv4()`
- Timestamps use `new Date().toISOString()`

### Frontend
- API calls are centralized in `frontend/src/services/api.ts`, grouped by domain (`authApi`, `usersApi`, `postsApi`)
- Auth state is managed globally via `AuthContext` — use the `useAuth()` hook to access user/token
- JWT token and user object are persisted in `localStorage`
- Protected routes use the `ProtectedRoute` wrapper component in `App.tsx`
- Environment variables are accessed via `import.meta.env.VITE_*`

### Infrastructure
- All AWS resources are defined in a single CDK stack (`AppStack`)
- Lambda packages are loaded from `backend/dist/lambda-packages/{functionName}.zip`
- DynamoDB tables use PAY_PER_REQUEST billing and `RemovalPolicy.DESTROY` (dev setup)
- New Lambda functions must be granted explicit DynamoDB permissions via `.grantRead*` methods
