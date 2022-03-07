'use strict';

const Controller = require('egg').Controller;

class VideoController extends Controller {
  async createVideo() {
    const { ctx } = this;
    const { Video } = this.app.model;
    const body = ctx.request.body;
    ctx.validate({
      title: { type: 'string' },
      description: { type: 'string' },
      vodVideoId: { type: 'string' },
      cover: { type: 'string' },
    });
    body.user = ctx.user._id;
    const video = await new Video(body).save();
    ctx.status = 201;
    ctx.body = {
      video,
    };
  }

  async getVideo() {
    const { ctx } = this;
    const { Video, VideoLike, Subscription } = this.app.model;
    const { videoId } = ctx.params;
    let video = await Video.findById(videoId).populate(
      'user',
      '_id username avatar subscribersCount'
    );
    if (!video) {
      ctx.throw(404, 'Video Not Found!');
    }
    video = video.toJSON();
    video.isLiked = false;
    video.isDisliked = false;
    video.user.isSubscribed = false;
    if (ctx.user) {
      const userId = ctx.user._id;
      if (await VideoLike.findOne({ user: userId, video: videoId, like: 1 })) {
        video.isLiked = true;
      }
      if (await VideoLike.findOne({ user: userId, video: videoId, like: -1 })) {
        video.isDisliked = true;
      }
      if (
        await Subscription.findOne({ user: userId, channel: video.user._id })
      ) {
        video.user.isSubscribed = true;
      }
    }
    ctx.body = {
      video,
    };
  }

