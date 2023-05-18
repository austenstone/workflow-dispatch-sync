import { test, expect } from '@jest/globals';
import { WorkflowDispatch } from '../src/index';
import { App } from 'octokit';
import * as dotenv from "dotenv";
dotenv.config()

jest.setTimeout(30000);

describe('WorkflowDispatch', () => {
  let dispatcher: WorkflowDispatch;
  beforeEach(() => {
    if (!process.env.APP_ID) throw new Error("APP_ID not set in environment variables!");
    if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set in environment variables!");
    if (!process.env.WEBHOOK_SECRET) throw new Error("WEBHOOK_SECRET not set in environment variables!");
    if (!process.env.CLIENT_ID) throw new Error("CLIENT_ID not set in environment variables!");
    if (!process.env.CLIENT_SECRET) throw new Error("CLIENT_SECRET not set in environment variables!");
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
    dispatcher = new WorkflowDispatch(app);
  });
  
  afterEach(() => dispatcher.close());
  
  test('Basic Dispatch', async () => {
    const run = await dispatcher.workflowDispatchSync({
      owner: 'austenstone',
      repo: 'workflow-dispatch-sync',
      ref: 'main',
      workflow_id: 'test_1_basic.yml'
    });
    expect(run.workflow_run.status).toBe('completed');
  });  
});
