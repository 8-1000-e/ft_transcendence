import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

/**
 * Boot smoke-test: compiles the entire DI graph (every module, provider and guard).
 * Catches wiring/runtime errors that `build` cannot — e.g. a guard injecting a service
 * whose module isn't available (UnknownDependenciesException), or a missing boot env var.
 *
 * `.compile()` instantiates providers (running their constructors) but does NOT run
 * onModuleInit — so no real database connection is needed.
 */
describe('Application boot', () => {
  it('resolves the full DI graph (modules, providers, guards)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
