'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Todo = require('../models/todo');

const todoItems = module.context.collection('todo');
const keySchema = joi.string().required()
.description('The key of the todo');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;

router.tag('todo');

router.get(function (req, res) {
  res.send(todoItems.all());
}, 'list')
.response([Todo], 'A list of todoItems.')
.summary('List all todoItems')
.description(dd`
  Retrieves a list of all todoItems.
`);

router.post(function (req, res) {
  const todo = req.body;
  let meta;
  try {
    meta = todoItems.save(todo);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(todo, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: todo._key})
  ));
  res.send(todo);
}, 'create')
.body(Todo, 'The todo to create.')
.response(201, Todo, 'The created todo.')
.error(HTTP_CONFLICT, 'The todo already exists.')
.summary('Create a new todo')
.description(dd`
  Creates a new todo from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let todo
  try {
    todo = todoItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(todo);
}, 'detail')
.pathParam('key', keySchema)
.response(Todo, 'The todo.')
.summary('Fetch a todo')
.description(dd`
  Retrieves a todo by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const todo = req.body;
  let meta;
  try {
    meta = todoItems.replace(key, todo);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(todo, meta);
  res.send(todo);
}, 'replace')
.pathParam('key', keySchema)
.body(Todo, 'The data to replace the todo with.')
.response(Todo, 'The new todo.')
.summary('Replace a todo')
.description(dd`
  Replaces an existing todo with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let todo;
  try {
    todoItems.update(key, patchData);
    todo = todoItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(todo);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the todo with.'))
.response(Todo, 'The updated todo.')
.summary('Update a todo')
.description(dd`
  Patches a todo with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    todoItems.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a todo')
.description(dd`
  Deletes a todo from the database.
`);