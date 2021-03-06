/**
 * @overview  Handler project.
 * @author    Chao Wang (hit9)
 * @copyright 2015 Eleme, Inc. All rights reserved.
 */

'use strict';

const route = require('koa-route');
const Sequelize = require('sequelize');
const errors = require('./errors');
const models = require('../models');
const url = require('../url');
const validators = require('./validators');
const util = require('../util');

//------------------------------------------
// Register project handler to service.
//------------------------------------------
exports.register = function(service) {
  service.app.use(route.get(url('/api/projects'), getAll));
  service.app.use(route.get(url('/api/project/:id'), get));
  service.app.use(route.post(url('/api/admin/project'), create));
  service.app.use(route.del(url('/api/admin/project/:id'), del));
  service.app.use(route.patch(url('/api/admin/project/:id'), patch));
  service.app.use(route.get(url('/api/admin/project/:id/receivers'), getReceivers));
  service.app.use(route.get(url('/api/admin/project/:id/rules'), getRules));
};

//------------------------------------------
// Project handlers
//------------------------------------------
/**
 * Get all projects.
 * @api /api/projects
 * @method GET
 * @return {Array}
 */
function *getAll() {
  this.body = yield models.Project.findAll();
}

/**
 * Create project.
 * @api /api/admin/project
 * @method POST
 * @param {String} name
 * @return {Project}
 * @throws ErrProjectDuplicateName/ErrProjectName
 */
function *create() {
  var name = this.request.body.name;
  name = validators.validateProjectName(name);
  try {
    this.body = yield models.Project.create({name: name});
  } catch(err) {
    if (err instanceof Sequelize.UniqueConstraintError)
      throw errors.ErrProjectDuplicateName;
    throw err;
  }
}

/**
 * Get project by id.
 * @api /api/project/:id
 * @method GET
 * @return {Project}
 * @throws ErrProjectNotFound/ErrProjectId
 */
function *get(id) {
  id = validators.validateProjectId(id);
  var project = yield models.Project.findById(id);
  if (!project)
    throw errors.ErrProjectNotFound;
  this.body = project;
}

/**
 * Delete project by id.
 * @api /api/admin/project/:id
 * @method DELETE
 * @return NoContent
 * @throws ErrProjectNotFound/ErrProjectId
 */
function *del(id) {
  id = validators.validateProjectId(id);
  var project = yield models.Project.findById(id);
  if (!project)
    throw errors.ErrProjectNotFound;
  yield models.Rule.destroy({where: {ProjectId: project.id}});
  yield project.removeReceivers();
  yield project.destroy();
  this.status = 204;
}

/**
 * Patch project by id.
 * @api /api/admin/project/:id
 * @method PATCH
 * @param {String} name
 * @return NoContent
 * @throws ErrProjectNotFound/ErrProjectId/ErrProjectName
 */
function *patch(id) {
  id = validators.validateProjectId(id);
  var project = yield models.Project.findById(id);
  if (!project)
    throw errors.ErrProjectNotFound;
  var name = this.request.body.name;
  project.name = validators.validateProjectName(name);
  try {
    yield project.save();
  } catch(err) {
    if (err instanceof Sequelize.UniqueConstraintError)
      throw errors.ErrProjectDuplicateName;
    throw err;
  }
  this.status = 204;
}

/**
 * Get receivers by project id. (with universal receivers)
 * @api /api/admin/project/:id/receivers
 * @method GET
 * @return {Array}
 * @throws ErrProjectNotFound/ErrProjectId..
 */
function *getReceivers(id) {
  id = validators.validateProjectId(id);
  var project = yield models.Project.findById(id);
  if (!project)
    throw errors.ErrProjectNotFound;
  var receivers = yield project.getReceivers();
  var universals = yield models.Receiver.findAll({where: {universal: true}});
  [].unshift.apply(receivers, universals);
  this.body = util.uniqueArray(receivers, function(a, b) {
    return a.id === b.id;
  });
}

/**
 * Get rules by project id.
 * @api /api/admin/project/:id/rules
 * @method GET
 * @return {Array}
 * @throws ErrProjectNotFound/ErrProjectId
 */
function *getRules(id) {
  id = validators.validateProjectId(id);
  var project = yield models.Project.findById(id);
  if (!project)
    throw errors.ErrProjectNotFound;
  this.body = yield project.getRules();
}
