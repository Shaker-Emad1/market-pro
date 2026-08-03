FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY MarketPro.sln ./
COPY src/MarketPro.Domain/ src/MarketPro.Domain/
COPY src/MarketPro.Application/ src/MarketPro.Application/
COPY src/MarketPro.Infrastructure/ src/MarketPro.Infrastructure/
COPY src/MarketPro.Api/ src/MarketPro.Api/
RUN dotnet restore src/MarketPro.Api/MarketPro.Api.csproj
RUN dotnet publish src/MarketPro.Api/MarketPro.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MarketPro.Api.dll"]
