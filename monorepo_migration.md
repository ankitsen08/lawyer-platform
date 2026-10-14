# Monorepo Migration Plan

I have already injected all the required frontend and backend code into your project! The real-time database schema is built, the Lawyer Inbox is injected, and your sockets are ready. 

The final step is to restructure your folders into a clean `frontend`/`backend` monorepo. Because your Next.js server is currently running, I did not want to abruptly move the files and crash your terminal. 

Please follow these exact commands to safely complete the split:

### 1. Stop your running server
Go to your terminal where `npm run dev` is running and press `Ctrl+C` to stop it.

### 2. Run the restructuring commands
Copy and paste this block into your Powershell terminal at the root of your project:

```powershell
# Create the frontend directory
mkdir frontend

# Move all Next.js frontend files into the frontend directory
Move-Item -Path src, public, .next, node_modules -Destination frontend
Move-Item -Path next.config.mjs, package.json, package-lock.json, postcss.config.js, tailwind.config.ts, tsconfig.json -Destination frontend

# Initialize a package.json in the backend directory (since I already created it for you)
cd backend
npm init -y
npm install express cors socket.io mongoose
cd ..

# Optional: Create a root package.json to run both concurrently from the root
npm init -y
npm install concurrently --save-dev
```

### 3. Update the Root `package.json`
To make booting up seamless, replace the contents of your newly generated root `package.json` with this:

```json
{
  "name": "lawyer-directory-monorepo",
  "version": "1.0.0",
  "scripts": {
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && node server.js",
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\""
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

### 4. Boot up the entire system
From the root of your project, run:
```powershell
npm run dev
```

Both the Next.js frontend and the Express/Socket/Mongoose backend will boot up simultaneously!
