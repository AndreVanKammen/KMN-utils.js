const defaultObjectStoreName = 'default-object-store';
export class IDB {
  constructor (name) {
    this.name = name;
    this._storeNames = [defaultObjectStoreName];
    this._upgradeResolve = null;
    this._upgradeWaitResolves = [];
    this._openStores = [];
    this._handleErrorBound = this._handleError.bind(this);
    this._openDB();
  }

  _openDB(versionNr) {
    this._openRequest = window.indexedDB.open(this.name, versionNr);
    this._openRequest.addEventListener('upgradeneeded', this._handleUpgrade.bind(this), { once: true } );
    this._bindRequest(this._openRequest, this._handleOpened.bind(this));
    this.isOpened = false;
  }

  _bindRequest(request, callback) {
    request.addEventListener('success', callback, { once: true } );
    request.addEventListener('error', this._handleErrorBound, { once: true } );
  }

  async _awaitResult(request) {
    return new Promise((resolved) => {
      this._bindRequest(request, (evt) => resolved(evt.target.result));
    });
  }

  _handleUpgrade() {
    this.database = this._openRequest.result;
    for (let storeName of this._storeNames) {
      if (!this.database.objectStoreNames.contains(storeName)) {
        this.database.createObjectStore(storeName);
      }
    }
  }

  _handleOpened() {
    this.database = this._openRequest.result;
    this.isOpened = true;
  }

  _handleError(e) {
    console.error('Error in indexed db: ',e);
    this._clearStoreTransaction(e.target.source); // What's in a name eh javascript api's
  }

  async _doUpgrade() {
    let lastVersionNr = this.database.version;
    this.database.close();
    this.database = undefined;
    return new Promise((resolve) => {
      setTimeout(async () => {
        this._openDB(lastVersionNr + 1);
        await this._waitOnOpen();
        resolve();
      }, 0);
    })
  }

  async waitForUpgrade() {
    return new Promise((resolve) => {
      this._upgradeWaitResolves.push(resolve);
    })
  }

  async startTransaction(storeName) {
    if (this.isUpgrading) await this.waitForUpgrade();
    if (!this.isOpened) await this._waitOnOpen();
    // Auto upgrade if store is missing
    if (!this.database.objectStoreNames.contains(storeName)) {
      if (this._storeNames.indexOf(storeName) === -1) {
        this._storeNames.push(storeName);
      }
      this.isUpgrading = true;
      this.isOpened = false;
      // Check if transactions open
      if (this._openStores.length === 0) {
        await this._doUpgrade();
        this.isUpgrading = false;
      } else {
        // TODO: Check if this can give deadlocks
        // Wait until all transactions are finished
        await new Promise((resolve) => {
          this._upgradeResolve = () => this._doUpgrade().then(resolve);
        }).finally(
          () => {
            // Signal waiting requests
            this.isUpgrading = false;
            this._upgradeWaitResolves.forEach(resolve => resolve());
            this._upgradeWaitResolves = [];
        });
      }
    }
    let store = this.database.transaction(storeName, 'readwrite').objectStore(storeName);
    this._openStores.push(store);
    return store;
  }

  async _waitOnOpen() {
    if (this.isOpened) return true;
    return new Promise( (resolved) => {
      this._openRequest.addEventListener('success', () => resolved(), { once: true } );
    });
  }

  /**
   * Clear a request from the open request list
   * @param {IDBObjectStore | IDBIndex | IDBCursor} store 
   */
  _clearStoreTransaction(store) {
    let ix = this._openStores.indexOf(store);
    if (ix!==-1) {
      this._openStores.splice(ix,1);
    }
    if (this._openStores.length === 0) {
      if (this._upgradeResolve) {
        this._upgradeResolve();
        this._upgradeResolve = null;
      }
    }
  }

  /**
   * Execute a command on a store and wait for the result
   * @param {(t: IDBObjectStore) => IDBRequest<any | undefined>} cmd 
   */
  async doCmd(storeName, cmd) {
    let request = cmd(await this.startTransaction(storeName));
    return new Promise((resolved) => {
      this._bindRequest(request, 
        (evt) => {
          resolved(evt.target.result)
          this._clearStoreTransaction(request.source)
        });
    });
  }

  /**
   * Get a record from a spcific store
   * @param {string} storeName 
   * @param {string} name 
   * @returns {Promise<any>}
   */
  async getStoreValue (storeName, name) {
    return await this.doCmd(storeName, s => s.get(name));
  }

  /**
   * Get all records from a specific 
   * @param {*} storeName 
   * @returns {Promise<any[]>}
   */
  async getAll (storeName) {
    return await this.doCmd(storeName, s => s.getAll());
  }

  /**
   * Put a record in a specific store, if record exists it wil be overwritten
   * @param {string} storeName 
   * @param {string} name 
   * @param {any} value 
   * @returns {Promise<IDBValidKey>}
   */
  async setStoreValue (storeName, name, value) {
    return await this.doCmd(storeName, s => s.put(value, name));
  }

  /**
   * Get a record from the default store
   * @param {string} name 
   * @returns {Promise<any>}
   */
   async getValue (name) {
    return await this.getStoreValue(defaultObjectStoreName, name);
  }

  /**
   * Put a record in a specific store, if record exists it wil be overwritten
   * @param {string} name 
   * @param {any} value 
   * @returns {Promise<IDBValidKey>}
   */
   async setValue (name, value) {
    return await this.setStoreValue(defaultObjectStoreName, name, value);
  }
}

/** @type {IDB} */
export let idb = null;

/**
 * Creates the default database
 * @param {string} name 
 */
export function createDefaultDB(name) {
  if (idb) {
    console.error('Default database already created!');
  }
  return idb = new IDB(name);
};