# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json文件
COPY package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制前端package.json并构建前端
COPY client/package*.json ./client/
RUN cd client && npm ci

# 复制前端源代码并构建
COPY client/ ./client/
RUN cd client && npm run build

# 复制后端源代码
COPY src/ ./src/
COPY uploads/ ./uploads/

# 创建日志目录
RUN mkdir -p logs

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# 启动应用
CMD ["node", "src/server.js"]