import fsp from "fs/promises";
import path from "path";
import lambdaTester from "lambda-tester";
import type { APIGatewayProxyEvent } from "aws-lambda";
import {
  createRequestHandler as createRemixRequestHandler,
  Response as NodeResponse,
} from "@remix-run/node";

import {
  createRequestHandler,
  createRemixHeaders,
  createRemixRequest,
  sendRemixResponse,
} from "../server";

// We don't want to test that the remix server works here (that's what the
// playwright tests do), we just want to test the adapter
jest.mock("@remix-run/node", () => {
  let original = jest.requireActual("@remix-run/node");
  return {
    ...original,
    createRequestHandler: jest.fn(),
  };
});
let mockedCreateRequestHandler =
  createRemixRequestHandler as jest.MockedFunction<
    typeof createRemixRequestHandler
  >;

function createMockEvent(
  event: Partial<APIGatewayProxyEvent>
): APIGatewayProxyEvent {
  let now = new Date();
  let path = event.path ?? "/";
  return {
    body: null,
    resource: "/{proxy+}",
    path,
    httpMethod: "GET",
    isBase64Encoded: false,
    queryStringParameters: {
      foo: "bar",
    },
    multiValueQueryStringParameters: {
      foo: ["bar"],
    },
    pathParameters: {
      proxy: path,
    },
    stageVariables: {
      baz: "qux",
    },
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, sdch",
      "Accept-Language": "en-US,en;q=0.8",
      "Cache-Control": "max-age=0",
      "CloudFront-Forwarded-Proto": "https",
      "CloudFront-Is-Desktop-Viewer": "true",
      "CloudFront-Is-Mobile-Viewer": "false",
      "CloudFront-Is-SmartTV-Viewer": "false",
      "CloudFront-Is-Tablet-Viewer": "false",
      "CloudFront-Viewer-Country": "US",
      Host: "1234567890.execute-api.us-east-1.amazonaws.com",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Custom User Agent String",
      Via: "1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)",
      "X-Amz-Cf-Id": "cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==",
      "X-Forwarded-For": "127.0.0.1, 127.0.0.2",
      "X-Forwarded-Port": "443",
      "X-Forwarded-Proto": "https",
      ...event.headers,
    },
    multiValueHeaders: {
      Accept: [
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      ],
      "Accept-Encoding": ["gzip, deflate, sdch"],
      "Accept-Language": ["en-US,en;q=0.8"],
      "Cache-Control": ["max-age=0"],
      "CloudFront-Forwarded-Proto": ["https"],
      "CloudFront-Is-Desktop-Viewer": ["true"],
      "CloudFront-Is-Mobile-Viewer": ["false"],
      "CloudFront-Is-SmartTV-Viewer": ["false"],
      "CloudFront-Is-Tablet-Viewer": ["false"],
      "CloudFront-Viewer-Country": ["US"],
      Host: ["0123456789.execute-api.us-east-1.amazonaws.com"],
      "Upgrade-Insecure-Requests": ["1"],
      "User-Agent": ["Custom User Agent String"],
      Via: ["1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)"],
      "X-Amz-Cf-Id": [
        "cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==",
      ],
      "X-Forwarded-For": ["127.0.0.1, 127.0.0.2"],
      "X-Forwarded-Port": ["443"],
      "X-Forwarded-Proto": ["https"],
      ...event.multiValueHeaders,
    },
    requestContext: {
      authorizer: null,
      accountId: "123456789012",
      resourceId: "123456",
      stage: "prod",
      requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
      requestTime: now.toISOString(),
      requestTimeEpoch: now.getTime(),
      identity: {
        apiKey: null,
        apiKeyId: null,
        clientCert: null,
        principalOrgId: null,
        cognitoIdentityPoolId: null,
        accountId: null,
        cognitoIdentityId: null,
        caller: null,
        accessKey: null,
        sourceIp: "127.0.0.1",
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent: "Custom User Agent String",
        user: null,
      },
      path,
      resourcePath: "/{proxy+}",
      httpMethod: "GET",
      apiId: "1234567890",
      protocol: "HTTP/1.1",
      ...event.requestContext,
    },
    ...event,
  };
}

describe("serverless createRequestHandler", () => {
  describe("basic requests", () => {
    afterEach(() => {
      mockedCreateRequestHandler.mockReset();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it("handles requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/foo/bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe("URL: /foo/bar");
        });
    });

    it("handles root // requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "//" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe("URL: //");
        });
    });

    it("handles nested // requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "//foo//bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe("URL: //foo//bar");
        });
    });

    it("handles null body", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 200 });
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/foo/bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
        });
    });

    it("handles status codes", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 204 });
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/foo/bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(204);
        });
    });

    it("sets headers", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        let headers = new Headers();
        headers.append("X-Time-Of-Year", "most wonderful");
        headers.append(
          "Set-Cookie",
          "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax"
        );
        headers.append(
          "Set-Cookie",
          "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax"
        );
        headers.append(
          "Set-Cookie",
          "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax"
        );

        return new Response(null, { headers });
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers["x-time-of-year"]).toBe("most wonderful");
          expect(res.multiValueHeaders["Set-Cookie"]).toEqual([
            "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax",
            "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax",
            "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
          ]);
        });
    });
  });
});

