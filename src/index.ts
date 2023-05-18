import { Endpoints } from "@octokit/types";

import { Server, createServer } from "node:http";
import { App, createNodeMiddleware } from "octokit";
import { EmitterWebhookEvent } from "@octokit/webhooks/dist-types/index";

const SmeeClient = require('smee-client')
import EventSource from "eventsource";

import { v4 as uuidv4 } from 'uuid';

import * as dotenv from "dotenv";
dotenv.config()
export class WorkflowDispatch {
  app: App;
  private pendingDispatches: {
    uid: string;
    requested?: (run: EmitterWebhookEvent<'workflow_run.requested'>['payload']) => void;
    progress?: (run: EmitterWebhookEvent<'workflow_run.in_progress'>['payload']) => void;
    resolve: (run: EmitterWebhookEvent<'workflow_run.completed'>['payload']) => void;
    reject: (reason?: any) => void;
  }[] = [];
  private source: EventSource;
  private port: number;
  private events: any;
  private smee?: any;
  private server: Server;

  constructor(app: App, port = 3000, webhookProxyUrl = process.env.WEBHOOK_PROXY_URL) {
    this.app = app;
    this.port = port;

    if (webhookProxyUrl) {
      console.log(`Setting up Smee with ${webhookProxyUrl}`)
      this.setupSmee(webhookProxyUrl);
    }
    
    this.app.webhooks.on("workflow_run", this.onWorkflowRun);
    
    createServer(createNodeMiddleware(app)).listen(port);
  }

  private setupSmee = (webhookProxyUrl: string) => {
    this.smee = new SmeeClient({
      source: webhookProxyUrl,
      target: `http://localhost:${this.port}/`,
      logger: console
    })

    this.source = new EventSource(webhookProxyUrl);
    this.source.onmessage = (event) => {
      const webhookEvent = JSON.parse(event.data);
      this.app.webhooks
        .verifyAndReceive({
          id: webhookEvent["x-request-id"],
          name: webhookEvent["x-github-event"],
          signature: webhookEvent["x-hub-signature"],
          payload: webhookEvent.body,
        })
        .catch(console.error);
    };

    this.events = this.smee.start()
  };

  private onWorkflowRun = async ({ octokit, payload }) => {
    const jobsResponse = await octokit.request(payload.workflow_run.jobs_url);
    jobsResponse.data.jobs.forEach((job) => {
      job.steps.forEach((step) => {
        const dispatch = this.pendingDispatches.find((dispatch) => dispatch.uid === step.name);
        if (dispatch) {
          switch (payload.action) {
            case 'completed':
              dispatch.resolve(payload);
              break;
            case 'requested':
              if (dispatch.requested) dispatch.requested(payload);
              break;
            case 'in_progress':
              if (dispatch.progress) dispatch.progress(payload);
              break;
          }
        }
      });
    });
  }

  workflowDispatchSync = async (
    parameters: Endpoints["POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"]["parameters"],
    requested?: (run: EmitterWebhookEvent<'workflow_run.requested'>['payload']) => void,
    progress?: (run: EmitterWebhookEvent<'workflow_run.in_progress'>['payload']) => void
  ) => {
    if (!parameters.inputs) parameters.inputs = {};
    if (!parameters.inputs.uid) parameters.inputs.uid = uuidv4();
    for await (const { octokit, repository } of this.app.eachRepository.iterator()) {
      if (repository.name !== parameters.repo) continue;
      console.log('found repo', repository.name)
      break;
      await octokit.rest.actions.createWorkflowDispatch(parameters);
    }
    return new Promise<EmitterWebhookEvent<'workflow_run.completed'>['payload']>((resolve, reject) => {
      this.pendingDispatches.push({
        uid: parameters.inputs?.uid as string,
        requested,
        progress,
        resolve,
        reject
      });
    }).finally(() => {
      const index = this.pendingDispatches.findIndex((dispatch) => dispatch.uid === parameters.inputs?.uid);
      if (index >= 0) this.pendingDispatches.splice(index, 1);
    });
  }

  close = () => {
    this.source.close();
    this.events.close();
  }

}