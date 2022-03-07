'use strict';

module.exports = (options = { require: true }) => {
  return async (ctx, next) => {
    // 1. 获取请求头中的 token 数据
    let token = ctx.headers.authorization;
    token = token ? token.split('Bearer ')[1] : null;

    if (token) {
      try {
        // 3. token 有效，根据 userId 获取用户数据挂载到 ctx 对象中给后续中间件使用
        const data = ctx.service.user.verifyToken(token);
        ctx.user = await ctx.model.User.findById(data.userId);
      } catch (err) {
        ctx.throw(401);
      }
    } else if (options.require) {
      // 2. 验证 token，无效 401
      ctx.throw(401);
    }

    // 3. 执行后续中间件
    await next();
  };
};
