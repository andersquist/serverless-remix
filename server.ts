import type {
  AppLoadContext,
  ServerBuild,
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from "@remix-run/node";
import {
  AbortController as NodeAbortController,
  Headers as NodeHeaders,
  Request as NodeRequest,
  createRequestHandler as createRemixRequestHandler,
  readableStreamToString,
} from "@remix-run/node";
import type {
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";

import { isBinaryType } from "./binaryTypes";

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (
  event: APIGatewayProxyEvent
) => AppLoadContext;

export type RequestHandler = APIGatewayProxyHandler;

/**
 * Returns a request handler for an AWS Lambda that serves the response using
 * Remix.
 */
export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
  stagePrefix = true,
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
  stagePrefix?: boolean;
}): RequestHandler {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (event) => {
    let request = createRemixRequest(event, stagePrefix);
    let loadContext = getLoadContext?.(event);

    let response = (await handleRequest(request, loadContext)) as NodeResponse;

    return sendRemixResponse(response);
  };
}

export function createRemixRequest(
  event: APIGatewayProxyEvent,
  stagePrefix?: boolean
): NodeRequest {
  // console.log(event);
  // Either we're exposed on the API Gateway stage path /dev, /prod etc or
  // at the root path if using a custom domain
  let { path } = stagePrefix ? event.requestContext : event;
  let lowerCaseHeaders = Object.fromEntries(
    Object.entries(event.headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  let host = lowerCaseHeaders["x-forwarded-host"] || lowerCaseHeaders.host;
  let search = new URLSearchParams(
    (event.multiValueQueryStringParameters as any) || {}
  ).toString();
  let scheme = process.env.IS_OFFLINE ? "http" : "https";
  let url = new URL(
    `${path}${search ? "?" + search : ""}`,
    `${scheme}://${host}`
  );
  let isFormData = lowerCaseHeaders["content-type"]?.includes(
    "multipart/form-data"
  );

  // Note: No current way to abort these for Architect, but our router expects
  // requests to contain a signal so it can detect aborted requests
  let controller = new NodeAbortController();

  return new NodeRequest(url.href, {
    method: event.httpMethod,
    headers: createRemixHeaders(event.multiValueHeaders),
    signal: controller.signal as NodeRequestInit["signal"],
    body:
      event.body && event.isBase64Encoded
        ? isFormData
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "base64").toString()
        : event.body,
  });
}

export function createRemixHeaders(
  requestHeaders: APIGatewayProxyEventMultiValueHeaders
): NodeHeaders {
  let headers = new NodeHeaders();
  for (let [header, value] of Object.entries(requestHeaders)) {
    if (value) {
      if (header.toLowerCase() === "cookie") {
        headers.append(header, value.join("; "));
      } else {
        headers.append(header, value.join(","));
      }
    }
  }
  return headers;
}

export async function sendRemixResponse(
  nodeResponse: NodeResponse
): Promise<APIGatewayProxyResult> {
  let cookies: string[] = [];

  // AWS API Gateway will send back set-cookies outside of response headers.
  for (let [key, values] of Object.entries(nodeResponse.headers.raw())) {
    if (key.toLowerCase() === "set-cookie") {
      for (let value of values) {
        cookies.push(value);
      }
    }
  }

  if (cookies.length) {
    nodeResponse.headers.delete("Set-Cookie");
  }

  let contentType = nodeResponse.headers.get("Content-Type");
  let isBase64Encoded = isBinaryType(contentType);
  let body: string = "";

  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, "base64");
    } else {
      body = await nodeResponse.text();
    }
  }

  return {
    statusCode: nodeResponse.status,
    headers: Object.fromEntries(nodeResponse.headers),
    multiValueHeaders: {
      "Set-Cookie": cookies,
    },
    body,
    isBase64Encoded,
  };
}
