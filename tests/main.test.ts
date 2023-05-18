import { test, expect } from '@jest/globals';
import { WorkflowDispatch } from '../src/index';
import { App } from 'octokit';

if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set in environment variables!');

jest.setTimeout(30000);

test('Basic Dispatch', async () => {
  if (!process.env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not set in environment variables!");
  if (!process.env.APP_ID) throw new Error("APP_ID not set in environment variables!");
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set in environment variables!");
  if (!process.env.WEBHOOK_SECRET) throw new Error("WEBHOOK_SECRET not set in environment variables!");
  if (!process.env.CLIENT_ID) throw new Error("CLIENT_ID not set in environment variables!");
  if (!process.env.CLIENT_SECRET) throw new Error("CLIENT_SECRET not set in environment variables!");

  const dispatcher = new WorkflowDispatch(new App({
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
  }));
  const params = {
    owner: 'austenstone',
    repo: 'workflow-dispatch-sync',
    ref: 'main',
    workflow_id: 'test_1_basic.yml'
  };
  const run = await dispatcher.workflowDispatchSync(params);
  expect(run.workflow_run.status).toBe('completed');
  expect(run.workflow_run.conclusion).toBe('success');
  expect(run.workflow_run.head_branch).toBe(params.ref);
  expect(run.workflow_run.head_sha).toBe(run.workflow_run.head_commit.id);
  expect(run.workflow_run.event).toBe('workflow_dispatch');
});
