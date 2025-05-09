import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

export const setupSwagger = (app) => {
  const swaggerDocument = YAML.load('./src/swagger/swagger.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};