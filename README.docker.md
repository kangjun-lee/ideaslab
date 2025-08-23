# Docker Setup for IdeasLab Discord Bot Server

This guide explains how to run the IdeasLab Discord bot server using Docker.

## Quick Start

1. **Setup Environment Variables**

   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Build the Docker Image**

   ```bash
   yarn docker:build
   ```

3. **Run with Docker Compose (Recommended)**
   ```bash
   yarn docker:compose:up
   ```

## Available Docker Scripts

- `yarn docker:build` - Build production Docker image
- `yarn docker:build:dev` - Build development Docker image (with build tools)
- `yarn docker:run` - Run container locally with .env file
- `yarn docker:run:dev` - Run development container
- `yarn docker:compose:up` - Start with Docker Compose (includes Redis)
- `yarn docker:compose:down` - Stop Docker Compose services

## Production Deployment

### Environment Variables

Copy `.env.example` to `.env` and configure the following required variables:

#### Discord Configuration

- `BOT_ID` - Your Discord bot application ID
- `BOT_TOKEN` - Your Discord bot token
- `GUILD_ID` - Your Discord server ID
- `TEST_GUILD_ID` - Guild ID for testing slash commands

#### Database

- `DATABASE_URL` - PostgreSQL connection string

#### Redis

- `REDIS_URL` - Redis connection string (defaults to `redis://localhost:6379`)
- `REDIS_PREFIX` - Optional prefix for Redis keys

#### Web Configuration

- `WEB_URL` - Your web application URL
- `COOKIE_DOMAIN` - Domain for authentication cookies

#### Security

- `JWT_SECRET` - Secret for JWT token signing
- `IRON_SESSION_PASSWORD` - Secret for session encryption (min 32 chars)
- `HCAPTCHA_SECRET_KEY` - hCaptcha secret key for verification

### Docker Compose Production

The `docker-compose.prod.yml` file includes:

- **Redis Cache** - For session and temporary data storage
- **Discord Bot Server** - The main application container

To deploy:

1. Set up your `.env` file with production values
2. Ensure you have external PostgreSQL database running
3. Run: `docker compose -f docker-compose.prod.yml up -d`

### Container Features

- **Multi-stage build** - Optimized for production size
- **Non-root user** - Runs as nodejs:nodejs for security
- **Health checks** - Built-in health monitoring
- **Graceful shutdown** - Proper signal handling with dumb-init
- **Alpine Linux** - Smaller image size

## Development

For development with Docker:

```bash
# Build development image (includes build tools)
yarn docker:build:dev

# Run in development mode
yarn docker:run:dev
```

## Slash Command Registration

To register Discord slash commands:

```bash
# In the container
node ./dist --register
```

Or build a custom image with registration:

```bash
docker run --rm -it --env-file .env ideaslab/server:latest node ./dist --register
```

## Troubleshooting

### Build Issues

- Ensure all dependencies are properly resolved
- Check that `.yarn/patches` directory is included
- Verify Node.js version matches requirements (22.18.0)

### Runtime Issues

- Check environment variables are properly set
- Ensure Redis and PostgreSQL are accessible
- Verify Discord bot token and permissions
- Check container logs: `docker logs ideaslab-main`

### Health Check Failures

- Ensure the server is listening on port 4000
- Check if dependencies (Redis, PostgreSQL) are healthy
- Verify network connectivity between containers

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord Bot   │    │   tRPC Server   │    │   Web Client    │
│    (Port N/A)   │    │   (Port 4000)   │    │  (External)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │              Application Container             │
         │            (ideaslab/server:latest)            │
         └───────────┬───────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌──────▼──────┐    ┌────▼─────┐
│ Redis  │    │ PostgreSQL  │    │ External │
│ Cache  │    │  Database   │    │ Services │
└────────┘    └─────────────┘    └──────────┘
```

The container runs both the Discord bot and tRPC API server in a single process, connecting to external Redis and PostgreSQL services.
