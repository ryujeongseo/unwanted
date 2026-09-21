// Store original image Blobs rather than document-scoped object URLs.
window.PigeonProofStore = (() => {
  let database;
  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('pigeon-mission-proofs', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('missions');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return database;
  }
  async function write(files) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('missions', 'readwrite');
      transaction.objectStore('missions').put(files.slice(0, 3), 'current');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  async function read() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('missions').objectStore('missions').get('current');
      request.onsuccess = () => resolve((request.result || []).filter(file => file instanceof Blob && file.type.startsWith('image/')).slice(0, 3));
      request.onerror = () => reject(request.error);
    });
  }
  return { read, write };
})();
