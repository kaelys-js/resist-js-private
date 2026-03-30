# Pulumi (IaC) Lint Rules

Implement the **Pulumi Infrastructure as Code** lint rules (15 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/pulumi/`

File patterns: `**/iac/**/*.ts`, `**/bac/**/*.ts`, `**/pulumi/**/*.ts`, `**/index.ts` (in pulumi directories)

---

## Rules

### 1. `pulumi/no-hardcoded-values`

**What it catches:** Hardcoded strings for environment-specific values

**Why:** Environment-specific values should come from Pulumi config for portability

**Detection:** String literals in resource properties that look like:
- Domain names, URLs
- Account IDs, region names
- Bucket names, database names
- IP addresses, CIDR blocks
- Email addresses

```typescript
// ❌ Bad
const bucket = new aws.s3.Bucket('bucket', {
  bucket: 'my-company-prod-assets',  // Hardcoded name
});

const zone = new cloudflare.Zone('zone', {
  zone: 'mycompany.com',  // Hardcoded domain
  accountId: 'abc123def456',  // Hardcoded account ID
});

const worker = new cloudflare.Worker('api', {
  name: 'production-api-worker',  // Hardcoded name
});

const db = new aws.rds.Instance('db', {
  instanceClass: 'db.t3.medium',
  allocatedStorage: 100,
  // Fine - these are resource specs, not environment-specific
});

// ✅ Good
const config = new pulumi.Config();
const projectConfig = new pulumi.Config('project');

const bucket = new aws.s3.Bucket('bucket', {
  bucket: config.require('bucketName'),
});

const zone = new cloudflare.Zone('zone', {
  zone: projectConfig.require('domain'),
  accountId: config.require('cloudflareAccountId'),
});

const worker = new cloudflare.Worker('api', {
  name: pulumi.interpolate`${stack}-api-worker`,
});
```

**Error message:** `Hardcoded value '${value}' should use pulumi.Config instead`

**Tip:** `Use config.require('${suggestedKey}') or config.get('${suggestedKey}')`

---

### 2. `pulumi/resource-naming`

**What it catches:** Resources without consistent naming convention

**Why:** Resource names should include project/stack for identification and collision prevention

**Detection:** Resource constructor first argument (logical name) that doesn't follow pattern

```typescript
// ❌ Bad - generic names
new cloudflare.Worker('worker', { ... });
new aws.s3.Bucket('bucket', { ... });
new cloudflare.KVNamespace('kv', { ... });
new aws.lambda.Function('function', { ... });

// ❌ Bad - inconsistent patterns
new cloudflare.Worker('myApiWorker', { ... });
new aws.s3.Bucket('assets-bucket', { ... });
new cloudflare.D1Database('UsersDB', { ... });

// ✅ Good - consistent pattern: {project}-{resource}-{purpose}
const project = pulumi.getProject();
const stack = pulumi.getStack();

new cloudflare.Worker(`${project}-api`, { ... });
new aws.s3.Bucket(`${project}-assets`, { ... });
new cloudflare.KVNamespace(`${project}-sessions`, { ... });
new cloudflare.D1Database(`${project}-users`, { ... });

// ✅ Good - or with stack for multi-env
new cloudflare.Worker(`${project}-${stack}-api`, { ... });
```

**Error message:** `Resource name '${name}' should follow naming convention: {project}-{purpose}`

**Tip:** `Use template literal with project/stack: \`\${project}-${suggestedName}\``

---

### 3. `pulumi/require-tags`

**What it catches:** Cloud resources without required tags/labels

**Why:** Tags needed for cost allocation, ownership, organization, and compliance

**Detection:** Resource constructors for taggable resources without `tags` property containing required keys

**Required tags:**
- `Environment` (or `env`)
- `Project` (or `project`)
- `ManagedBy` (should be `pulumi`)
- `Owner` (optional but recommended)

```typescript
// ❌ Bad - no tags
new aws.s3.Bucket('bucket', {
  bucket: bucketName,
});

new aws.lambda.Function('fn', {
  runtime: 'nodejs20.x',
  handler: 'index.handler',
});

// ❌ Bad - missing required tags
new aws.s3.Bucket('bucket', {
  bucket: bucketName,
  tags: {
    Name: 'my-bucket',  // Missing Environment, Project, ManagedBy
  },
});

// ✅ Good
const defaultTags = {
  Environment: stack,
  Project: project,
  ManagedBy: 'pulumi',
  Owner: 'platform-team',
};

new aws.s3.Bucket('bucket', {
  bucket: bucketName,
  tags: {
    ...defaultTags,
    Name: `${project}-assets`,
  },
});

new aws.lambda.Function('fn', {
  runtime: 'nodejs20.x',
  handler: 'index.handler',
  tags: defaultTags,
});

// ✅ Good - using Pulumi transformations for automatic tagging
// (This is set up at stack level, so individual resources don't need tags)
```

**Error message:** `Resource missing required tags: ${missingTags.join(', ')}`

**Tip:** `Add tags: { Environment: stack, Project: project, ManagedBy: 'pulumi' }`

---

### 4. `pulumi/no-secret-in-code`

**What it catches:** Secrets/credentials as plain strings in code

**Why:** Secrets should use Pulumi's secret handling for encryption at rest

**Detection:**
- String literals that look like secrets (API keys, tokens, passwords)
- Variable names suggesting secrets without `config.requireSecret()`
- Known secret patterns (AWS keys, Cloudflare tokens, etc.)

```typescript
// ❌ Bad - plaintext secrets
const apiKey = 'sk_live_1234567890abcdef';
const dbPassword = 'supersecretpassword123';
const cloudflareToken = 'v1.0-abc123-xyz789';

const worker = new cloudflare.Worker('api', {
  secretTextBindings: [{
    name: 'API_KEY',
    text: 'sk_live_1234567890abcdef',  // Plaintext!
  }],
});

// ❌ Bad - using get() instead of getSecret()
const config = new pulumi.Config();
const apiKey = config.get('apiKey');  // Not marked as secret

// ✅ Good
const config = new pulumi.Config();
const apiKey = config.requireSecret('apiKey');
const dbPassword = config.requireSecret('dbPassword');

const worker = new cloudflare.Worker('api', {
  secretTextBindings: [{
    name: 'API_KEY',
    text: apiKey,  // pulumi.Output<string> from secret config
  }],
});

// ✅ Good - secrets from external secret manager
const secret = aws.secretsmanager.getSecretVersion({
  secretId: 'prod/api/keys',
});
```

**Error message:** `Secret value should use config.requireSecret() not plaintext`

**Tip:** `Store in Pulumi config with: pulumi config set --secret ${keyName}`

---

### 5. `pulumi/no-destroy-without-protect`

**What it catches:** Stateful resources without deletion protection

**Why:** Databases, storage, and other stateful resources should be protected from accidental deletion

**Detection:** Resource constructors for stateful resources without `protect: true` in ResourceOptions

**Stateful resources:**
- Databases (RDS, D1, PlanetScale, etc.)
- Storage (S3, R2, GCS)
- KV stores
- Queues with data
- DNS zones

```typescript
// ❌ Bad - no protection on stateful resource
new aws.rds.Instance('db', {
  engine: 'postgres',
  instanceClass: 'db.t3.medium',
});

new cloudflare.D1Database('users-db', {
  name: 'users',
  accountId: accountId,
});

new aws.s3.Bucket('data', {
  bucket: 'critical-data-bucket',
});

// ✅ Good - protected stateful resources
new aws.rds.Instance('db', {
  engine: 'postgres',
  instanceClass: 'db.t3.medium',
}, { protect: true });

new cloudflare.D1Database('users-db', {
  name: 'users',
  accountId: accountId,
}, { protect: true });

new aws.s3.Bucket('data', {
  bucket: 'critical-data-bucket',
}, {
  protect: true,
  retainOnDelete: true,  // Extra safety
});

// ✅ Good - explicitly not protected with comment
new cloudflare.D1Database('temp-db', {
  name: 'temp-testing',
  accountId: accountId,
}, {
  protect: false,  // Intentionally unprotected - temporary resource
});
```

**Error message:** `Stateful resource '${name}' should have { protect: true } to prevent accidental deletion`

**Tip:** `Add resource options: new Resource('name', props, { protect: true })`

---

### 6. `pulumi/no-apply-in-apply`

**What it catches:** Nested `.apply()` calls

**Why:** Nested applies are hard to read; use `pulumi.all()` instead

**Detection:** `.apply()` call containing another `.apply()` in the callback

```typescript
// ❌ Bad - nested applies
const result = output1.apply(v1 =>
  output2.apply(v2 =>
    v1 + v2
  )
);

const url = bucket.bucket.apply(name =>
  region.apply(r =>
    `https://${name}.s3.${r}.amazonaws.com`
  )
);

