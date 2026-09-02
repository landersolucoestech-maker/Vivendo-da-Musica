const evidence = (kind, source, result, details = null) => ({
  kind,
  source,
  result,
  timestamp: new Date().toISOString(),
  ...(details === null ? {} : { details })
});

export const repositoryInventoryStrategy = async ({ input, callTool }) => {
  const paths = input.metadata?.inventoryPaths ?? ['package.json'];
  if (!Array.isArray(paths) || paths.length === 0) throw new Error('Repository inventory requires at least one path');
  const files = [];
  for (const path of paths) {
    const response = await callTool({
      toolId: 'repository.read',
      operation: 'inventory-read',
      input: { path }
    });
    files.push({ path: response.result.path, fingerprint: response.result.fingerprint });
  }
  return {
    output: { files },
    evidence: [evidence('artifact', 'repository-inventory', 'passed', { files })]
  };
};

export const qualityCertificationStrategy = async ({ run, input, callTool }) => {
  const commands = input.metadata?.qualityCommands ?? [
    'engineering:validate',
    'typecheck',
    'lint',
    'test',
    'build',
    'test:performance'
  ];
  if (!Array.isArray(commands) || commands.length === 0) throw new Error('Quality certification requires commands');

  const results = [];
  for (const command of commands) {
    const response = await callTool({
      toolId: 'quality.execute',
      operation: `quality:${command}`,
      input: { command },
      idempotencyKey: `${run.id}:quality:${command}`
    });
    const result = response.result;
    results.push({ command, passed: result.passed, fingerprint: result.fingerprint });
    if (!result.passed) throw new Error(`Quality command failed: ${command}`);
  }

  return {
    output: { commands: results },
    evidence: [
      evidence('test', 'quality.execute', 'passed', { commands: results }),
      evidence('workflow', 'quality-certification', 'passed', { commands: results })
    ]
  };
};

export const builtInStrategies = [
  { agentId: 'repo-archaeologist', skillId: 'repository-inventory', strategy: repositoryInventoryStrategy },
  { agentId: 'quality-engineer', skillId: 'quality-certification', strategy: qualityCertificationStrategy }
];
