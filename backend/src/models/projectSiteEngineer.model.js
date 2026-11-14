'use strict';

/**
 * Data access layer for `project_site_engineers`.
 * Manages assignments of site engineers to projects.
 */
const { db } = require('../config/database');

const TABLE = 'project_site_engineers';

/**
 * Assigns a site engineer to a project.
 * Returns the created or existing assignment record.
 *
 * @param {number} projectId
 * @param {number} siteEngineerId
 * @returns {Promise<object>}
 */
async function assignEngineer(projectId, siteEngineerId) {
  const [record] = await db(TABLE)
    .insert({
      project_id: projectId,
      site_engineer_id: siteEngineerId,
    })
    .onConflict(['project_id', 'site_engineer_id'])
    .ignore()
    .returning('*');

  if (!record) {
    return db(TABLE)
      .where({
        project_id: projectId,
        site_engineer_id: siteEngineerId,
      })
      .first();
  }

  return record;
}

/**
 * Removes a site engineer assignment from a project.
 *
 * @param {number} projectId
 * @param {number} siteEngineerId
 * @returns {Promise<boolean>} True if an assignment was removed, false otherwise
 */
async function removeEngineer(projectId, siteEngineerId) {
  const deletedCount = await db(TABLE)
    .where({
      project_id: projectId,
      site_engineer_id: siteEngineerId,
    })
    .del();

  return deletedCount > 0;
}

/**
 * Retrieves all site engineers assigned to a specific project with user details.
 *
 * @param {number} projectId
 * @returns {Promise<Array<object>>}
 */
async function getEngineersByProject(projectId) {
  return db(TABLE)
    .select(
      'project_site_engineers.id as assignment_id',
      'project_site_engineers.project_id',
      'project_site_engineers.site_engineer_id',
      'project_site_engineers.created_at as assigned_at',
      'users.id as user_id',
      'users.name',
      'users.email',
      'users.role',
      'users.is_active'
    )
    .join('users', 'project_site_engineers.site_engineer_id', 'users.id')
    .where('project_site_engineers.project_id', projectId)
    .orderBy('project_site_engineers.created_at', 'asc');
}

/**
 * Checks if a specific site engineer is assigned to a project.
 *
 * @param {number} projectId
 * @param {number} siteEngineerId
 * @returns {Promise<boolean>}
 */
async function isEngineerAssigned(projectId, siteEngineerId) {
  const row = await db(TABLE)
    .select('id')
    .where({
      project_id: projectId,
      site_engineer_id: siteEngineerId,
    })
    .first();

  return Boolean(row);
}

module.exports = {
  assignEngineer,
  removeEngineer,
  getEngineersByProject,
  isEngineerAssigned,
};

