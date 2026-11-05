# Update these digests deliberately when refreshing the base images.
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY next.config.ts next-env.d.ts tsconfig.json postcss.config.mjs ./
COPY src ./src
COPY shared ./shared
COPY public ./public
COPY scripts ./scripts
COPY api/security.mjs ./api/security.mjs
COPY tests ./tests
RUN npm test && npm run build

FROM nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949 AS runtime
COPY deploy/container/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/out /usr/share/nginx/html
COPY --from=build /app/.generated/security-headers.conf /etc/nginx/security-headers.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
STOPSIGNAL SIGQUIT
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
