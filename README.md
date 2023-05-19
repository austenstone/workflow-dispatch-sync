# Workflow Dispatch Sync

This library triggers a GitHub Actions `workflow_dispatch` event and waits for the run to complete. After the run is complete you can easily get the log output.

## Installation

[NPM](https://www.npmjs.com/package/workflow-dispatch-sync) or [GitHub Packages](https://github.com/austenstone/workflow-dispatch-sync/pkgs/npm/workflow-dispatch-sync).
```bash
npm i -S workflow-dispatch-sync
```

```ts
import WorkflowDispatch, { App } from 'workflow-dispatch-sync';
```

## Authentication

You will need to create a GitHub App and install it on the repositories you want to trigger workflows on.

After creating the app pass an OctoKit [`App`](https://www.npmjs.com/package/octokit#user-content-app-client) instance to the constructor. This will require you to get the `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`, `CLIENT_ID`, and `CLIENT_SECRET` from your GitHub App. We conveniently export the App from octokit so you can import it directly from the library.

## Workflow File

Because `workflow_dispatch` doesn't return any id we need to pass our own id to the workflow file. The hack is passing the id as the name of a step.

Create the input `uid` and then use it as the name of a step. This will allow us to find the appropriate run later.

```yml
name: Basic

on:
  workflow_dispatch:
    inputs:
      uid:
        description: 'Unique identifier'
        required: true

jobs:
  build:
    name: build
    runs-on: ubuntu-latest

    steps:
      - name: ${{ inputs.uid }}
        run: echo Hello, world!
```

When you call the library you can pass the `uid` input in yourself otherwise it will automatically add an input called `uid`.

## Example

This example loads the environment from `.env` and then dispatches the workflow `test_1_basic.yml` in the `austenstone/workflow-dispatch-sync` repository. It then waits for the run to complete and prints the logs.

```ts
import { App, WorkflowDispatch } from '../index';
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
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

    const dispatcher = new WorkflowDispatch(app);
    const run = await dispatcher.workflowDispatchSync({
        owner: 'austenstone',
        repo: 'workflow-dispatch-sync',
        ref: 'main',
        workflow_id: 'test_1_basic.yml'
    })
    console.log(`Workflow run ${run.workflow_run.id} completed with status ${run.workflow_run.status}!`)

    const logs = await dispatcher.getWorkflowRunLogs({
        owner: 'austenstone',
        repo: 'workflow-dispatch-sync',
        run_id: run.workflow_run.id
    });
    console.log(JSON.stringify(logs, null, 2));

    dispatcher.close();
})();
```

## Logs

We have a convenient method `getWorkflowRunLogs` to get workflow logs as a JSON array.

```json
[
  {
    "name": "build",
    "steps": [
      {
        "name": "d32001d7-7ea1-417d-8a6e-32d74811c7cb",
        "lines": [
          {
            "time": "2023-05-18T21:50:06.1649549Z",
            "text": "##[group]Run echo Hello, world!"
          },
          {
            "time": "2023-05-18T21:50:06.1650035Z",
            "text": "\u001b[36;1mecho Hello, world!\u001b[0m"
          },
          {
            "time": "2023-05-18T21:50:06.2111665Z",
            "text": "shell: /usr/bin/bash -e {0}"
          },
          {
            "time": "2023-05-18T21:50:06.2112211Z",
            "text": "##[endgroup]"
          },
          {
            "time": "2023-05-18T21:50:06.2671502Z",
            "text": "Hello, world!"
          }
        ]
      },
      {
        "name": "Set up job",
        "lines": [
...
```
