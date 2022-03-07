'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  // 用户注册
  async create() {
    const { ctx } = this;
    const body = ctx.request.body;
    // 1. 数据校验
    ctx.validate({
      username: { type: 'string' },
      email: { type: 'email' },
      password: { type: 'string' },
    });

    const userService = this.service.user;

    if (await userService.findByUsername(body.username)) {
      ctx.throw(422, '用户已存在');
    }

    if (await userService.findByEmail(body.email)) {
      ctx.throw(422, '邮箱已存在');
    }

    // 2. 保存用户
    const user = await userService.createUser(body);

    // 3. 生成 token
    const token = userService.createToken({
      userId: user._id,
    });
    // 4. 发送响应
    ctx.body = {
      user: {
        email: user.email,
        token,
        username: user.username,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  // 用户登录
  async login() {
    const { ctx } = this;
    const body = ctx.request.body;
    // 1. 基本数据验证
    ctx.validate({
      email: { type: 'email' },
      password: { type: 'string' },
    }, body);

    // 2. 校验邮箱是否存在
    const userService = this.service.user;
    const user = await userService.findByEmail(body.email);
    if (!user) {
      ctx.throw(422, '用户不存在');
    }

    // 3. 校验密码是否正确
    if (ctx.helper.md5(body.password) !== user.password) {
      ctx.throw(422, '密码不正确');
    }

    // 4. 生成 token
    const token = userService.createToken({
      userId: user._id,
    });

    // 5. 发送响应数据
    ctx.body = {
      user: {
        email: user.email,
        token,
        username: user.username,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  // 获取当前登录用户
  async getCurrentUser() {
    const { ctx } = this;
    // 1. 验证 token
    // 2. 获取用户
    // 3. 发送响应
    const user = ctx.user;
    ctx.body = {
      user: {
        email: user.email,
        token: ctx.headers.authorization,
        username: user.username,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  // 更新当前登录用户资料
  async updateCurrentUser() {
    const { ctx } = this;
    const body = ctx.request.body;
    // 1. 基本数据认证
    ctx.validate({
      username: { type: 'string', required: false },
      email: { type: 'email', required: false },
      password: { type: 'string', required: false },
      channelDescription: { type: 'string', required: false },
      avatar: { type: 'string', required: false },
    }, body);

    // 2. 校验用户是否已经存在
    const userService = this.service.user;

    if (body.email) {
      if (body.email !== ctx.user.email && await userService.findByEmail(body.email)) {
        ctx.throw(422, '邮箱已存在');
      }
    }

    if (body.username) {
      if (body.username !== ctx.user.username && await userService.findByUsername(body.username)) {
        ctx.throw(422, '用户已存在');
      }
    }

    if (body.password) {
      body.password = ctx.helper.md5(body.password);
    }

    // 3. 更新用户信息
    const user = await userService.updateUser(body);

    ctx.body = {
      user: {
        username: user.username,
        email: user.email,
        password: user.password,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  // 用户订阅
  async subscribe() {
    const { ctx } = this;

    const userId = ctx.user._id;
    const channelId = ctx.params.userId;
    // 1. 用户不能订阅自己
    if (userId.equals(channelId)) {
      ctx.throw(422, '用户不能订阅自己');
    }

    // 2. 添加订阅
    const user = await this.service.user.subscribe(userId, channelId);

    // 3. 发送响应
    ctx.body = {
      user: {
        ...ctx.helper._.pick(user, [
          'username',
          'email',
          'avatar',
          'cover',
          'subscribersCount',
          'channelDescription',
        ]),
        isSubscribed: true,
      },
    };
  }

  // 用户取消订阅
  async unsubscribe() {
    const { ctx } = this;
    const userId = ctx.user._id;
    const channelId = ctx.params.userId;

    // 1. 用户不能订阅自己
    if (userId.equals(channelId)) {
      ctx.throw(422, '用户不能订阅自己');
    }

    // 2. 取消订阅
    const user = await this.service.user.unsubscribe(userId, channelId);

    // 3. 发送响应
    ctx.body = {
      user: {
        ...ctx.helper._.pick(user, [
          'username',
          'email',
          'avatar',
          'cover',
          'subscribersCount',
          'channelDescription',
        ]),
        isSubscribed: false,
      },
    };
  }

  // 获取用户信息
  async getUser() {
    const { ctx } = this;
    const { Subscription, User } = this.app.model;

    // 1. 获取订阅状态
    let isSubscribed = false;
    if (ctx.user) {
      // 获取订阅记录
      const record = await Subscription.findOne({
        user: ctx.user._id,
        channel: ctx.params.userId,
      });
      if (record) {
        isSubscribed = true;
      }
    }
    // 2. 获取用户信息
    const user = await User.findById(ctx.params.userId);
    // 3. 发送响应
    ctx.body = {
      user: {
        ...ctx.helper._.pick(user, [
          'username',
          'email',
          'avatar',
          'cover',
          'subscribersCount',
          'channelDescription',
        ]),
        isSubscribed,
      },
    };
  }

  // 获取用户订阅列表
  async getSubscriptions() {
    const { ctx } = this;
    const userId = ctx.params.userId;
    const { Subscription } = this.app.model;

    let subscriptions = await Subscription.find({
      user: userId,
    }).populate('channel');
    subscriptions = subscriptions.map(item => {
      return ctx.helper._.pick(item.channel, [
        '_id',
        'avatar',
        'username',
      ]);
    });

    ctx.body = {
      subscriptions,
    };
  }
}

module.exports = UserController;
