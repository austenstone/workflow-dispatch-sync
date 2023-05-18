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