  async getVideos() {
    const { ctx } = this;
    const { Video } = this.app.model;
    let { pageNum = 1, pageSize = 10 } = ctx.query;
    pageNum = Number.parseInt(pageNum);
    pageSize = Number.parseInt(pageSize);
    const getVideos = Video.find()
      .populate('user')
      .sort({
        createdAt: -1,
      })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);
    const getVideosCount = Video.countDocuments();
    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount,
    ]);
    ctx.body = {
      videos,
      videosCount,
    };
  }

  async getUserVideos() {
    const { ctx } = this;
    const { Video } = this.app.model;
    const { userId } = ctx.params;
    let { pageNum = 1, pageSize = 10 } = ctx.query;
    pageNum = Number.parseInt(pageNum);
    pageSize = Number.parseInt(pageSize);
    const getVideos = Video.find({
      user: userId,
    })
      .populate('user')
      .sort({
        createdAt: -1,
      })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);
    const getVideosCount = Video.countDocuments({
      user: userId,
    });
    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount,
    ]);
    ctx.body = {
      videos,
      videosCount,
    };
  }

  async getUserFeedVideos() {
    const { ctx } = this;
    const { Video, Subscription } = this.app.model;
    const { userId } = ctx.user._id;
    let { pageNum = 1, pageSize = 10 } = ctx.query;
    pageNum = Number.parseInt(pageNum);
    pageSize = Number.parseInt(pageSize);
    const channels = await Subscription.find({ user: userId }).populate(
      'channel'
    );
    const getVideos = Video.find({
      user: {
        $in: channels.map(item => item.channel._id),
      },
    })
      .populate('user')
      .sort({
        createdAt: -1,
      })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);
    const getVideosCount = Video.countDocuments({
      user: {
        $in: channels.map(item => item.channel._id),
      },
    });
    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount,
    ]);
    ctx.body = {
      videos,
      videosCount,
    };
  }

  async updateVideo() {
    const { ctx } = this;
    const { Video } = this.app.model;
    const { videoId } = ctx.params;
    const userId = ctx.user._id;

    ctx.validate({
      title: { type: 'string', require: false },
      description: { type: 'string', require: false },
      vodVideoId: { type: 'string', require: false },
      cover: { type: 'string', require: false },
    });

    // 查询视频
    const video = await Video.findById(videoId);
    if (!video) {
      ctx.throw(404, 'Video Not Found!');
    }

    // 视频作者必须是当前登录用户
    if (!video.user.equals(userId)) {
      ctx.throw(403);
    }

    Object.assign(
      video,
      ctx.helper._.pick(ctx.request.body, [
        'title',
        'description',
        'vodVideoId',
        'cover',
      ])
    );

    await video.save();

    ctx.body = {
      video,
    };
  }

  async deleteVideo() {
    const { ctx } = this;
    const { Video } = this.app.model;
    const { videoId } = ctx.params;

    const video = await Video.findById(videoId);

    if (!video) {
      ctx.throw(404);
    }

    // 视频作者必须是当前登录用户
    if (!video.user.equals(ctx.user._id)) {
      ctx.throw(403);
    }

    await video.remove();

    ctx.status = 204;
  }

  async createComment() {
    const { ctx } = this;
    const body = ctx.request.body;
    const { videoId } = ctx.params;
    const { Video, VideoComment } = this.app.model;

    ctx.validate(
      {
        content: 'string',
      },
      body
    );

    const video = await Video.findById(videoId);

    if (!video) {
      ctx.throw(404);
    }

    const comment = await new VideoComment({
      content: body.content,
      user: ctx.user._id,
      video: videoId,
    }).save();

    video.commentsCount = await VideoComment.countDocuments({
      video: videoId,
    });

    await video.save();

    // 映射评论所属用户和视频字段数据
    await comment.populate('user').populate('video').execPopulate();

    ctx.body = {
      comment,
    };
  }

  async getVideoComments() {
    const { ctx } = this;
    const { videoId } = ctx.params;
    const { VideoComment } = this.app.model;
    let { pageNum = 1, pageSize = 10 } = ctx.query;
    pageNum = Number.parseInt(pageNum);
    pageSize = Number.parseInt(pageSize);

    const getComments = VideoComment.find({
      video: videoId,
    })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .populate('user')
      .populate('video');

    const getCommentsCount = VideoComment.countDocuments({
      video: videoId,
    });

    const [ comments, commentsCount ] = await Promise.all([
      getComments,
      getCommentsCount,
    ]);

    ctx.body = {
      comments,
      commentsCount,
    };
  }

  async deleteVideoComment() {
    const { ctx } = this;
    const { Video, VideoComment } = this.app.model;
    const { videoId, commentId } = ctx.params;

    const video = await Video.findById(videoId);
    if (!video) {
      ctx.throw(404, 'Video Not Found');
    }

    const comment = await VideoComment.findById(commentId);

    // 校验评论是否存在
    if (!comment) {
      ctx.throw(404, 'Comment Not Found');
    }

    // 校验评论作者是否当前用户
    if (!comment.user.equals(ctx.user._id)) {
      ctx.throw(403);
    }

    await comment.remove();

    // 更新视频评论数量
    video.commentsCount = await VideoComment.countDocuments({
      video: videoId,
    });

    await video.save();

    ctx.status = 204;
  }

  async likeVideo() {
    const { Video, VideoLike } = this.app.model;
    const { videoId } = this.ctx.params;
    const userId = this.ctx.user._id;
    const video = await Video.findById(videoId);

    if (!video) {
      this.ctx.throw(404, 'Video Not Found');
    }

    const doc = await VideoLike.findOne({
      user: userId,
      video: videoId,
    });

    let isLiked = true;

    if (doc && doc.like === 1) {
      await doc.remove(); // 取消点赞
      isLiked = false;
    } else if (doc && doc.like === -1) {
      doc.like = 1;
      await doc.save();
    } else {
      await new VideoLike({
        user: userId,
        video: videoId,
        like: 1,
      }).save();
    }

    // 更新喜欢视频的数量
    video.likesCount = await VideoLike.countDocuments({
      video: videoId,
      like: 1,
    });

    // 更新不喜欢视频的数量
    video.dislikesCount = await VideoLike.countDocuments({
      video: videoId,
      like: -1,
    });

    // 将修改保存到数据库中
    await video.save();

    this.ctx.body = {
      video: {
        ...video.toJSON(),
        isLiked,
      },
    };
  }

  async dislikeVideo() {
    const { Video, VideoLike } = this.app.model;
    const { videoId } = this.ctx.params;
    const userId = this.ctx.user._id;
    const video = await Video.findById(videoId);

    if (!video) {
      this.ctx.throw(404, `No video found for ID - ${videoId}`);
    }

    const doc = await VideoLike.findOne({
      user: userId,
      video: videoId,
    });

    let isDisliked = true;

    if (doc && doc.like === -1) {
      await doc.remove();
      isDisliked = false;
    } else if (doc && doc.like === 1) {
      doc.like = -1;
      await doc.save();
    } else {
      await new VideoLike({
        user: userId,
        video: videoId,
        like: -1,
      }).save();
    }

    // 更新视频喜欢和不喜欢的数量
    video.likesCount = await VideoLike.countDocuments({
      video: videoId,
      like: 1,
    });
    video.dislikesCount = await VideoLike.countDocuments({
      video: videoId,
      like: -1,
    });

    this.ctx.body = {
      video: {
        ...video.toJSON(),
        isDisliked,
      },
    };
  }

  async getUserLikedVideos() {
    const { VideoLike, Video } = this.app.model;
    let { pageNum = 1, pageSize = 10 } = this.ctx.query;
    pageNum = Number.parseInt(pageNum);
    pageSize = Number.parseInt(pageSize);
    const filterDoc = {
      user: this.ctx.user._id,
      like: 1,
    };
    const likes = await VideoLike
      .find(filterDoc)
      .sort({
        createdAt: -1,
      })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    const getVideos = Video.find({
      _id: {
        $in: likes.map(item => item.video),
      },
    }).populate('user');

    const getVideosCount = VideoLike.countDocuments(filterDoc);
    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount,
    ]);
    this.ctx.body = {
      videos,
      videosCount,
    };
  }
}

module.exports = VideoController;
