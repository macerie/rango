'use strict';
const db = require('@arangodb').db;
const cols = ["people","tools","places"];

for (const c of cols) {
  if (!db._collection(c)) db._createDocumentCollection(c);
}