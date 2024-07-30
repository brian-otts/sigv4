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
                "application/json": `
                  #set($inputRoot = $input.path('$'))
                  {
                    "items": [
                      #foreach($elem in $inputRoot.Items) {
                        #set($map = $elem.entrySet())
                          {
                            #foreach($entry in $map)
                            #set($type = $entry.value.type)
                            #if($type == "S")
                            "$entry.key": "$entry.value.S"
                            #elseif($type == "N")
                            "$entry.key": $entry.value.N
                            #elseif($type == "BOOL")
                            "$entry.key": $entry.value.BOOL
                            #else
                            "$entry.key": "$entry.value.S"
                            #end
                            #if($foreach.hasNext),#end
                            #end
                          }
                        #if($foreach.hasNext),#end
                      #end
                    ]
                  }
                `.replace(/\n\s+/g, ""),
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
