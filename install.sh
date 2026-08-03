#!/usr/bin/env bash
set -euo pipefail

echo "→ Restoring backend"
cd backend
dotnet restore MarketPro.sln
echo "→ Building backend"
dotnet build MarketPro.sln -c Debug --nologo

cd ../frontend
echo "→ Installing frontend"
npm install --legacy-peer-deps

echo "Done. Run:"
echo "  Backend:  dotnet run --project backend/src/MarketPro.Api/MarketPro.Api.csproj"
echo "  Frontend: cd frontend && npm start"
echo "Or all together: docker compose up --build"
