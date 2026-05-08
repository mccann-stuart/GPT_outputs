import { buildSimulationViewModel, computePreview } from '../server/simulate-engine.mjs';

const MAX_JSON_BODY_BYTES = 4096;
const MAX_UPLOAD_BODY_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_FILE_BYTES = 512 * 1024;
const SAFE_DELIVERABLE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jsx|mjs)$/;
const LOCAL_IMPORT_PATTERN = /\b(?:import\s+[^'"]*?from|export\s+[^'"]*?from|import\s*\()\s*['"](\.[^'"]+)['"]/g;
const GITHUB_API_VERSION = '2022-11-28';

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

function isSafeDeliverableFile(value) {
  return typeof value === 'string' && SAFE_DELIVERABLE_FILE.test(value);
}

function isSafeSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{7,40}$/i.test(value);
}

function parseGithubRepo(env) {
  const repo = env.GITHUB_REPO || 'mccann-stuart/GPT_outputs';
  const [owner, name] = repo.split('/');
  if (!owner || !name || repo.split('/').length !== 2) {
    throw new ApiRequestError(500, 'GITHUB_REPO must be shaped as owner/repo');
  }
  return { owner, name, repo };
}

function getGithubBranch(env) {
  return env.GITHUB_BRANCH || 'main';
}

function getGithubAuthor(env) {
  if (!env.GITHUB_AUTHOR_NAME && !env.GITHUB_AUTHOR_EMAIL) return undefined;
  return {
    name: env.GITHUB_AUTHOR_NAME || 'GPT Outputs Upload',
    email: env.GITHUB_AUTHOR_EMAIL || 'uploads@gpt-outputs.local',
  };
}

function githubHeaders(env) {
  if (!env.GITHUB_UPLOAD_TOKEN) {
    throw new ApiRequestError(500, 'GITHUB_UPLOAD_TOKEN is not configured');
  }
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${env.GITHUB_UPLOAD_TOKEN}`,
    'content-type': 'application/json',
    'user-agent': 'gpt-outputs-cloudflare-upload',
    'x-github-api-version': GITHUB_API_VERSION,
  };
}

async function githubRequest(env, path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      ...githubHeaders(env),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const detail = body?.message ? `: ${body.message}` : '';
    throw new ApiRequestError(502, `GitHub API request failed (${response.status})${detail}`);
  }

  return body;
}

async function githubRequestMaybe404(env, path, init = {}) {
  try {
    return await githubRequest(env, path, init);
  } catch (error) {
    if (error instanceof ApiRequestError && /GitHub API request failed \(404\)/.test(error.message)) {
      return null;
    }
    throw error;
  }
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function parseManifestJson(text) {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('manifest is not an array');
    }
    return parsed.filter(isSafeDeliverableFile).sort();
  } catch {
    throw new ApiRequestError(502, 'Existing jsx-manifest.json is invalid');
  }
}

function toManifestJson(files) {
  return `${JSON.stringify([...new Set(files)].sort(), null, 2)}\n`;
}

function decodeBase64Content(value) {
  const normalized = String(value || '').replace(/\s/g, '');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeLocalImport(specifier) {
  if (!specifier.startsWith('./')) return null;
  const withoutPrefix = specifier.slice(2);
  if (!withoutPrefix || withoutPrefix.includes('/') || withoutPrefix.includes('\\') || withoutPrefix.startsWith('.')) {
    throw new ApiRequestError(400, `Uploaded JSX imports must be flat local files: ${specifier}`);
  }
  if (!withoutPrefix.endsWith('.mjs')) {
    throw new ApiRequestError(400, `Uploaded JSX may only import flat local .mjs files: ${specifier}`);
  }
  if (!isSafeDeliverableFile(withoutPrefix)) {
    throw new ApiRequestError(400, `Uploaded JSX imports an unsafe file name: ${specifier}`);
  }
  return withoutPrefix;
}

function findRequiredMjsImports(jsxText) {
  const required = new Set();
  for (const match of jsxText.matchAll(LOCAL_IMPORT_PATTERN)) {
    const normalized = normalizeLocalImport(match[1]);
    if (normalized) required.add(normalized);
  }
  return required;
}

async function readUploadFiles(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new ApiRequestError(415, 'Request content-type must be multipart/form-data');
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_UPLOAD_BODY_BYTES) {
    throw new ApiRequestError(413, `Upload body must be ${MAX_UPLOAD_BODY_BYTES} bytes or less`);
  }

  const form = await request.formData();
  const files = [];
  for (const value of form.values()) {
    if (typeof value === 'string') {
      throw new ApiRequestError(400, 'Upload form fields must be files');
    }
    files.push(value);
  }

  if (files.length === 0) {
    throw new ApiRequestError(400, 'Upload must include one .jsx file and optional .mjs files');
  }

  const seen = new Set();
  const uploads = [];
  let totalBytes = 0;
  for (const file of files) {
    const name = file.name || '';
    if (!isSafeDeliverableFile(name)) {
      throw new ApiRequestError(400, `Unsafe or unsupported file name: ${name || '(unnamed file)'}`);
    }
    if (seen.has(name)) {
      throw new ApiRequestError(400, `Duplicate uploaded file name: ${name}`);
    }
    seen.add(name);
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      throw new ApiRequestError(413, `${name} must be ${MAX_UPLOAD_FILE_BYTES} bytes or less`);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_UPLOAD_BODY_BYTES) {
      throw new ApiRequestError(413, `Upload body must be ${MAX_UPLOAD_BODY_BYTES} bytes or less`);
    }
    uploads.push({ name, text: await file.text() });
  }

  const jsxFiles = uploads.filter((file) => file.name.endsWith('.jsx'));
  if (jsxFiles.length !== 1) {
    throw new ApiRequestError(400, 'Upload must include exactly one .jsx file');
  }

  const uploadedNames = new Set(uploads.map((file) => file.name));
  const requiredImports = findRequiredMjsImports(jsxFiles[0].text);
  for (const importedFile of requiredImports) {
    if (!uploadedNames.has(importedFile)) {
      throw new ApiRequestError(400, `Uploaded JSX imports missing file: ${importedFile}`);
    }
  }

  return { uploads, jsxFile: jsxFiles[0].name };
}

async function createGithubUploadCommit(env, uploads, jsxFile) {
  const { owner, name } = parseGithubRepo(env);
  const branch = getGithubBranch(env);
  const refPath = encodeURIComponent(`heads/${branch}`);
  const ref = await githubRequest(env, `/repos/${owner}/${name}/git/ref/${refPath}`);
  const headSha = ref?.object?.sha;
  if (!headSha) {
    throw new ApiRequestError(502, 'GitHub branch ref did not include a commit SHA');
  }

  const headCommit = await githubRequest(env, `/repos/${owner}/${name}/git/commits/${headSha}`);
  const baseTree = headCommit?.tree?.sha;
  if (!baseTree) {
    throw new ApiRequestError(502, 'GitHub commit did not include a tree SHA');
  }

  const manifest = await githubRequestMaybe404(
    env,
    `/repos/${owner}/${name}/contents/${encodePath('jsx-manifest.json')}?ref=${encodeURIComponent(branch)}`,
  );
  const existingManifest = manifest?.content ? parseManifestJson(decodeBase64Content(manifest.content)) : [];
  const manifestJson = toManifestJson([...existingManifest, jsxFile]);

  const tree = [];
  for (const upload of uploads) {
    const blob = await githubRequest(env, `/repos/${owner}/${name}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({
        content: upload.text,
        encoding: 'utf-8',
      }),
    });
    tree.push({
      path: upload.name,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const manifestBlob = await githubRequest(env, `/repos/${owner}/${name}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({
      content: manifestJson,
      encoding: 'utf-8',
    }),
  });
  tree.push({
    path: 'jsx-manifest.json',
    mode: '100644',
    type: 'blob',
    sha: manifestBlob.sha,
  });

  const newTree = await githubRequest(env, `/repos/${owner}/${name}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTree,
      tree,
    }),
  });

  const commitBody = {
    message: `Add uploaded deliverable ${jsxFile}`,
    tree: newTree.sha,
    parents: [headSha],
  };
  const author = getGithubAuthor(env);
  if (author) {
    commitBody.author = author;
    commitBody.committer = author;
  }

  const commit = await githubRequest(env, `/repos/${owner}/${name}/git/commits`, {
    method: 'POST',
    body: JSON.stringify(commitBody),
  });

  await githubRequest(env, `/repos/${owner}/${name}/git/refs/${refPath}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: commit.sha,
      force: false,
    }),
  });

  return commit.sha;
}

function cacheBustedUrl(requestUrl, file, sha) {
  const origin = new URL(requestUrl).origin;
  const url = new URL(`/${file}`, origin);
  url.searchParams.set('deploy', sha);
  url.searchParams.set('t', Date.now().toString(36));
  return url;
}

async function checkHostedFile(requestUrl, file, sha) {
  const response = await fetch(cacheBustedUrl(requestUrl, file, sha), {
    headers: { accept: 'text/plain,*/*' },
  });
  return response.ok;
}

async function handleUploadDeliverable(request, env) {
  if (request.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  const { uploads, jsxFile } = await readUploadFiles(request);
  const commitSha = await createGithubUploadCommit(env, uploads, jsxFile);
  const openUrl = `/?file=${encodeURIComponent(jsxFile)}&deploy=${encodeURIComponent(commitSha)}`;
  const statusUrl = `/api/upload-status?file=${encodeURIComponent(jsxFile)}&sha=${encodeURIComponent(commitSha)}`;

  return json({
    jsxFile,
    commitSha,
    statusUrl,
    openUrl,
  });
}

async function handleUploadStatus(request) {
  if (request.method !== 'GET') {
    return errorResponse(405, 'Method not allowed');
  }

  const url = new URL(request.url);
  const file = url.searchParams.get('file') || '';
  const sha = url.searchParams.get('sha') || '';
  if (!isSafeDeliverableFile(file) || !file.endsWith('.jsx')) {
    throw new ApiRequestError(400, 'Upload status requires a safe .jsx file name');
  }
  if (!isSafeSha(sha)) {
    throw new ApiRequestError(400, 'Upload status requires a commit SHA');
  }

  const jsxReady = await checkHostedFile(request.url, file, sha);
  if (!jsxReady) {
    return json({
      ready: false,
      message: 'Repo commit succeeded, waiting for Cloudflare to serve the uploaded JSX.',
    });
  }

  const jsxResponse = await fetch(cacheBustedUrl(request.url, file, sha));
  const jsxText = await jsxResponse.text();
  const requiredImports = findRequiredMjsImports(jsxText);
  for (const importedFile of requiredImports) {
    const mjsReady = await checkHostedFile(request.url, importedFile, sha);
    if (!mjsReady) {
      return json({
        ready: false,
        message: `Repo commit succeeded, waiting for Cloudflare to serve ${importedFile}.`,
      });
    }
  }

  return json({
    ready: true,
    message: 'Uploaded deliverable is hosted on this site.',
    openUrl: `/?file=${encodeURIComponent(file)}&deploy=${encodeURIComponent(sha)}`,
  });
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

    try {
      if (url.pathname === '/api/upload-deliverable') {
        return await handleUploadDeliverable(request, env);
      }

      if (url.pathname === '/api/upload-status') {
        return await handleUploadStatus(request);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return errorResponse(error.status, error.message);
      }
      return errorResponse(500, error instanceof Error ? error.message : 'Upload request failed');
    }

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
