import 'mocha';
import { of, throwError } from 'rxjs';
import { withRetry } from '../dist';
import { expect } from 'chai';
import * as chai from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

describe('withRetry', () => {
  it('should work with observables', async () => {
    const value = 42;
    const promise = withRetry(() => of(value), {
      initialInterval: 1,
      resetOnSuccess: false,
    });

    expect(promise).to.become(value);
  });

  it('should work with throwing observables', async () => {
    const error = 'Error';
    const promise = withRetry(() => throwError(error), {
      initialInterval: 1,
      resetOnSuccess: false,
    });

    expect(promise).to.be.rejectedWith(error);
  });

  it('should work with promises', async () => {
    const value = 42;
    const promise = withRetry(() => new Promise((resolve) => resolve(value)), {
      initialInterval: 1,
      resetOnSuccess: false,
    });

    expect(promise).to.become(value);
  });

  it('should work with throwing observables', async () => {
    const error = 'Error';
    const promise = withRetry(
      () => new Promise((resolve, reject) => reject(error)),
      {
        initialInterval: 1,
        resetOnSuccess: false,
      },
    );

    expect(promise).to.be.rejectedWith(error);
  });
});
