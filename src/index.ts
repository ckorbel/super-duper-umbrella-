import "reflect-metadata";

import express from "express";
import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import { buildSchema } from "type-graphql";
import Redis from "ioredis";
import cors from "cors";
import { createConnection } from "typeorm";
import { User } from "./entities/User";
import session from "express-session";
import { COOKIE_NAME } from "./constants";
import { UserResolver } from "./resolvers/user";

const main = async () => {
  const conn = await createConnection({
    type: "postgres",
    database: "data-store",
    username: "postgres",
    password: "postgres",
    logging: true,
    synchronize: true,
    entities: [User],
  });

  // await conn.runMigrations();
  const app = express();
  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);
  app.set("trust proxy", 1);
  app.use(
    cors({
      // origin: process.env.CORS_ORIGIN,
      origin: "http://localhost:3000",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "lax", // csrf
        secure: false, // cookiue only work in https
      },
      saveUninitialized: false,
      secret: "keyboard bees",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res, redis }),
  });
  const PORT = process.env.PORT || 4000;
  apolloServer.applyMiddleware({ app, cors: false });
  app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`);
  });
};

main().catch((err) => console.log(err));
