function createFromChain(result = {}) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn(async () => result),
  };

  return chain;
}

export function createMockSupabase(options = {}) {
  const {
    fromResult = { data: null, error: null },
    invokeResult = { data: null, error: null },
  } = options;

  return {
    from: jest.fn(() => createFromChain(fromResult)),
    functions: {
      invoke: jest.fn(async () => invokeResult),
    },
  };
}
