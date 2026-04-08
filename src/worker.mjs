import { buildSimulationViewModel, computePreview } from '../server/simulate-engine.mjs';

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/simulate') {
      if (request.method !== 'POST') {
        return errorResponse(405, 'Method not allowed');
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
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
        payload = await request.json();
      } catch {
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
