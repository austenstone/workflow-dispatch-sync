#!usr/bin/env node
import WorkflowDispatch, { App } from "workflow-dispatch-sync";
import inquirer from 'inquirer';
import chalk from 'chalk';

inquirer.prompt({
  type: 'input',
  name: 'hex',
  message: 'What is your favorite color?'
}).then((answers) => {
  console.log(chalk.hex(answers.hex).bold('NICE!!'));
}).catch((error) => {
  console.log(error);
});