describe("serverless createRemixHeaders", () => {
  describe("creates fetch headers from serverless headers", () => {
    it("handles empty headers", () => {
      expect(createRemixHeaders({})).toMatchInlineSnapshot(`
      Headers {
        Symbol(query): Array [],
        Symbol(context): null,
      }
      `);
    });

    it("handles simple headers", () => {
      expect(createRemixHeaders({ "x-foo": ["bar"] })).toMatchInlineSnapshot(`
      Headers {
        Symbol(query): Array [
          "x-foo",
          "bar",
        ],
        Symbol(context): null,
      }
    `);
    });

    it("handles multiple headers", () => {
      expect(createRemixHeaders({ "x-foo": ["bar"], "x-bar": ["baz"] }))
        .toMatchInlineSnapshot(`
        Headers {
          Symbol(query): Array [
            "x-foo",
            "bar",
            "x-bar",
            "baz",
          ],
          Symbol(context): null,
        }
      `);
    });

    it("handles headers with multiple values", () => {
      expect(createRemixHeaders({ "x-foo": ["bar, baz"] }))
        .toMatchInlineSnapshot(`
        Headers {
          Symbol(query): Array [
            "x-foo",
            "bar, baz",
          ],
          Symbol(context): null,
        }
      `);
    });

    it("handles headers with multiple values and multiple headers", () => {
      expect(createRemixHeaders({ "x-foo": ["bar, baz"], "x-bar": ["baz"] }))
        .toMatchInlineSnapshot(`
        Headers {
          Symbol(query): Array [
            "x-foo",
            "bar, baz",
            "x-bar",
            "baz",
          ],
          Symbol(context): null,
        }
      `);
    });

    it("handles cookies", () => {
      expect(
        createRemixHeaders({
          "x-something-else": ["true"],
          Cookie: ["__session=some_value", "__other=some_other_value"],
        })
      ).toMatchInlineSnapshot(`
      Headers {
        Symbol(query): Array [
          "x-something-else",
          "true",
          "cookie",
          "__session=some_value; __other=some_other_value",
        ],
        Symbol(context): null,
      }
    `);
    });
  });
});

describe("serverless createRemixRequest", () => {
  it("creates a request with the correct headers", () => {
    expect(
      createRemixRequest(
        createMockEvent({
          headers: {
            Cookie: "__session=value",
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-encoding": "gzip, deflate",
            "accept-language": "en-US,en;q=0.9",
            host: "localhost:3333",
            "upgrade-insecure-requests": "1",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
          },
          multiValueHeaders: {
            Cookie: ["__session=value"],
            accept: [
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            ],
            "accept-encoding": ["gzip, deflate"],
            "accept-language": ["en-US,en;q=0.9"],
            host: ["localhost:3333"],
            "upgrade-insecure-requests": ["1"],
            "user-agent": [
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
            ],
          },
          path: "/",
          queryStringParameters: undefined,
          multiValueQueryStringParameters: undefined,
        })
      )
    ).toMatchInlineSnapshot(`
      NodeRequest {
        "agent": undefined,
        "compress": true,
        "counter": 0,
        "follow": 20,
        "highWaterMark": 16384,
        "insecureHTTPParser": false,
        "size": 0,
        Symbol(Body internals): Object {
          "body": null,
          "boundary": null,
          "disturbed": false,
          "error": null,
          "size": 0,
          "type": null,
        },
        Symbol(Request internals): Object {
          "credentials": "same-origin",
          "headers": Headers {
            Symbol(query): Array [
              "accept",
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "accept-encoding",
              "gzip, deflate",
              "accept-language",
              "en-US,en;q=0.9",
              "cookie",
              "__session=value",
              "host",
              "localhost:3333",
              "upgrade-insecure-requests",
              "1",
              "user-agent",
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
            ],
            Symbol(context): null,
          },
          "method": "GET",
          "parsedURL": "https://localhost:3333/",
          "redirect": "follow",
          "signal": AbortSignal {},
        },
      }
    `);
  });
});

describe("sendRemixResponse", () => {
  it("handles regular responses", async () => {
    let response = new NodeResponse("anything");
    let result = await sendRemixResponse(response);
    expect(result.body).toBe("anything");
  });

  it("handles resource routes with regular data", async () => {
    let json = JSON.stringify({ foo: "bar" });
    let response = new NodeResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "content-length": json.length.toString(),
      },
    });

    let result = await sendRemixResponse(response);

    expect(result.body).toMatch(json);
  });

  it("handles resource routes with binary data", async () => {
    let image = await fsp.readFile(path.join(__dirname, "554828.jpeg"));

    let response = new NodeResponse(image, {
      headers: {
        "content-type": "image/jpeg",
        "content-length": image.length.toString(),
      },
    });

    let result = await sendRemixResponse(response);

    expect(result.body).toMatch(image.toString("base64"));
  });
});