// ❌ Bad - deeply nested
const config = a.apply(aVal =>
  b.apply(bVal =>
    c.apply(cVal =>
      `${aVal}-${bVal}-${cVal}`
    )
  )
);

// ✅ Good - use pulumi.all()
const result = pulumi.all([output1, output2]).apply(([v1, v2]) =>
  v1 + v2
);

const url = pulumi.all([bucket.bucket, region]).apply(([name, r]) =>
  `https://${name}.s3.${r}.amazonaws.com`
);

const config = pulumi.all([a, b, c]).apply(([aVal, bVal, cVal]) =>
  `${aVal}-${bVal}-${cVal}`
);

// ✅ Good - or use pulumi.interpolate for strings
const url = pulumi.interpolate`https://${bucket.bucket}.s3.${region}.amazonaws.com`;
```

**Error message:** `Nested .apply() calls - use pulumi.all([...]).apply() instead`

**Tip:** `Refactor to: pulumi.all([output1, output2]).apply(([v1, v2]) => ...)`

---

### 7. `pulumi/prefer-interpolate`

**What it catches:** String concatenation with outputs using `.apply()`

**Why:** `pulumi.interpolate` is cleaner for string building with outputs

**Detection:** `.apply()` where callback returns template literal or string concatenation

```typescript
// ❌ Bad - apply for simple string building
const url = bucket.bucket.apply(name => `https://${name}.example.com`);

