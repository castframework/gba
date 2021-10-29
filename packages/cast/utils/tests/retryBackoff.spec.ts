import 'mocha';
import { TestScheduler } from 'rxjs/testing';
import { map, mergeMap, multicast, refCount } from 'rxjs/operators';
import { expect } from 'chai';
import { retryBackoff } from '../src';
import { Observable, Observer, of, Subject, throwError, concat } from 'rxjs';

/**
 * This test suite is an adapted version of https://github.com/alex-okrushko/backoff-rxjs
 * See https://github.com/alex-okrushko/backoff-rxjs/blob/bcc31be/spec/retryBackoff-spec.ts
 */
describe('retryBackoff', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).deep.equal(expected);
    });
  });

  it('should handle a basic source that emits next then errors, maxRetries 3', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('--1-2-3-#');
      const subs = [
        '                  ^-------!',
        '                  ---------^-------!',
        '                  -------------------^-------!',
        '                  -------------------------------^-------!',
      ];
      const expected = '   --1-2-3----1-2-3-----1-2-3-------1-2-3-#';

      expectObservable(
        source.pipe(
          retryBackoff({
            initialInterval: 1,
            maxRetries: 3,
            resetOnSuccess: false,
          }),
        ),
      ).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should retry a number of times, without error, then complete', (done) => {
    let errors = 0;
    const retries = 2;
    new Observable((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          if (++errors < retries) {
            throw 'bad';
          }
          errors = 0;
          return x;
        }),
        retryBackoff({
          initialInterval: 1,
          maxRetries: retries,
          resetOnSuccess: false,
        }),
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(42);
        },
        (err: any) => {
          expect.fail('should not error');
        },
        done,
      );
  });

  it('should retry a number of times, then call error handler', (done) => {
    let errors = 0;
    const retries = 2;
    new Observable((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          errors += 1;
          throw 'bad';
        }),
        retryBackoff({
          initialInterval: 1,
          maxRetries: retries - 1,
          resetOnSuccess: false,
        }),
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(42);
        },
        (err: any) => {
          expect(errors).to.equal(2);
          done();
        },
        () => {
          expect('this was called').to.be.true;
        },
      );
  });

  it('should retry until successful completion', (done) => {
    let errors = 0;
    const retries = 10;
    new Observable((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          if (++errors < retries) {
            throw 'bad';
          }
          errors = 0;
          return x;
        }),
        retryBackoff({ initialInterval: 1, resetOnSuccess: false }),
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(42);
        },
        (err: any) => {
          expect('this was called').to.be.true;
        },
        done,
      );
  });

  it('should handle an empty source', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('|');
      const subs =        '      (^!)';
      const expected =    '  |';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: false,
        }),
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a never source', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('-');
      const subs = '       ^';
      const expected = '   -';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: false,
        }),
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should return a never observable given an async just-throw source and no count', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold }) => {
      const source = cold('-#'); // important that it's not a sync error
      const unsub = '      -------------------------------------!';
      const expected = '   --------------------------------------';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: false,
        }),
      );

      expectObservable(result, unsub).toBe(expected);
    });
  });

  it('should handle a basic source that emits next then completes', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, hot, expectSubscriptions }) => {
      const source = hot('--1--2--^--3--4--5---|');
      const subs = '      ^------------!';
      const expected = '  ---3--4--5---|';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: false,
        }),
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a basic source that emits next but does not complete', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, hot, expectSubscriptions }) => {
      const source = hot('--1--2--^--3--4--5---');
      const subs = '              ^------------';
      const expected = '          ---3--4--5---';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: false,
        }),
      );

      expectObservable(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle a basic source that emits next then errors, no maxRetries', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('--1-2-3-#');
      const unsub = '      -------------------------------------!';
      const subs = [
        '                  ^-------!                             ',
        '                  ---------^-------!                    ',
        '                  -------------------^-------!          ',
        '                  -------------------------------^-----!',
      ];
      const expected = '   --1-2-3----1-2-3-----1-2-3-------1-2--';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: false,
        }),
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it(
    'should handle a source which eventually throws, maxRetries=3, and result is ' +
      'unsubscribed early',
    () => {
      // prettier-ignore
      testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
        const source = cold('--1-2-3-#');
        const unsub = '      -------------!';
        const subs = [
          '                  ^-------!                ',
          '                  ---------^---!           ',
        ];
        const expected = '   --1-2-3----1--';

        const result = source.pipe(
          retryBackoff({ initialInterval: 1, maxRetries: 3 }),
        );

        expectObservable(result, unsub).toBe(expected);
        expectSubscriptions(source.subscriptions).toBe(subs);
      });
    },
  );

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('--1-2-3-#');
      const subs = [
        '                  ^-------!                ',
        '                  ---------^---!           ',
      ];
      const expected = '   --1-2-3----1--';
      const unsub = '      -------------!           ';

      const result = source.pipe(
        mergeMap((x: string) => of(x)),
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: false,
        }),
        mergeMap((x: string) => of(x)),
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should retry a synchronous source (multicasted and refCounted) multiple times', (done) => {
    const expected = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];

    concat(of(1, 2, 3), throwError('bad!'))
      .pipe(
        multicast(() => new Subject<number>()),
        refCount(),
        retryBackoff({
          initialInterval: 1,
          maxRetries: 4,
          resetOnSuccess: false,
        }),
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(expected.shift());
        },
        (err: any) => {
          expect(err).to.equal('bad!');
          expect(expected.length).to.equal(0);
          done();
        },
        () => {
          done(new Error('should not be called'));
        },
      );
  });

  it('should increase the intervals exponentially up to maxInterval', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('--1-2-3-#');
      const subs = [
        '                  ^-------!',
        '                  ---------^-------!',
        '                  -------------------^-------!',
        '                  -----------------------------^-------!',
        //                      interval maxed out at 2 ^
      ];
      const unsub = '      -------------------------------------!';
      const expected = '   --1-2-3----1-2-3-----1-2-3-----1-2-3--';

      expectObservable(
        source.pipe(
          retryBackoff({
            initialInterval: 1,
            maxInterval: 2,
            resetOnSuccess: false,
          }),
        ),
        unsub,
      ).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should retry until shouldRetry is true', (done) => {
    let errors = 0;
    const retries = 2;
    const isNotSoBad = (error: any) => error === 'not so bad';
    new Observable((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          errors += 1;
          throw errors < 2 ? 'not so bad' : 'really bad';
        }),
        retryBackoff({ initialInterval: 1, shouldRetry: isNotSoBad }),
      )
      .subscribe(
        () => {
          // noop
        },
        (err: any) => {
          expect(errors).to.equal(2);
          expect(err).to.equal('really bad');
          done();
        },
      );
  });

  it('should increase the intervals calculated by backoffDelay function', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const constantDelay = (iteration: number, initialInterval: number) =>
        initialInterval;
      const source = cold('-1-#');
      const subs = [
        '                  ^--!',
        '                  ----^--!',
        '                  --------^--!',
        '                  ------------^--!',
        '                  ----------------^--!',
      ];
      const unsub = '      -------------------!';
      const expected = '   -1---1---1---1---1--';

      expectObservable(
        source.pipe(
          retryBackoff({
            initialInterval: 1,
            backoffDelay: constantDelay,
          }),
        ),
        unsub,
      ).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should be referentially transparent', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source1 = cold('--#');
      const source2 = cold('--#');
      const unsub = '      ---------!';
      const subs = [
        '                  ^-!       ',
        '                  ---^-!    ',
        '                  -------^-!',
      ];
      const expected = '   ----------';

      const op = retryBackoff({
        initialInterval: 1,
      });

      expectObservable(source1.pipe(op), unsub).toBe(expected);
      expectSubscriptions(source1.subscriptions).toBe(subs);

      expectObservable(source2.pipe(op), unsub).toBe(expected);
      expectSubscriptions(source2.subscriptions).toBe(subs);
    });
  });

  it('should ensure interval state is per-subscription', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('--#');
      const sub1 = '      ^--------!';
      const sub2 = '      ----------^--------!';
      const subs = [
        '                  ^-!       ',
        '                  ---^-!    ',
        '                  -------^-!',
        '                  ----------^-!       ',
        '                  -------------^-!    ',
        '                  -----------------^-!',
      ];
      const expected = '   ----------';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
        }),
      );

      expectObservable(result, sub1).toBe(expected);
      expectObservable(result, sub2).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should reset the delay when resetOnSuccess is true', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('--1-2-3-#');
      const subs = [
        '                  ^-------!',
        '                  ---------^-------!',
        '                  ------------------^-------!',
        '                  ---------------------------^-------!',
        //                 interval always reset to 1 ^
      ];
      const unsub = '      -----------------------------------!';
      const expected = '   --1-2-3----1-2-3----1-2-3----1-2-3--';

      expectObservable(
        source.pipe(
          retryBackoff({
            initialInterval: 1,
            resetOnSuccess: true,
          }),
        ),
        unsub,
      ).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should not reset the delay on consecutive errors when resetOnSuccess is true', () => {
    // prettier-ignore
    testScheduler.run(({ expectObservable, cold, expectSubscriptions }) => {
      const source = cold('--------#');
      const unsub = '      -------------------------------------!';
      const subs = [
        '                  ^-------!                             ',
        '                  ---------^-------!                    ',
        '                  -------------------^-------!          ',
        '                  -------------------------------^-----!',
      ];
      const expected = '   --------------------------------------';

      const result = source.pipe(
        retryBackoff({
          initialInterval: 1,
          resetOnSuccess: true,
        }),
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });
});
