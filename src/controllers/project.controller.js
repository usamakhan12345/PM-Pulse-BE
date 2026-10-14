const projectService = require('../services/project.service');
const ApiResponse = require('../utils/apiResponse');

class ProjectController {
  async createProject(req, res, next) {
    try {
      const project = await projectService.createProject(req.user._id, req.body);
      return ApiResponse.created(res, { project }, 'Project created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProjects(req, res, next) {
    try {
      const { workspaceId, search, status, page, limit } = req.query;
      const { projects, pagination } = await projectService.getProjects({
        workspaceId,
        userId: req.user._id,
        search,
        status,
        page,
        limit
      });
      return ApiResponse.success(res, { projects }, 'Projects retrieved', 200, pagination);
    } catch (error) {
      next(error);
    }
  }

  async getProjectById(req, res, next) {
    try {
      const project = await projectService.getProjectById(req.params.id);
      return ApiResponse.success(res, { project }, 'Project retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req, res, next) {
    try {
      const project = await projectService.updateProject(req.params.id, req.user._id, req.body);
      return ApiResponse.success(res, { project }, 'Project updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req, res, next) {
    try {
      const result = await projectService.deleteProject(req.params.id, req.user._id);
      return ApiResponse.success(res, result, 'Project deleted');
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const project = await projectService.addProjectMember(req.params.id, req.body.userId, req.user._id);
      return ApiResponse.success(res, { project }, 'Member added to project');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const project = await projectService.removeProjectMember(req.params.id, req.params.userId, req.user._id);
      return ApiResponse.success(res, { project }, 'Member removed from project');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProjectController();
