@echo off
setlocal
echo === Market Pro install ===
cd backend
dotnet restore MarketPro.sln || goto :err
dotnet build MarketPro.sln -c Debug --nologo || goto :err
cd ..\frontend
call npm install --legacy-peer-deps || goto :err
echo.
echo Done.
echo Backend:  dotnet run --project backend\src\MarketPro.Api\MarketPro.Api.csproj
echo Frontend: cd frontend ^&^& npm start
exit /b 0
:err
echo Install failed.
exit /b 1