const arn = pulumi.all([region, accountId, functionName]).apply(
  ([r, a, f]) => `arn:aws:lambda:${r}:${a}:function:${f}`
);

const endpoint = host.apply(h => 'https://' + h + '/api');

// ✅ Good - use interpolate
const url = pulumi.interpolate`https://${bucket.bucket}.example.com`;

const arn = pulumi.interpolate`arn:aws:lambda:${region}:${accountId}:function:${functionName}`;

const endpoint = pulumi.interpolate`https://${host}/api`;

// ✅ apply is fine for complex transformations
const processed = data.apply(d => {
  const parsed = JSON.parse(d);
  return transform(parsed);
});
```

**Error message:** `Use pulumi.interpolate instead of .apply() for string building`

**Tip:** `Replace with: pulumi.interpolate\`...\${output}...\``

---

### 8. `pulumi/export-outputs`

**What it catches:** Important resource values not exported as stack outputs

**Why:** Outputs needed for cross-stack references, CI/CD, and debugging

**Detection:** Resources created but their important properties not in `export` statements

**Important properties to export:**
- URLs, endpoints, hostnames
- ARNs, IDs, names
- Connection strings (without secrets)

```typescript
// ❌ Bad - resources created but outputs not exported
const bucket = new aws.s3.Bucket('bucket', { ... });
const api = new cloudflare.Worker('api', { ... });
const db = new aws.rds.Instance('db', { ... });
// Nothing exported!

// ❌ Bad - only some outputs exported
const bucket = new aws.s3.Bucket('bucket', { ... });
export const bucketName = bucket.bucket;
// Missing: bucketArn, bucketDomainName

// ✅ Good - export important outputs
const bucket = new aws.s3.Bucket('bucket', { ... });
export const bucketName = bucket.bucket;
export const bucketArn = bucket.arn;
export const bucketEndpoint = bucket.bucketDomainName;

const api = new cloudflare.Worker('api', { ... });
export const apiUrl = pulumi.interpolate`https://${api.name}.workers.dev`;

const db = new aws.rds.Instance('db', { ... });
export const dbEndpoint = db.endpoint;
export const dbPort = db.port;
// Note: Don't export password!
```

**Error message:** `Resource '${name}' created but no outputs exported`

**Tip:** `Export important values: export const ${name}Arn = ${name}.arn;`

---

### 9. `pulumi/depends-on-explicit`

**What it catches:** Implicit dependencies that should be explicit

**Why:** Explicit `dependsOn` makes deployment order clear and prevents race conditions

**Detection:**
- Resources that reference other resources only in string interpolation
- Resources where order matters but dependency isn't through property reference
- IAM roles/policies that must exist before being attached

```typescript
// ❌ Bad - implicit dependency through string might not be tracked
const role = new aws.iam.Role('role', { ... });
const policy = new aws.iam.RolePolicy('policy', {
  role: role.name,  // Pulumi tracks this
});
const lambda = new aws.lambda.Function('fn', {
  role: pulumi.interpolate`arn:aws:iam::${accountId}:role/${role.name}`,  // Might not track!
});

