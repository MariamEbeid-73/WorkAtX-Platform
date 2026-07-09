# ─── Stage 1: restore (cached unless .csproj changes) ───────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS restore
WORKDIR /src

# Copy only project files first — this layer is cached until .csproj changes
COPY *.csproj ./
RUN dotnet restore

# ─── Stage 2: build (cached unless source changes) ───────────────────────────
FROM restore AS build
COPY . .
RUN dotnet build -c Release --no-restore

# ─── Stage 3: publish ────────────────────────────────────────────────────────
FROM build AS publish
RUN dotnet publish -c Release --no-build -o /publish

# ─── Stage 4: runtime image (lean) ───────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=publish /publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5000

EXPOSE 5000
ENTRYPOINT ["dotnet", "BE.dll"]
