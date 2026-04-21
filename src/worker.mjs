import { buildSimulationViewModel, computePreview } from '../server/simulate-engine.mjs';

const MAX_JSON_BODY_BYTES = 4096;

class ApiRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function errorResponse(status, message) {
  return json({ error: message }, { status });
}

async function readJsonPayload(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiRequestError(415, 'Request content-type must be application/json');
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new ApiRequestError(413, `Request body must be ${MAX_JSON_BODY_BYTES} bytes or less`);
  }

  const bodyText = await request.text();
  const bodyBytes = new TextEncoder().encode(bodyText).length;
  if (bodyBytes > MAX_JSON_BODY_BYTES) {
    throw new ApiRequestError(413, `Request body must be ${MAX_JSON_BODY_BYTES} bytes or less`);
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new ApiRequestError(400, 'Request body must be valid JSON');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/simulate') {
      if (request.method !== 'POST') {
        return errorResponse(405, 'Method not allowed');
      }

      let payload;
      try {
        payload = await readJsonPayload(request);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          return errorResponse(error.status, error.message);
        }
        return errorResponse(400, 'Request body must be valid JSON');
      }

      try {
        return json(buildSimulationViewModel(payload));
      } catch (error) {
        return errorResponse(400, error instanceof Error ? error.message : 'Invalid simulation payload');
      }
    }

    if (url.pathname === '/api/preview') {
      if (request.method !== 'POST') {
        return errorResponse(405, 'Method not allowed');
      }

      let payload;
      try {
        payload = await readJsonPayload(request);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          return errorResponse(error.status, error.message);
        }
        return errorResponse(400, 'Request body must be valid JSON');
      }

      try {
        const result = computePreview(payload);
        return json(result);
      } catch (error) {
        return errorResponse(400, error instanceof Error ? error.message : 'Invalid preview payload');
      }
    }

    return env.ASSETS.fetch(request);
  },
};
