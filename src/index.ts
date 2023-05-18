import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";

import { createServer } from "node:http";
import { App, createNodeMiddleware } from "octokit";

import EventSource from "eventsource";
const SmeeClient = require('smee-client')

import { v4 as uuidv4 } from 'uuid';

import * as dotenv from "dotenv";
dotenv.config()

if (!process.env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not set in environment variables!");
if (!process.env.APP_ID) throw new Error("APP_ID not set in environment variables!");
if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set in environment variables!");
if (!process.env.WEBHOOK_SECRET) throw new Error("WEBHOOK_SECRET not set in environment variables!");
if (!process.env.CLIENT_ID) throw new Error("CLIENT_ID not set in environment variables!");
if (!process.env.CLIENT_SECRET) throw new Error("CLIENT_SECRET not set in environment variables!");

const port = 3000;

const webhookProxyUrl = process.env.WEBHOOK_PROXY_URL; // replace with your own Webhook Proxy URL

const token = process.env.GITHUB_TOKEN;
const ownerRepo = {
  owner: 'austenstone',
  repo: 'workflow-dispatch-sync'
}
const ref = 'main';
const workflow_id = 'test_1_basic.yml';

const app = new App({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  webhooks: {
    path: "/",
    secret: process.env.WEBHOOK_SECRET
  },
  oauth: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  }
});

app.webhooks.onAny((event) => {
  console.log("Webhook event received:", event.name);
});

app.webhooks.on("workflow_run.completed", async ({ octokit, payload }) => {
  console.log("workflow_run.completed", payload.workflow_run.jobs_url);

  const jobsResponse = await octokit.request(payload.workflow_run.jobs_url);
  jobsResponse.data.jobs.forEach((job) => {
    job.steps.forEach((step) => {
      console.log(`Step ${step.name} ${step.conclusion}`)
      const dispatch = pendingDispatches.find((dispatch) => dispatch.uid === step.name);
      if (dispatch) {
        console.log(`Dispatch ${dispatch.uid} ${step.conclusion}`)
        step.conclusion === 'success' ? dispatch.resolve(payload) : dispatch.reject(payload);
      }
    });
  });
});

const smee = new SmeeClient({
  source: webhookProxyUrl,
  target: `http://localhost:${port}/`,
  logger: console
})

const source = new EventSource(webhookProxyUrl);
source.onmessage = (event) => {
  const webhookEvent = JSON.parse(event.data);
  app.webhooks
    .verifyAndReceive({
      id: webhookEvent["x-request-id"],
      name: webhookEvent["x-github-event"],
      signature: webhookEvent["x-hub-signature"],
      payload: webhookEvent.body,
    })
    .catch(console.error);
};

const pendingDispatches: any[] = [];

type WorkflowDispatchParameters = Endpoints["POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"]["parameters"];
export const workflowDispatchSync = async (token: string, parameters: WorkflowDispatchParameters) => {
  const octokit = new Octokit({ auth: token });
  if (!parameters.inputs) parameters.inputs = {};
  if (!parameters.inputs.uid) parameters.inputs.uid = uuidv4();
  await octokit.rest.actions.createWorkflowDispatch(parameters);
  return new Promise((resolve, reject) => {
    pendingDispatches.push({
      uid: parameters.inputs?.uid,
      resolve,
      reject
    });
  });
}

console.log(`Dispatching ${ownerRepo.owner}/${ownerRepo.repo}/.github/workflows/${workflow_id}@${ref}`);

(async () => {
  const uid = uuidv4();
  await workflowDispatchSync(token, {
    ...ownerRepo,
    workflow_id,
    ref,
    inputs: {
      uid
    }
  });
})();

const events = smee.start()

createServer(createNodeMiddleware(app)).listen(port);

events.close()