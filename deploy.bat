@echo off
echo 🚀 Deploy Chat Application to Railway
echo ====================================
echo.

echo Step 1: Checking Git status...
git status
echo.

echo Step 2: Adding all files to Git...
git add .
echo.

echo Step 3: Committing changes...
git commit -m "Deploy chat application to production"
echo.

echo Step 4: Pushing to GitHub...
git push origin main
echo.

echo Step 5: Deploying to Railway...
echo.
echo If you haven't connected to Railway yet, run:
echo   railway login
echo   railway link
echo.
echo Then run:
echo   railway up
echo.

echo.
echo 🌟 Deployment Complete!
echo.
echo Next steps:
echo 1. Go to Railway Dashboard
echo 2. Check build logs
echo 3. Get your application URL
echo 4. Update frontend config if needed
echo.
echo Your app will be available at:
echo   https://your-app-name.railway.app
echo.
pause