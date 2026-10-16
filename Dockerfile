FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node server.mjs secure-api.mjs ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/private-data && chown node:node /app/private-data
USER node
ENV HOST=0.0.0.0 PORT=8080 TODO_DATABASE=/app/private-data/todo.sqlite
EXPOSE 8080
CMD ["node","server.mjs"]
