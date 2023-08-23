# Remix Serverless

An adapter to use Remix with the Serverless framework as an alternative to the built-in Architect framework adapter that is included with Remix.

Why? Because it allows you to use REST API Gateway instead of HTTP API Gateway which
the Architect adapter enforces. Furthermore, it enables you to use the Serverless
framework to deploy your web client if that is your preference and also the option
to use the new composite functionality of the Serverless framework along with other
Serverless framework stacks.

## Usage

The current way to get started is to bootstrap a new Remix project with the built in
Architect template and then do some modifications.

Add these dependencies:

```
yarn add serverless-remix
yarn add -D serverless serverless-apigateway-service-proxy serverless-s3-sync
```

Modify the `server.js` file in the root:

```js
import { createRequestHandler } from "serverless-remix";
import * as build from "@remix-run/dev/server-build";

export const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  stagePrefix: true,
});
```

The `stagePrefix` is whether you are exposing the site on a subpath, i.e the default
stage path that you get using the REST API Gateway, `dev`, `test` etc.

Modify `remix.config.js` as well:

```js
const { mountRoutes } = require("remix-mount-routes");
const STAGE = "dev";

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  serverBuildTarget: "arc",
  server: "./server.js",
  ignoredRouteFiles: ["**/.*"],
  publicPath: `/${STAGE}/_static/build/`,
  routes: (defineRoutes) => {
    return mountRoutes(`/${STAGE}`, "routes");
  },
};
```

The `mountRoutes` and the line with `` publicPath: `/${STAGE}/\_static/build/ `` is only needed if you don't have the site hosted at the root path as mentioned above.

Add a `serverless.yaml` file that looks something like this:

```=yaml
service: remix

frameworkVersion: '3'

plugins:
  - serverless-s3-sync
  - serverless-apigateway-service-proxy

provider:
  name: aws
  runtime: nodejs14.x
  region: eu-north-1

custom:
  s3Sync:
    - bucketNameKey: AssetsBucketKey
      localDir: public
  apiGatewayServiceProxies:
    - s3:
        path: /_static/{path+}
        method: get
        action: GetObject
        bucket:
          Ref: AssetsBucket
        key:
          pathParam: path

package:
  patterns:
    - "!.cache/**"
    - "!public/**"
    - "!app/**"
    - "!server.js"
    - "!yarn.lock"
    - "!remix.*"
    - "!package.json"
    - "!tsconfig.json"
    - "!.eslintrc"
    - "!README.md"

functions:
  server:
    handler: ./server/index.handler
    memorySize: 1152
    timeout: 30
    events:
      - http:
          method: any
          path: /{proxy+}
      - http:
          method: any
          path: /

resources:
  Resources:
    AssetsBucket:
      Type: AWS::S3::Bucket

  Outputs:
    AssetsBucketKey:
      Value: !Ref AssetsBucket
```

To make this work two Serverless plugins are need. The `serverless-s3-sync` for uploading the Remix public assets and the client build output to the asset bucket and `serverless-apigateway-service-proxy` to enable for API Gateway proxy configuration against S3.

After a successful `remix build` with the defaults running `serverless deploy` will upload the artifacts and create the required infrastructure to host the site.

## AWS CDK

This adapter could just as well be used with AWS CDK. Examples to follow.

## Future improvements

Better packaging of the Remix server lambda artifact, `node_modules` that are either `devDependencies` or transient to those are currently deployed as well.
