// Stop our dedicated servers before Playwright tears down its process wrappers.
// HTTP shutdown also works when Windows process-tree termination is restricted.
export default async function teardown() {
  await Promise.all(
    [4310, 4311].map(async (port) => {
      try {
        const response = await fetch('http://127.0.0.1:' + port + '/__visual_shutdown__', {
          method: 'POST',
          headers: { 'x-watt-wallet-visual': 'shutdown' },
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw Error('Unexpected shutdown response: ' + response.status);
      } catch (error) {
        // A server may already have stopped after a failed startup/test.
        console.warn('Visual server cleanup on ' + port + ':', error);
      }
    }),
  );
}