// ❌ Bad - order matters but no dependency
const migration = new command.local.Command('migrate', {
  create: 'npm run db:migrate',
});
const seed = new command.local.Command('seed', {
  create: 'npm run db:seed',
  // Should run after migration!
});

// ✅ Good - explicit dependency
const lambda = new aws.lambda.Function('fn', {
  role: role.arn,  // Direct reference - Pulumi tracks
});

// ✅ Good - explicit dependsOn for command ordering
const migration = new command.local.Command('migrate', {
  create: 'npm run db:migrate',
});
const seed = new command.local.Command('seed', {
  create: 'npm run db:seed',
}, { dependsOn: [migration] });

// ✅ Good - explicit for clarity even when Pulumi might infer
const listener = new aws.lb.Listener('listener', {
  loadBalancerArn: alb.arn,
  // ...
}, { dependsOn: [alb, targetGroup] });
```

**Error message:** `Resource '${name}' may have implicit dependency on '${other}' - consider explicit dependsOn`

**Tip:** `Add { dependsOn: [${dependency}] } for clear ordering`

---

### 10. `pulumi/no-get-in-apply`

**What it catches:** Using Pulumi `get*` functions inside `.apply()`

**Why:** `get*` functions are synchronous lookups, should be outside async context

**Detection:** `apply()` callback containing calls to:
- `aws.*.get*`
- `cloudflare.*.get*`
- Any provider's data source functions

```typescript
// ❌ Bad - get inside apply
const config = output.apply(async (value) => {
  const vpc = await aws.ec2.getVpc({ id: value.vpcId });  // Async in apply
  return vpc.cidrBlock;
});

const zone = domainName.apply(async (domain) => {
  return await cloudflare.getZone({ name: domain });
});

// ✅ Good - get outside, use result in apply
const vpc = aws.ec2.getVpc({ id: vpcId });
const cidr = pulumi.output(vpc).apply(v => v.cidrBlock);

// ✅ Good - or use output version of get
const zone = cloudflare.getZoneOutput({ name: domainName });

// ✅ Good - chain properly
const zoneId = cloudflare.getZoneOutput({ name: domainName }).apply(z => z.id);
```

**Error message:** `Avoid calling get* functions inside .apply() - use *Output version or call outside`

**Tip:** `Use cloudflare.getZoneOutput() instead of getZone() inside apply`

---

### 11. `pulumi/stack-reference-type`

**What it catches:** Stack references without proper typing

**Why:** Type safety for cross-stack values

**Detection:** `StackReference.getOutput()` without type parameter or assertion

```typescript
// ❌ Bad - untyped stack reference
const networkStack = new pulumi.StackReference('org/network/prod');
const vpcId = networkStack.getOutput('vpcId');  // any type

const subnetIds = networkStack.getOutput('subnetIds');
subnetIds.apply(ids => ids.map(...));  // ids is any

// ✅ Good - typed stack reference
interface NetworkOutputs {
  vpcId: string;
  subnetIds: string[];
  securityGroupId: string;
}

const networkStack = new pulumi.StackReference('org/network/prod');
const vpcId = networkStack.getOutput('vpcId') as pulumi.Output<string>;

// ✅ Good - or use requireOutput with type
const subnetIds = networkStack.requireOutput('subnetIds') as pulumi.Output<string[]>;

// ✅ Good - typed helper
function getNetworkOutputs(stackRef: pulumi.StackReference): NetworkOutputs {
  return {
    vpcId: stackRef.requireOutput('vpcId') as pulumi.Output<string>,
    subnetIds: stackRef.requireOutput('subnetIds') as pulumi.Output<string[]>,
    securityGroupId: stackRef.requireOutput('securityGroupId') as pulumi.Output<string>,
  };
}
```

**Error message:** `StackReference.getOutput() should have type annotation`

**Tip:** `Add type: getOutput('key') as pulumi.Output<ExpectedType>`

---

### 12. `pulumi/no-preview-only-code`

**What it catches:** Code paths that only run during preview, not during up

**Why:** Preview and up should behave consistently

**Detection:** Conditionals based on `pulumi.runtime.isDryRun()` that change resource creation

```typescript
// ❌ Bad - different behavior in preview vs up
if (pulumi.runtime.isDryRun()) {
  console.log('Would create bucket');
} else {
  new aws.s3.Bucket('bucket', { ... });  // Only created during up!
}

