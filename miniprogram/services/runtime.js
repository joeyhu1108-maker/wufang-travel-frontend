function resolveRuntime(config, version = 'develop') {
  const envVersion = ['develop', 'trial', 'release'].includes(version) ? version : 'release';
  const preview = config.mode === 'preview' && envVersion === 'develop';
  const env = config.environments[envVersion];
  const configured = config.mode === 'cloud' && typeof env === 'string' && env.trim().length > 0 && !/REPLACE|PLACEHOLDER/i.test(env);
  return { envVersion, preview, env, configured };
}

module.exports = { resolveRuntime };
