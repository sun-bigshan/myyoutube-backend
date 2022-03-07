'use strict';

const Controller = require('egg').Controller;

class VodController extends Controller {
  async createUploadVideo() {
    const { ctx } = this;
    const query = ctx.query;
    ctx.validate(
      {
        Title: { type: 'string' },
        FileName: { type: 'string' },
      },
      query
    );
    ctx.body = await this.app.vodClient.request('CreateUploadVideo', query, {});
  }

  async refreshUploadVideo() {
    const { ctx } = this;
    const query = ctx.query;
    ctx.validate(
      {
        VideoId: { type: 'string' },
      },
      query
    );

    ctx.body = await this.app.vodClient.request(
      'RefreshUploadVideo',
      query,
      {}
    );
  }
}

module.exports = VodController;
