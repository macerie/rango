'use strict';
const db = require('@arangodb').db;
const collectionName = 'people';

if (!db._collection(collectionName)) {
  db._createDocumentCollection(collectionName);
}