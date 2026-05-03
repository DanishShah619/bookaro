# Docker Setup

Run the full stack from the project root:

```sh
docker compose up --build
```

Services:

- Customer app: http://localhost:5173
- Admin app: http://localhost:5174
- API: http://localhost:5000
- MongoDB: localhost:27017

The Compose stack uses a local MongoDB container and stores uploaded files in the `backend-uploads` Docker volume. Existing files in `backend/uploads` are not baked into the image; new uploads are persisted in the Docker volume.

For Stripe card checkout, set `STRIPE_SECRET_KEY` in your shell before starting Compose. For production, also set a stronger `JWT_SECRET`.
