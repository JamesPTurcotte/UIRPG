UIRPG.Events = (() => {
  const handlers = {};

  function on(event, fn) {
    (handlers[event] = handlers[event] || []).push(fn);
    return () => off(event, fn);
  }

  function off(event, fn) {
    const list = handlers[event];
    if (list) handlers[event] = list.filter(f => f !== fn);
  }

  function emit(event, data) {
    const list = handlers[event];
    if (list) list.forEach(fn => fn(data));
  }

  function clear() {
    Object.keys(handlers).forEach(k => delete handlers[k]);
  }

  return { on, off, emit, clear };
})();
