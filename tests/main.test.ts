import { test, expect } from '@jest/globals';
import { workflowDispatchSync } from '../src/index';

if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set in environment variables!');

const token = process.env.GITHUB_TOKEN;
const ownerRepo = {
  owner: 'austenstone',
  repo: 'workflow-dispatch-sync'
}
const ref = 'main';
const workflow_id = 'test_1_basic.yml';

test('Basic Dispatch', async () => {
  console.log(`Dispatching ${ownerRepo.owner}/${ownerRepo.repo}/.github/workflows/${workflow_id}@${ref}`);
  await workflowDispatchSync(token, {
    ...ownerRepo,
    workflow_id,
    ref
  });
  expect(true).toBe(true);
});