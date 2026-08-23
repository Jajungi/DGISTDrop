let push: () => void = () => {};

export function bindServerSyncNotifier(fn: () => void) {
  push = fn;
}

export function notifyServerSync() {
  push();
}
