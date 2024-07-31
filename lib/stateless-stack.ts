import * as cdk from "aws-cdk-lib";
import { AwsIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface StatelessStackProps extends cdk.StackProps {
  fruitTable: Table;
}

export class StatelessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatelessStackProps) {
    super(scope, id, props);

    const api = new RestApi(this, "FruitsApi", {
      restApiName: "fruits-rest-api",
      deployOptions: {
        stageName: "dev",
      },
    });

    const role = new Role(this, "ApiGatewayDynamoDBRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });

    props.fruitTable.grantReadData(role);

    const intResponseList = `
      #set($inputRoot = $input.path('$'))
      [
        #foreach($item in $inputRoot.Items)
          {
            "name": "$item.name.S",
            "expiration": "$item.expiration.S",
            "color": "$item.color.S",
            "count": $item.count.N
          }#if($foreach.hasNext),#end
        #end
      ]
    `.replace(/\n\s+/g, "");

    const fruitsResource = api.root.addResource("fruits");
    fruitsResource.addMethod(
      "GET",
      new AwsIntegration({
        service: "dynamodb",
        action: "Scan",
        options: {
          credentialsRole: role,
          requestTemplates: {
            "application/json": JSON.stringify({
              TableName: props.fruitTable.tableName,
            }),
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": intResponseList,
              },
            },
          ],
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
          },
        ],
      }
    );

    const fruitResource = fruitsResource.addResource("{name}");
    fruitResource.addMethod(
      "GET",
      new AwsIntegration({
        service: "dynamodb",
        action: "Query",
        options: {
          credentialsRole: role,
          requestTemplates: {
            "application/json": JSON.stringify({
              TableName: props.fruitTable.tableName,
              KeyConditionExpression: "name = :name",
              ExpressionAttributeValues: {
                ":name": {
                  S: "$input.params('name')",
                },
              },
            }),
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": intResponseList,
              },
            },
          ],
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
          },
        ],
      }
    );
  }
}
