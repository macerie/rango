'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const people = require('../models/people');

const peopleItems = module.context.collection('people');
const keySchema = joi.string().required()
.description('The key of the people');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;

router.tag('people');

router.get(function (req, res) {
  res.send(peopleItems.all());
}, 'list')
.response([people], 'A list of peopleItems.')
.summary('List all peopleItems')
.description(dd`
  Retrieves a list of all peopleItems.
`);

router.post(function (req, res) {
  const people = req.body;
  let meta;
  try {
    meta = peopleItems.save(people);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(people, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: people._key})
  ));
  res.send(people);
}, 'create')
.body(people, 'The people to create.')
.response(201, people, 'The created people.')
.error(HTTP_CONFLICT, 'The people already exists.')
.summary('Create a new people')
.description(dd`
  Creates a new people from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let people
  try {
    people = peopleItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(people);
}, 'detail')
.pathParam('key', keySchema)
.response(people, 'The people.')
.summary('Fetch a people')
.description(dd`
  Retrieves a people by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const people = req.body;
  let meta;
  try {
    meta = peopleItems.replace(key, people);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(people, meta);
  res.send(people);
}, 'replace')
.pathParam('key', keySchema)
.body(people, 'The data to replace the people with.')
.response(people, 'The new people.')
.summary('Replace a people')
.description(dd`
  Replaces an existing people with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let people;
  try {
    peopleItems.update(key, patchData);
    people = peopleItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(people);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the people with.'))
.response(people, 'The updated people.')
.summary('Update a people')
.description(dd`
  Patches a people with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    peopleItems.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a people')
.description(dd`
  Deletes a people from the database.
`);