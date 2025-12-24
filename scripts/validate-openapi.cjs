// eslint-disable no-console

// Validates the OpenAPI spec and fails the process if it's invalid.
// Usage:
//   npm run openapi:validate
//   npm run openapi:validate -- docs/openapi/openapi.yaml

const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');

const defaultSpecPath = path.join(__dirname, '..', 'docs', 'openapi', 'openapi.yaml');
const specPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultSpecPath;

SwaggerParser.validate(specPath)
  .then(() => {
    console.log(`✅ OpenAPI spec válido: ${specPath}`);
  })
  .catch((err) => {
    console.error(`❌ OpenAPI spec inválido: ${specPath}`);
    console.error(err?.message ?? err);
    process.exit(1);
  });
