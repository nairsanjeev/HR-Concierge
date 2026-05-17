import express from "express";
import { CloudAdapter, authorizeJWT, getAuthConfigWithDefaults } from "@microsoft/agents-hosting";
import { agentApp } from "./agent";

const authConfig = getAuthConfigWithDefaults();
const adapter = new CloudAdapter();
const server = express();
server.use(express.json());

// Raw request logger — runs BEFORE JWT auth to see ALL requests
server.use((req, _res, next) => {
  if (req.path === "/api/messages") {
    const hasAuth = !!req.headers.authorization;
    const authSnippet = hasAuth
      ? req.headers.authorization!.substring(0, 50) + "..."
      : "NONE";
    console.log(
      `>>> RAW REQUEST: ${req.method} ${req.path} | Auth: ${authSnippet} | Body type: ${req.body?.type || "N/A"}`
    );
  }
  next();
});

server.use(authorizeJWT(authConfig));
server.post("/api/messages", (req, res) =>
  adapter.process(req, res, (context) => agentApp.run(context))
);

const port = process.env.PORT || 3978;
server.listen(port, () => {
  console.log(
    `\nServer listening to port ${port} on sdk for appId ${authConfig.clientId} debug ${process.env.DEBUG}`
  );
});
