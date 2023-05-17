import { Octokit } from "octokit";

export interface WorkflowDispatchParams {
    token: string;
    owner: string;
    repo: string;
    workflow_id: string;
    ref: string;
    inputs?: any;
}

export const workflowDispatchSync = async (params: WorkflowDispatchParams) => {
    const octokit = new Octokit({ auth: params.token });
    try {
        const response = await octokit.rest.actions.createWorkflowDispatch({
            ...params
        });
        console.log(response);
    } catch (error) {
        console.log(error);
    }
}