const bucketName = pulumi.runtime.isDryRun() ? 'preview-bucket' : 'real-bucket';

// ✅ Good - isDryRun for logging only
if (pulumi.runtime.isDryRun()) {
  console.log('Preview mode - bucket will be created during up');
}
new aws.s3.Bucket('bucket', { ... });  // Always created

// ✅ Good - conditional based on stack/config, not preview
const bucket = new aws.s3.Bucket('bucket', {
  bucket: stack === 'prod' ? 'prod-bucket' : 'dev-bucket',
});
```

**Error message:** `Resource creation differs between preview and up - this may cause unexpected behavior`

**Tip:** `Create resources unconditionally; use isDryRun() only for logging/debugging`

---

### 13. `pulumi/component-resource-pattern`

**What it catches:** Custom ComponentResource without proper patterns

**Why:** Component resources should follow Pulumi patterns for proper lifecycle

**Detection:** Classes extending `pulumi.ComponentResource` with issues:
- Missing `registerOutputs()`
- Not passing `opts` to child resources
- Not using `this` as parent

```typescript
// ❌ Bad - missing registerOutputs
class MyComponent extends pulumi.ComponentResource {
  public readonly url: pulumi.Output<string>;

  constructor(name: string, args: MyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('pkg:index:MyComponent', name, {}, opts);

    const bucket = new aws.s3.Bucket(`${name}-bucket`, { ... });
    this.url = bucket.websiteEndpoint;
    // Missing registerOutputs!
  }
}

// ❌ Bad - not passing parent
class MyComponent extends pulumi.ComponentResource {
  constructor(name: string, args: MyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('pkg:index:MyComponent', name, {}, opts);

    const bucket = new aws.s3.Bucket(`${name}-bucket`, { ... });  // No parent!
  }
}

// ✅ Good - proper component pattern
class MyComponent extends pulumi.ComponentResource {
  public readonly url: pulumi.Output<string>;

  constructor(name: string, args: MyArgs, opts?: pulumi.ComponentResourceOptions) {
    super('pkg:index:MyComponent', name, {}, opts);

    const bucket = new aws.s3.Bucket(`${name}-bucket`, {
      // ... props
    }, { parent: this });  // Pass parent

    const distribution = new aws.cloudfront.Distribution(`${name}-cdn`, {
      // ...
    }, { parent: this, dependsOn: [bucket] });  // Pass parent and deps

    this.url = distribution.domainName;

    this.registerOutputs({
      url: this.url,
    });
  }
}
```

**Error message (missing register):** `ComponentResource should call this.registerOutputs()`

**Error message (missing parent):** `Child resources in ComponentResource should have { parent: this }`

**Tip:** `Add { parent: this } to child resources and call registerOutputs() at end of constructor`

---

### 14. `pulumi/no-dynamic-provider-abuse`

**What it catches:** DynamicProvider used for things with native providers

**Why:** Native providers are more reliable and have better state management

**Detection:** `pulumi.dynamic.Resource` for common cloud operations that have providers

```typescript
// ❌ Bad - dynamic provider for S3 (has native provider)
class S3Object extends pulumi.dynamic.Resource {
  constructor(name: string, args: S3ObjectArgs) {
    super(new S3ObjectProvider(), name, args);
  }
}

// ❌ Bad - dynamic provider for HTTP calls that could be avoided
class ApiCall extends pulumi.dynamic.Resource {
  constructor(name: string, args: { url: string }) {
    super(new HttpProvider(), name, args);
  }
}

// ✅ Good - use native provider
const object = new aws.s3.BucketObject('object', {
  bucket: bucket.bucket,
  key: 'index.html',
  source: new pulumi.asset.FileAsset('./index.html'),
});

// ✅ Good - dynamic provider for truly custom operations
class SlackNotification extends pulumi.dynamic.Resource {
  // OK - no native Slack provider for this specific use case
}

