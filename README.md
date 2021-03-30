# google-contacts-app

**********************

Application for dealing with google contacts

## Setup

* Create the environment and get credentials

```bash
cp .env.example .env
```

Add your Google API credentials, client ID, client secret, etc here in `.env`, which serves as your environment file.

* Install all dependencies

```bash
npm install
```

## Deployment

* Start the server in prod mode:

```bash
npm run build
npm run serve
```

In development mode, you can use:

```bash
npm run dev
```

You could also use Docker to start a fresh docker container with minimal dependencies.

### Deployment using a single Dockerfile

Create and build a fresh docker image using:

```bash
docker build -t $DOCKER_USERNAME/google-contacts-app-image .
```

Now run an instance of that image using:

```bash
docker run -p 3000:3000 -d $DOCKER_USERNAME/google-contacts-app-image
```

Your minimal docker setup is now complete!

### Deployment using docker-compose

On top of the simple `Dockerfile`, you could also use `docker-compose` and add a reverse-proxy such as nginx. (**NOTE**: The corresponding config urls needs to be changed from `localhost:3000` to `localhost` as nginx is doing the redirect automatically)

Create all the services necessary using:

```bash
docker-compose up -d
```

Stop them using

```bash
docker-compose stop
```

*******************