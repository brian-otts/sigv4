#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StatefulStack } from "../lib/stateful-stack";
import { StatelessStack } from "../lib/stateless-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
const statefulStack = new StatefulStack(app, "StatefulStack", {
  env,
});

new StatelessStack(app, "StatelessStack", {
  env,
  fruitTable: statefulStack.table,
});
