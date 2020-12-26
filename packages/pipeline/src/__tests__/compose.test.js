// based on https://github.com/koajs/compose/blob/master/test/test.js
const { compose } = require('../compose')
const assert = require('assert')

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms || 1))
}

function isPromise(x) {
  return x && typeof x.then === 'function'
}

describe('Koa Compose', () => {
  it('should work', async () => {
    let arr = []
    let stack = []

    stack.push(async (context, next) => {
      arr.push(1)
      await wait(1)
      await next()
      await wait(1)
      arr.push(6)
    })

    stack.push(async (context, next) => {
      arr.push(2)
      await wait(1)
      await next()
      await wait(1)
      arr.push(5)
    })

    stack.push(async (context, next) => {
      arr.push(3)
      await wait(1)
      await next()
      await wait(1)
      arr.push(4)
    })

    await compose(stack)({})
    expect(arr).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]))
  })

  it('should be able to be called twice', () => {
    let stack = []

    stack.push(async (context, next) => {
      context.arr.push(1)
      await wait(1)
      await next()
      await wait(1)
      context.arr.push(6)
    })

    stack.push(async (context, next) => {
      context.arr.push(2)
      await wait(1)
      await next()
      await wait(1)
      context.arr.push(5)
    })

    stack.push(async (context, next) => {
      context.arr.push(3)
      await wait(1)
      await next()
      await wait(1)
      context.arr.push(4)
    })

    let fn = compose(stack)
    let ctx1 = { arr: [] }
    let ctx2 = { arr: [] }
    let out = [1, 2, 3, 4, 5, 6]

    return fn(ctx1)
      .then(() => {
        assert.deepEqual(out, ctx1.arr)
        return fn(ctx2)
      })
      .then(() => {
        assert.deepEqual(out, ctx2.arr)
      })
  })

  it('should only accept an array', () => {
    let err
    try {
      expect(compose()).toThrow()
    } catch (e) {
      err = e
    }
    return expect(err).toBeInstanceOf(TypeError)
  })

  it('should create next functions that return a Promise', () => {
    let stack = []
    let arr = []
    for (let i = 0; i < 5; i++) {
      stack.push((context, next) => {
        arr.push(next())
      })
    }

    compose(stack)({})

    for (let next of arr) {
      assert(isPromise(next), 'one of the functions next is not a Promise')
    }
  })

  it('should work with 0 middleware', () => {
    return compose([])({})
  })

  it('should only accept middleware as functions', () => {
    let err
    try {
      expect(compose([{}])).toThrow()
    } catch (e) {
      err = e
    }
    return expect(err).toBeInstanceOf(TypeError)
  })

  it('should work when yielding at the end of the stack', async () => {
    let stack = []
    let called = false

    stack.push(async (ctx, next) => {
      await next()
      called = true
    })

    await compose(stack)({})
    assert(called)
  })

  it('should reject on errors in middleware', () => {
    let stack = []

    stack.push(() => {
      throw new Error()
    })

    return compose(stack)({})
      .then(() => {
        throw new Error('promise was not rejected')
      })
      .catch((e) => {
        expect(e).toBeInstanceOf(Error)
      })
  })

  it('should work when yielding at the end of the stack with yield*', () => {
    let stack = []

    stack.push(async (ctx, next) => {
      await next
    })

    return compose(stack)({})
  })

  it('should keep the context', () => {
    let ctx = {}

    let stack = []

    stack.push(async (ctx2, next) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    stack.push(async (ctx2, next) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    stack.push(async (ctx2, next) => {
      await next()
      expect(ctx2).toEqual(ctx)
    })

    return compose(stack)(ctx)
  })

  it('should catch downstream errors', async () => {
    let arr = []
    let stack = []

    stack.push(async (ctx, next) => {
      arr.push(1)
      try {
        arr.push(6)
        await next()
        arr.push(7)
      } catch (err) {
        arr.push(2)
      }
      arr.push(3)
    })

    stack.push(() => {
      arr.push(4)
      throw new Error()
    })

    await compose(stack)({})
    expect(arr).toEqual([1, 6, 4, 2, 3])
  })

  it('should compose w/ next', () => {
    let called = false

    return compose([])({}, () => {
      called = true
    }).then(() => {
      assert(called)
    })
  })

  it('should handle errors in wrapped non-async functions', () => {
    let stack = []

    stack.push(() => {
      throw new Error()
    })

    return compose(stack)({})
      .then(() => {
        throw new Error('promise was not rejected')
      })
      .catch((e) => {
        expect(e).toBeInstanceOf(Error)
      })
  })

  // https://github.com/koajs/compose/pull/27#issuecomment-143109739
  it('should compose w/ other compositions', () => {
    let called = []

    return compose([
      compose([
        (ctx, next) => {
          called.push(1)
          return next()
        },
        (ctx, next) => {
          called.push(2)
          return next()
        },
      ]),
      (ctx, next) => {
        called.push(3)
        return next()
      },
    ])({}).then(() => assert.deepEqual(called, [1, 2, 3]))
  })

  it('should throw if next() is called multiple times', () => {
    return compose([
      async (ctx, next) => {
        await next()
        await next()
      },
    ])({}).then(
      () => {
        throw new Error('boom')
      },
      (err) => {
        assert(/multiple times/.test(err.message))
      },
    )
  })

  it('should return a valid middleware', () => {
    let val = 0
    return compose([
      compose([
        (ctx, next) => {
          val++
          return next()
        },
        (ctx, next) => {
          val++
          return next()
        },
      ]),
      (ctx, next) => {
        val++
        return next()
      },
    ])({}).then(() => {
      expect(val).toEqual(3)
    })
  })

  it('should return last return value', () => {
    let stack = []

    stack.push(async (context, next) => {
      let val = await next()
      expect(val).toEqual(2)
      return 1
    })

    stack.push(async (context, next) => {
      let val = await next()
      expect(val).toEqual(0)
      return 2
    })

    let next = () => 0
    return compose(stack)({}, next).then((val) => {
      expect(val).toEqual(1)
    })
  })

  it('should not affect the original middleware array', () => {
    let middleware = []
    let fn1 = (ctx, next) => {
      return next()
    }
    middleware.push(fn1)

    for (let fn of middleware) {
      assert.equal(fn, fn1)
    }

    compose(middleware)

    for (let fn of middleware) {
      assert.equal(fn, fn1)
    }
  })

  it('should not get stuck on the passed in next', () => {
    let middleware = [
      (ctx, next) => {
        ctx.middleware++
        return next()
      },
    ]
    let ctx = {
      middleware: 0,
      next: 0,
    }

    return compose(middleware)(ctx, (ctx, next) => {
      ctx.next++
      return next()
    }).then(() => {
      expect(ctx).toEqual({ middleware: 1, next: 1 })
    })
  })
})
