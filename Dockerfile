FROM node:10.16

MAINTAINER Andre Staltz <contact@staltz.com>

USER root
ADD https://github.com/krallin/tini/releases/download/v0.18.0/tini /tini
RUN chmod +x /tini
RUN mkdir /home/node/.npm-global ; \
    chown -R node:node /home/node/
ENV PATH=/home/node/.npm-global/bin:$PATH
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV DEBUG="*"

USER node
RUN npm install -g ssb-room@1.3.0

EXPOSE 8009
EXPOSE 8008
EXPOSE 8007

HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=10 \
  CMD ssb-room check || exit 1
ENV HEALING_ACTION RESTART

ENTRYPOINT [ "/tini", "--", "ssb-room" ]
CMD [ "start" ]
