import fs from 'node:fs';
import path from 'node:path';

const YAML = require(path.join(process.cwd(), 'node_modules', 'yaml', 'dist', 'index.js')) as {
  parse(source: string): unknown;
};

type MatrixEntry = {
  os: string;
  platform: string;
  artifact: string;
  pattern: string;
};

type Workflow = {
  on?: Record<string, unknown>;
  permissions?: Record<string, string>;
  jobs?: {
    package?: {
      'runs-on'?: string;
      strategy?: { matrix?: { include?: MatrixEntry[] } };
      steps?: Array<{
        uses?: string;
        run?: string;
        env?: Record<string, string>;
        with?: Record<string, unknown>;
      }>;
    };
    release?: {
      if?: string;
      needs?: string;
      permissions?: Record<string, string>;
      steps?: Array<{
        uses?: string;
        run?: string;
        env?: Record<string, string>;
        with?: Record<string, unknown>;
      }>;
    };
  };
};

type PackageConfig = {
  build?: {
    win?: { artifactName?: string };
    mac?: { artifactName?: string };
    linux?: { artifactName?: string };
  };
};

describe('desktop release workflow', () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'release.yml');
  const workflow = YAML.parse(fs.readFileSync(workflowPath, 'utf8')) as Workflow;
  const packageConfig = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  ) as PackageConfig;
  const packageJob = workflow.jobs?.package;
  const matrix = packageJob?.strategy?.matrix?.include ?? [];

  it('can be started manually without granting write access', () => {
    expect(workflow.on).toHaveProperty('workflow_dispatch');
    expect(workflow.on?.push).toEqual({ tags: ['v*'] });
    expect(workflow.permissions).toEqual({ contents: 'read' });
  });

  it('builds one native x64 installer on each supported operating system', () => {
    expect(packageJob?.['runs-on']).toBe('${{ matrix.os }}');
    expect(matrix).toEqual([
      {
        os: 'windows-latest',
        platform: 'win',
        artifact: 'chongdong-windows-x64',
        pattern: 'release/*.exe',
      },
      {
        os: 'macos-15-intel',
        platform: 'mac',
        artifact: 'chongdong-macos-x64',
        pattern: 'release/*.dmg',
      },
      {
        os: 'ubuntu-latest',
        platform: 'linux',
        artifact: 'chongdong-linux-x64',
        pattern: 'release/*.AppImage',
      },
    ]);

    const checkoutStep = packageJob?.steps?.find(step => step.uses === 'actions/checkout@v4');
    expect(checkoutStep?.with?.ref).toBeUndefined();

    const commands = packageJob?.steps?.flatMap(step => (step.run ? [step.run] : []));
    expect(commands).toEqual([
      'npm ci',
      'npm run build',
      'npx electron-builder --${{ matrix.platform }} --x64 --publish never',
    ]);
  });

  it('uploads only the installer produced by each matrix job', () => {
    const uploadStep = packageJob?.steps?.find(
      step => step.uses === 'actions/upload-artifact@v4'
    );

    expect(uploadStep?.with).toMatchObject({
      name: '${{ matrix.artifact }}',
      path: '${{ matrix.pattern }}',
      'if-no-files-found': 'error',
    });
  });

  it('gives every public installer a readable platform-specific filename', () => {
    expect(packageConfig.build?.win?.artifactName).toBe(
      'ChongDong-${version}-Windows-x64-Setup.${ext}'
    );
    expect(packageConfig.build?.mac?.artifactName).toBe(
      'ChongDong-${version}-macOS-x64.${ext}'
    );
    expect(packageConfig.build?.linux?.artifactName).toBe(
      'ChongDong-${version}-Linux-x64.${ext}'
    );
  });

  it('publishes all installers to a GitHub release only for version tags', () => {
    const releaseJob = workflow.jobs?.release;
    const downloadStep = releaseJob?.steps?.find(
      step => step.uses === 'actions/download-artifact@v4'
    );

    expect(releaseJob).toMatchObject({
      if: "startsWith(github.ref, 'refs/tags/v')",
      needs: 'package',
      permissions: { contents: 'write' },
    });
    expect(downloadStep?.with).toMatchObject({
      path: 'release',
      'merge-multiple': true,
    });
    const publishStep = releaseJob?.steps?.find(step => step.run?.includes('gh release create'));
    expect(publishStep?.env).toEqual({
      GH_TOKEN: '${{ github.token }}',
      GH_REPO: '${{ github.repository }}',
    });
    expect(publishStep?.run).toEqual(expect.stringContaining('gh release view'));
    expect(publishStep?.run).toEqual(expect.stringContaining('gh release upload'));
    expect(publishStep?.run).toEqual(expect.stringContaining('--clobber'));
    expect(publishStep?.run).toEqual(expect.stringContaining('gh release create'));
  });
});
