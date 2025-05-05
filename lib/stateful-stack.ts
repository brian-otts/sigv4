import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { AttributeType, InputFormat, Table } from "aws-cdk-lib/aws-dynamodb";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class StatefulStack extends cdk.Stack {
  readonly table: Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ddbSeedBucket = new Bucket(this, "DdbSeedBucket", {
      bucketName: `fruit-ddb-seed-bucket-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(1),
        },
      ],
      autoDeleteObjects: true,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      enforceSSL: true,
    });

    new BucketDeployment(this, "DeployDdbSeedCsv", {
      sources: [Source.asset(path.join("./ddb-seed"))],
      destinationBucket: ddbSeedBucket,
    });

    this.table = new Table(this, "FruitsTable", {
      tableName: "Fruit",
      partitionKey: {
        name: "name",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "expiration",
        type: AttributeType.STRING,
      },
      importSource: {
        inputFormat: InputFormat.csv(),
        bucket: ddbSeedBucket,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