class GitHubBranchProtection extends pulumi.dynamic.Resource {
  // Consider: there IS a GitHub provider, use that instead
}
```

**Error message:** `DynamicProvider for '${operation}' - consider using native ${provider} provider`

**Tip:** `Check if a native provider exists: ${suggestedProvider}`

---

### 15. `pulumi/config-schema`

**What it catches:** Config access without schema/validation

**Why:** Config should be validated, especially for required values

**Detection:**
- `config.get()` usage without fallback or validation
- `config.require()` without clear documentation
- Missing `Pulumi.yaml` configuration schema

```typescript
// ❌ Bad - no validation, unclear requirements
const config = new pulumi.Config();
const apiKey = config.get('apiKey');  // Might be undefined!
const region = config.get('region');  // Which regions are valid?

if (!apiKey) {
  throw new Error('apiKey required');  // Runtime error
}

// ❌ Bad - require() but no documentation
const accountId = config.require('accountId');
const domain = config.require('domain');
// What format? What are valid values?

// ✅ Good - validated config with schema
import * as v from 'valibot';

const ConfigSchema = v.object({
  accountId: v.pipe(v.string(), v.regex(/^[a-f0-9]{32}$/)),
  domain: v.pipe(v.string(), v.regex(/^[a-z0-9-]+\.[a-z]{2,}$/)),
  region: v.picklist(['us-east-1', 'us-west-2', 'eu-west-1']),
  apiKey: v.optional(v.string()),
});

const config = new pulumi.Config();
const rawConfig = {
  accountId: config.require('accountId'),
  domain: config.require('domain'),
  region: config.require('region'),
  apiKey: config.getSecret('apiKey'),
};

const result = v.safeParse(ConfigSchema, rawConfig);
if (!result.success) {
  throw new Error(`Invalid config: ${JSON.stringify(result.issues)}`);
}

const validConfig = result.output;

// ✅ Good - Pulumi.yaml with configuration schema
// In Pulumi.yaml:
// config:
//   accountId:
//     type: string
//     description: Cloudflare account ID (32 hex characters)
//   domain:
//     type: string
//     description: Primary domain name
```

**Error message:** `Config value '${key}' accessed without validation`

**Tip:** `Define config schema and validate: const result = v.safeParse(ConfigSchema, rawConfig)`

---

## Detection Helpers Needed

For Pulumi files, the linter needs to:

1. **Detect Pulumi imports** - `import * as pulumi from '@pulumi/pulumi'`
2. **Track resource constructors** - `new aws.s3.Bucket(...)`, `new cloudflare.Worker(...)`
3. **Identify resource options** - Second argument `{ protect: true }` or third argument
4. **Track Output types** - `.apply()`, `pulumi.all()`, `pulumi.interpolate`
5. **Find exports** - `export const ...`
6. **Detect config access** - `config.get()`, `config.require()`, `config.requireSecret()`

### Known Resource Types

```typescript
// Stateful resources (need protect: true)
const STATEFUL_RESOURCES = [
  'aws.rds.Instance',
  'aws.rds.Cluster',
  'aws.s3.Bucket',
  'aws.dynamodb.Table',
  'cloudflare.D1Database',
  'cloudflare.R2Bucket',
  'cloudflare.KVNamespace',
  'cloudflare.Queue',
  'gcp.sql.DatabaseInstance',
  'gcp.storage.Bucket',
];

// Taggable resources (AWS)
const TAGGABLE_RESOURCES = [
  'aws.s3.Bucket',
  'aws.lambda.Function',
  'aws.rds.Instance',
  'aws.ec2.Instance',
  'aws.ec2.Vpc',
  'aws.ec2.Subnet',
  'aws.ec2.SecurityGroup',
  // ... most AWS resources
];
```

---

## Summary

| Rule | Severity | Catches |
|------|----------|---------|
| `no-hardcoded-values` | error | Environment-specific strings |
| `resource-naming` | warning | Inconsistent resource names |
| `require-tags` | warning | Missing required tags |
| `no-secret-in-code` | error | Plaintext secrets |
| `no-destroy-without-protect` | warning | Unprotected stateful resources |
| `no-apply-in-apply` | error | Nested applies |
| `prefer-interpolate` | warning | Apply for string building |
| `export-outputs` | warning | Missing stack outputs |
| `depends-on-explicit` | warning | Implicit dependencies |
| `no-get-in-apply` | error | Data sources in apply |
| `stack-reference-type` | warning | Untyped stack references |
| `no-preview-only-code` | error | Different preview/up behavior |
| `component-resource-pattern` | error | Malformed components |
| `no-dynamic-provider-abuse` | warning | Unnecessary dynamic providers |
| `config-schema` | warning | Unvalidated config |

**Total: 15 rules**
