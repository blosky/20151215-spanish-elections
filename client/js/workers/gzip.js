"use strict";

import WorkerMessenger from './worker-messenger'

export default class Gzip extends WorkerMessenger {
  constructor() {
    super('workers/gzip-worker.js');
  }

  compress(data) {
    return this._requestResponse({
      data: data
    });
  }
}
